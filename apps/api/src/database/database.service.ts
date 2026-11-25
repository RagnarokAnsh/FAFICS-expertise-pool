import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { Pool, PoolClient, QueryResult, QueryResultRow, types, defaults } from 'pg';
import { MODELS, ModelDef, ModelName, Relation } from './schema';

// ─── pg type handling ─────────────────────────────────────────────────────────
// DATE columns (date_of_birth, separation_date, expires_at) are calendar days.
// pg's default parses them as LOCAL midnight, so on a server east of UTC
// `.toISOString().split('T')[0]` shifts every date back a day. Parse them as UTC
// midnight instead — the same value Prisma returned.
types.setTypeParser(1082, (value: string) => new Date(`${value}T00:00:00.000Z`));
// Serialise JS Dates in UTC so a Date written to a DATE column keeps its UTC
// calendar day regardless of the server's timezone.
defaults.parseInputDatesAsUTC = true;

type Executor = Pick<Pool, 'query'> | PoolClient;
type Row = Record<string, any>;
type SortSpec = 'asc' | 'desc' | { sort: 'asc' | 'desc'; nulls?: 'first' | 'last' };
type OrderBy = Record<string, SortSpec> | Record<string, SortSpec>[];

export interface FindArgs {
  where?: Row;
  orderBy?: OrderBy;
  skip?: number;
  take?: number;
  include?: Row;
  select?: Row;
  distinct?: string[];
}

/**
 * Thrown for query shapes this adapter does not implement. Failing loudly is
 * deliberate: the previous adapter silently ignored unknown options, which
 * returned wrong data instead of an error.
 */
export class UnsupportedQueryError extends Error {}

const WHERE_OPERATORS = new Set([
  'equals', 'not', 'in', 'notIn', 'lt', 'lte', 'gt', 'gte',
  'contains', 'startsWith', 'endsWith', 'mode',
]);

/** Escapes LIKE metacharacters so user search text is matched literally. */
function escapeLike(value: string): string {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

function isPlainObject(value: unknown): value is Row {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !Buffer.isBuffer(value)
  );
}

/** Collects bind parameters and hands out $n placeholders. */
class Params {
  readonly values: unknown[] = [];
  add(value: unknown): string {
    this.values.push(value);
    return `$${this.values.length}`;
  }
}

/**
 * Minimal, Prisma-shaped data access layer over node-postgres.
 *
 * Prisma was removed from the backend; the services still use a small subset of
 * its query API (findMany/update/include/...). This class implements exactly
 * that subset against an explicit field→column registry (./schema.ts):
 *
 *  - every identifier comes from the registry, never from caller strings, so
 *    field names cannot inject SQL, and unknown fields throw;
 *  - every value is a bind parameter;
 *  - unsupported shapes (nested writes, connect, …) throw instead of being
 *    silently ignored.
 *
 * New code can also use query()/transaction() with hand-written SQL.
 */
@Injectable()
export class DatabaseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);

  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  // ─── Model accessors ──────────────────────────────────────────────────────
  readonly application = this.model('application');
  readonly association = this.model('association');
  readonly user = this.model('user');
  readonly magicToken = this.model('magicToken');
  readonly notificationLog = this.model('notificationLog');
  readonly auditLog = this.model('auditLog');
  readonly applicationEducation = this.model('applicationEducation');
  readonly applicationLanguage = this.model('applicationLanguage');
  readonly applicationUnExperience = this.model('applicationUnExperience');
  readonly applicationNonUnExperience = this.model('applicationNonUnExperience');
  readonly applicationFaficsExperience = this.model('applicationFaficsExperience');
  readonly applicationLocalExperience = this.model('applicationLocalExperience');
  readonly applicationExpertise = this.model('applicationExpertise');

  async onModuleInit(): Promise<void> {
    const { rows } = await this.pool.query('SELECT current_database() AS db');
    // Name the target (never the credentials) so it is obvious from the log
    // whether a process is talking to a local copy or to production.
    let target = 'unknown host';
    try {
      const url = new URL(process.env.DATABASE_URL ?? '');
      target = `${url.hostname}:${url.port || '5432'}`;
    } catch {
      // Unparseable URL — pg connected anyway, so just log the database name.
    }
    this.logger.log(`PostgreSQL connected: ${target} / ${rows[0]?.db}`);

    await this.assertMigrationsApplied();
  }

  /**
   * Prisma no longer applies schema changes. A deploy that skips
   * `npm run db:migrate` would start and then fail on the first query that
   * needs a new column — sign-in included — so refuse to start instead, with
   * the fix in the message. SKIP_MIGRATION_CHECK=true starts regardless.
   */
  private async assertMigrationsApplied(): Promise<void> {
    if (process.env.SKIP_MIGRATION_CHECK === 'true') return;

    // dist/database → ../../database/migrations (src/database in development).
    const dir = path.resolve(__dirname, '..', '..', 'database', 'migrations');
    if (!fs.existsSync(dir)) {
      this.logger.warn(`Migration folder not found (${dir}); skipping the pending-migration check.`);
      return;
    }
    const files = fs.readdirSync(dir).filter((f) => /^\d+_.+\.sql$/.test(f)).sort();

    let applied = new Set<string>();
    try {
      const { rows } = await this.pool.query<{ name: string }>('SELECT name FROM schema_migrations');
      applied = new Set(rows.map((r) => r.name));
    } catch (error: any) {
      if (error?.code === '42501') {
        // Migrations were run by another (owner) account this user cannot read.
        this.logger.warn('Cannot read schema_migrations (permission denied); skipping the pending-migration check.');
        return;
      }
      if (error?.code !== '42P01') throw error; // 42P01 = table missing → nothing applied yet
    }

    const pending = files.filter((f) => !applied.has(f));
    if (pending.length > 0) {
      throw new Error(
        `Database migrations pending: ${pending.join(', ')}. ` +
          'Run "npm run db:migrate" in the API folder (apps/api; see DEPLOYMENT.md), then restart the API.',
      );
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }

  // ─── Raw SQL ──────────────────────────────────────────────────────────────

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params: unknown[] = [],
  ): Promise<QueryResult<T>> {
    return this.pool.query<T>(text, params);
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Tagged-template raw query. Interpolated values become bind parameters —
   * they are never spliced into the SQL text.
   *
   * @example this.db.$queryRaw`SELECT * FROM applications WHERE id = ${id}`
   */
  async $queryRaw<T = any[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T> {
    return runRaw(this.pool, strings, values).then((r) => r.rows as unknown as T);
  }

  async $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number> {
    return runRaw(this.pool, strings, values).then((r) => Number(r.rowCount ?? 0));
  }

  /**
   * Runs `callback` in a transaction with a client exposing the same model
   * accessors and raw helpers as this service.
   */
  async $transaction<T>(callback: (tx: TxClient) => Promise<T>): Promise<T> {
    return this.transaction((client) => callback(this.txClient(client)));
  }

  private txClient(client: PoolClient): TxClient {
    const tx: Row = {
      $queryRaw: (strings: TemplateStringsArray, ...values: unknown[]) =>
        runRaw(client, strings, values).then((r) => r.rows),
      $executeRaw: (strings: TemplateStringsArray, ...values: unknown[]) =>
        runRaw(client, strings, values).then((r) => Number(r.rowCount ?? 0)),
    };
    for (const name of Object.keys(MODELS) as ModelName[]) {
      tx[name] = this.model(name, client);
    }
    return tx as TxClient;
  }

  private model(name: ModelName, executor: Executor = this.pool): ModelClient {
    return new ModelClient(name, executor);
  }
}

export type TxClient = {
  [K in ModelName]: ModelClient;
} & {
  $queryRaw<T = any[]>(strings: TemplateStringsArray, ...values: unknown[]): Promise<T>;
  $executeRaw(strings: TemplateStringsArray, ...values: unknown[]): Promise<number>;
};

function runRaw(executor: Executor, strings: TemplateStringsArray, values: unknown[]) {
  if (!Array.isArray(strings) || !('raw' in strings)) {
    throw new UnsupportedQueryError('$queryRaw/$executeRaw must be used as a tagged template.');
  }
  const text = strings.reduce(
    (sql, chunk, i) => sql + chunk + (i < values.length ? `$${i + 1}` : ''),
    '',
  );
  return executor.query(text, values);
}

// ─────────────────────────────────────────────────────────────────────────────
// Model client
// ─────────────────────────────────────────────────────────────────────────────

export class ModelClient {
  private readonly def: ModelDef;

  constructor(
    private readonly name: ModelName,
    private readonly executor: Executor,
  ) {
    this.def = MODELS[name];
  }

  // ─── Reads ────────────────────────────────────────────────────────────────

  async findMany(args: FindArgs = {}): Promise<any[]> {
    const { where, orderBy, skip, take, include, select, distinct } = args;
    const params = new Params();
    const alias = 't0';
    const whereSql = compileWhere(this.name, where, params, alias, 1);

    let sql = `SELECT ${alias}.* FROM ${this.def.table} AS ${alias}`;
    if (whereSql) sql += ` WHERE ${whereSql}`;
    sql += compileOrderBy(this.name, orderBy, alias);

    // DISTINCT is applied in JS below, so paging must happen after it.
    if (!distinct) {
      if (take !== undefined) sql += ` LIMIT ${toCount(take, 'take')}`;
      if (skip !== undefined) sql += ` OFFSET ${toCount(skip, 'skip')}`;
    }

    const result = await this.executor.query(sql, params.values);
    let rows = result.rows.map((r) => mapRow(this.def, r));

    if (distinct) {
      const fields = distinct.map((f) => this.fieldColumn(f) && f);
      const seen = new Set<string>();
      rows = rows.filter((r) => {
        const key = JSON.stringify(fields.map((f) => r[f]));
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      const start = skip !== undefined ? toCount(skip, 'skip') : 0;
      const end = take !== undefined ? start + toCount(take, 'take') : undefined;
      rows = rows.slice(start, end);
    }

    const relations = { ...(include ?? {}) };
    if (select) {
      for (const [key, value] of Object.entries(select)) {
        if (value && (key === '_count' || this.def.relations?.[key])) relations[key] = value;
      }
    }
    if (Object.keys(relations).length) {
      await attachRelations(this.name, rows, relations, this.executor);
    }
    return select ? rows.map((r) => pick(this.name, r, select)) : rows;
  }

  async findFirst(args: FindArgs = {}): Promise<any | null> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findUnique(args: FindArgs = {}): Promise<any | null> {
    if (!args.where || Object.keys(args.where).length === 0) {
      throw new UnsupportedQueryError(`${this.name}.findUnique requires a where clause.`);
    }
    return this.findFirst(args);
  }

  async findUniqueOrThrow(args: FindArgs = {}): Promise<any> {
    const row = await this.findUnique(args);
    if (!row) throw new NotFoundException(`${this.name} not found`);
    return row;
  }

  async count(args: { where?: Row } = {}): Promise<number> {
    const params = new Params();
    const whereSql = compileWhere(this.name, args.where, params, 't0', 1);
    const sql =
      `SELECT COUNT(*)::int AS total FROM ${this.def.table} AS t0` +
      (whereSql ? ` WHERE ${whereSql}` : '');
    const result = await this.executor.query(sql, params.values);
    return Number(result.rows[0]?.total ?? 0);
  }

  // ─── Writes ───────────────────────────────────────────────────────────────

  async create(args: { data: Row; select?: Row; include?: Row }): Promise<any> {
    const entries = this.writeEntries(args.data, 'create');
    const params = new Params();
    const sql = entries.length
      ? `INSERT INTO ${this.def.table} (${entries.map(([c]) => c).join(', ')}) ` +
        `VALUES (${entries.map(([, v]) => params.add(v)).join(', ')}) RETURNING *`
      : `INSERT INTO ${this.def.table} DEFAULT VALUES RETURNING *`;
    const result = await this.executor.query(sql, params.values);
    return this.finishWrite(result.rows[0], args);
  }

  async createMany(args: { data: Row[] }): Promise<{ count: number }> {
    const rows = (args.data ?? []).map((d) => new Map(this.writeEntries(d, 'createMany')));
    if (rows.length === 0) return { count: 0 };

    const columns = [...new Set(rows.flatMap((r) => [...r.keys()]))];
    if (columns.length === 0) {
      throw new UnsupportedQueryError(`${this.name}.createMany needs at least one column.`);
    }
    const params = new Params();
    const tuples = rows.map(
      (r) => `(${columns.map((c) => (r.has(c) ? params.add(r.get(c)) : 'DEFAULT')).join(', ')})`,
    );
    const result = await this.executor.query(
      `INSERT INTO ${this.def.table} (${columns.join(', ')}) VALUES ${tuples.join(', ')}`,
      params.values,
    );
    return { count: Number(result.rowCount ?? 0) };
  }

  async update(args: { where: Row; data: Row; select?: Row; include?: Row }): Promise<any> {
    const entries = this.writeEntries(args.data, 'update');
    if (entries.length === 0) {
      // Nothing to write — behave like Prisma and return the current row.
      const current = await this.findFirst({ where: args.where });
      if (!current) throw new NotFoundException(`${this.name} to update not found`);
      return this.finishWrite(null, args, current);
    }
    const rows = await this.writeWhere('UPDATE', args.where, entries, true);
    if (rows.length === 0) throw new NotFoundException(`${this.name} to update not found`);
    return this.finishWrite(rows[0], args);
  }

  async updateMany(args: { where?: Row; data: Row }): Promise<{ count: number }> {
    const entries = this.writeEntries(args.data, 'update');
    if (entries.length === 0) return { count: 0 };
    const rows = await this.writeWhere('UPDATE', args.where, entries, true);
    return { count: rows.length };
  }

  async delete(args: { where: Row }): Promise<any> {
    const rows = await this.writeWhere('DELETE', args.where, [], true);
    if (rows.length === 0) throw new NotFoundException(`${this.name} to delete not found`);
    return mapRow(this.def, rows[0]);
  }

  async deleteMany(args: { where?: Row } = {}): Promise<{ count: number }> {
    const rows = await this.writeWhere('DELETE', args.where, [], true);
    return { count: rows.length };
  }

  /**
   * Find-then-write upsert. When run on a transaction client, a concurrent
   * insert of the same unique key is absorbed with a savepoint and retried as
   * an update, instead of failing the whole transaction.
   */
  async upsert(args: { where: Row; update: Row; create: Row }): Promise<any> {
    const existing = await this.findFirst({ where: args.where });
    if (existing) return this.update({ where: args.where, data: args.update });

    const inTransaction = this.executor instanceof Object && 'release' in this.executor;
    if (!inTransaction) {
      try {
        return await this.create({ data: args.create });
      } catch (error: any) {
        if (error?.code !== '23505') throw error;
        return this.update({ where: args.where, data: args.update });
      }
    }

    await this.executor.query('SAVEPOINT upsert_create');
    try {
      const created = await this.create({ data: args.create });
      await this.executor.query('RELEASE SAVEPOINT upsert_create');
      return created;
    } catch (error: any) {
      await this.executor.query('ROLLBACK TO SAVEPOINT upsert_create');
      if (error?.code !== '23505') throw error;
      return this.update({ where: args.where, data: args.update });
    }
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private fieldColumn(field: string): string {
    const column = this.def.fields[field];
    if (!column) {
      throw new UnsupportedQueryError(`Unknown field "${field}" on ${this.name}.`);
    }
    return column;
  }

  /** Validates write data and returns [column, value] pairs. */
  private writeEntries(data: Row | undefined, op: string): [string, unknown][] {
    if (!isPlainObject(data)) {
      throw new UnsupportedQueryError(`${this.name}.${op} requires a data object.`);
    }
    const entries: [string, unknown][] = [];
    for (const [field, value] of Object.entries(data)) {
      // Prisma semantics: undefined means "leave unset", not NULL.
      if (value === undefined) continue;
      if (this.def.relations?.[field]) {
        throw new UnsupportedQueryError(
          `Nested writes (${this.name}.${field}) are not supported — set the foreign key field instead.`,
        );
      }
      const column = this.fieldColumn(field);
      if (isPlainObject(value) && !this.def.json?.includes(field)) {
        throw new UnsupportedQueryError(
          `Unsupported update operator on ${this.name}.${field}: ${Object.keys(value).join(', ')}`,
        );
      }
      const isJson = this.def.json?.includes(field) && value !== null;
      entries.push([column, isJson ? JSON.stringify(value) : value]);
    }
    return entries;
  }

  private async writeWhere(
    verb: 'UPDATE' | 'DELETE',
    where: Row | undefined,
    entries: [string, unknown][],
    returning: boolean,
  ): Promise<Row[]> {
    const params = new Params();
    const alias = 't0';
    let sql =
      verb === 'UPDATE'
        ? `UPDATE ${this.def.table} AS ${alias} SET ${entries
            .map(([c, v]) => `${c} = ${params.add(v)}`)
            .join(', ')}`
        : `DELETE FROM ${this.def.table} AS ${alias}`;
    const whereSql = compileWhere(this.name, where, params, alias, 1);
    if (whereSql) sql += ` WHERE ${whereSql}`;
    if (returning) sql += ' RETURNING *';
    const result = await this.executor.query(sql, params.values);
    return result.rows;
  }

  private async finishWrite(
    raw: Row | null,
    args: { select?: Row; include?: Row },
    mapped?: Row,
  ): Promise<any> {
    const row = mapped ?? mapRow(this.def, raw!);
    if (args.include) await attachRelations(this.name, [row], args.include, this.executor);
    return args.select ? pick(this.name, row, args.select) : row;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SQL compilation
// ─────────────────────────────────────────────────────────────────────────────

function toCount(value: unknown, name: string): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) {
    throw new UnsupportedQueryError(`${name} must be a non-negative integer.`);
  }
  return n;
}

function columnOf(model: ModelName, field: string): string {
  const column = MODELS[model].fields[field];
  if (!column) throw new UnsupportedQueryError(`Unknown field "${field}" on ${model}.`);
  return column;
}

function compileOrderBy(model: ModelName, orderBy: OrderBy | undefined, alias: string): string {
  if (!orderBy) return '';
  const list = Array.isArray(orderBy) ? orderBy : [orderBy];
  const parts: string[] = [];
  for (const item of list) {
    for (const [field, direction] of Object.entries(item)) {
      // Prisma's `{ sort: 'asc', nulls: 'last' }` form is accepted too.
      const spec = isPlainObject(direction) ? direction : { sort: direction };
      const dir = String(spec.sort).toLowerCase();
      if (dir !== 'asc' && dir !== 'desc') {
        throw new UnsupportedQueryError(`Invalid sort direction "${spec.sort}".`);
      }
      let nulls = '';
      if (spec.nulls !== undefined) {
        const n = String(spec.nulls).toLowerCase();
        if (n !== 'first' && n !== 'last') {
          throw new UnsupportedQueryError(`Invalid nulls position "${spec.nulls}".`);
        }
        nulls = ` NULLS ${n.toUpperCase()}`;
      }
      parts.push(`${alias}.${columnOf(model, field)} ${dir.toUpperCase()}${nulls}`);
    }
  }
  return parts.length ? ` ORDER BY ${parts.join(', ')}` : '';
}

/**
 * Compiles a Prisma-style where object to SQL (without the WHERE keyword).
 * All operators in one field object are ANDed, as in Prisma.
 */
function compileWhere(
  model: ModelName,
  where: Row | undefined,
  params: Params,
  alias: string,
  depth: number,
): string {
  if (!where) return '';
  const def = MODELS[model];
  const clauses: string[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    if (key === 'AND' || key === 'OR' || key === 'NOT') {
      const items = (Array.isArray(value) ? value : [value])
        .map((w) => compileWhere(model, w, params, alias, depth))
        .map((sql) => (sql ? `(${sql})` : 'TRUE'));
      if (key === 'AND') clauses.push(items.length ? items.join(' AND ') : 'TRUE');
      if (key === 'OR') clauses.push(items.length ? `(${items.join(' OR ')})` : 'FALSE');
      // Prisma: NOT [a, b] means neither a nor b.
      if (key === 'NOT') clauses.push(items.length ? items.map((i) => `NOT ${i}`).join(' AND ') : 'TRUE');
      continue;
    }

    const relation = def.relations?.[key];
    if (relation) {
      clauses.push(compileRelationFilter(model, relation, value, params, alias, depth));
      continue;
    }

    const column = `${alias}.${columnOf(model, key)}`;

    if (value === null) {
      clauses.push(`${column} IS NULL`);
      continue;
    }
    if (!isPlainObject(value)) {
      clauses.push(`${column} = ${params.add(value)}`);
      continue;
    }

    for (const op of Object.keys(value)) {
      if (!WHERE_OPERATORS.has(op)) {
        throw new UnsupportedQueryError(`Unsupported filter "${op}" on ${model}.${key}.`);
      }
    }
    const insensitive = value.mode === 'insensitive';
    const text = (sqlCol: string) => (insensitive ? `LOWER(${sqlCol})` : sqlCol);
    const textParam = (v: unknown) => (insensitive ? `LOWER(${params.add(v)})` : params.add(v));

    if (value.equals !== undefined) {
      clauses.push(
        value.equals === null ? `${column} IS NULL` : `${text(column)} = ${textParam(value.equals)}`,
      );
    }
    if (value.not !== undefined) {
      if (isPlainObject(value.not)) {
        throw new UnsupportedQueryError(`Nested "not" filters are not supported (${model}.${key}).`);
      }
      clauses.push(
        value.not === null
          ? `${column} IS NOT NULL`
          : `(${column} IS NULL OR ${text(column)} <> ${textParam(value.not)})`,
      );
    }
    if (value.in !== undefined) {
      const list = Array.isArray(value.in) ? value.in : [value.in];
      clauses.push(list.length ? `${column} IN (${list.map((v) => params.add(v)).join(', ')})` : 'FALSE');
    }
    if (value.notIn !== undefined) {
      const list = Array.isArray(value.notIn) ? value.notIn : [value.notIn];
      if (list.length) {
        clauses.push(
          `(${column} IS NULL OR ${column} NOT IN (${list.map((v) => params.add(v)).join(', ')}))`,
        );
      }
    }
    if (value.lt !== undefined) clauses.push(`${column} < ${params.add(value.lt)}`);
    if (value.lte !== undefined) clauses.push(`${column} <= ${params.add(value.lte)}`);
    if (value.gt !== undefined) clauses.push(`${column} > ${params.add(value.gt)}`);
    if (value.gte !== undefined) clauses.push(`${column} >= ${params.add(value.gte)}`);

    const like = (pattern: string) =>
      clauses.push(
        `${column} ${insensitive ? 'ILIKE' : 'LIKE'} ${params.add(pattern)} ESCAPE '\\'`,
      );
    if (value.contains !== undefined) like(`%${escapeLike(value.contains)}%`);
    if (value.startsWith !== undefined) like(`${escapeLike(value.startsWith)}%`);
    if (value.endsWith !== undefined) like(`%${escapeLike(value.endsWith)}`);
  }

  return clauses.join(' AND ');
}

/** some / none / every on to-many relations; is / isNot on to-one relations. */
function compileRelationFilter(
  model: ModelName,
  relation: Relation,
  filter: unknown,
  params: Params,
  alias: string,
  depth: number,
): string {
  if (!isPlainObject(filter)) {
    throw new UnsupportedQueryError(`Relation filter on ${model} must be an object.`);
  }
  const target = MODELS[relation.model];
  const sub = `t${depth}`;
  const join =
    relation.kind === 'many'
      ? `${sub}.${columnOf(relation.model, relation.foreignKey)} = ${alias}.${columnOf(model, 'id')}`
      : `${sub}.${columnOf(relation.model, relation.targetKey)} = ${alias}.${columnOf(model, relation.localKey)}`;
  const exists = (inner: Row | undefined, negateInner = false) => {
    const innerSql = compileWhere(relation.model, inner, params, sub, depth + 1);
    const cond = innerSql ? ` AND ${negateInner ? `NOT (${innerSql})` : `(${innerSql})`}` : '';
    return `EXISTS (SELECT 1 FROM ${target.table} AS ${sub} WHERE ${join}${cond})`;
  };

  const parts: string[] = [];
  for (const [op, inner] of Object.entries(filter)) {
    if (relation.kind === 'many' && op === 'some') parts.push(exists(inner));
    else if (relation.kind === 'many' && op === 'none') parts.push(`NOT ${exists(inner)}`);
    else if (relation.kind === 'many' && op === 'every') parts.push(`NOT ${exists(inner, true)}`);
    else if (relation.kind === 'one' && op === 'is') parts.push(inner === null ? `NOT ${exists(undefined)}` : exists(inner));
    else if (relation.kind === 'one' && op === 'isNot') parts.push(inner === null ? exists(undefined) : `NOT ${exists(inner)}`);
    else throw new UnsupportedQueryError(`Unsupported relation filter "${op}" on ${model}.`);
  }
  return parts.join(' AND ');
}

// ─────────────────────────────────────────────────────────────────────────────
// Row mapping and relation loading
// ─────────────────────────────────────────────────────────────────────────────

const reverseCache = new Map<ModelName, Record<string, string>>();

function mapRow(def: ModelDef, row: Row): Row {
  let reverse = reverseCache.get(def.name);
  if (!reverse) {
    reverse = Object.fromEntries(Object.entries(def.fields).map(([f, c]) => [c, f]));
    reverseCache.set(def.name, reverse);
  }
  const mapped: Row = {};
  for (const [column, value] of Object.entries(row)) {
    mapped[reverse[column] ?? column.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase())] = value;
  }
  return mapped;
}

function pick(model: ModelName, row: Row, select: Row): Row {
  const out: Row = {};
  for (const [key, enabled] of Object.entries(select)) {
    if (!enabled) continue;
    if (key !== '_count' && !MODELS[model].fields[key] && !MODELS[model].relations?.[key]) {
      throw new UnsupportedQueryError(`Unknown field "${key}" in select on ${model}.`);
    }
    out[key] = row[key];
  }
  return out;
}

async function attachRelations(
  model: ModelName,
  rows: Row[],
  include: Row,
  executor: Executor,
): Promise<void> {
  if (rows.length === 0) return;
  const def = MODELS[model];

  for (const [name, options] of Object.entries(include)) {
    if (!options) continue;

    if (name === '_count') {
      await attachCounts(model, rows, options, executor);
      continue;
    }

    const relation = def.relations?.[name];
    if (!relation) {
      throw new UnsupportedQueryError(`Unknown relation "${name}" on ${model}.`);
    }
    const opts: FindArgs = options === true ? {} : options;
    if (opts.take !== undefined || opts.skip !== undefined || opts.distinct) {
      throw new UnsupportedQueryError(`take/skip/distinct inside include are not supported (${model}.${name}).`);
    }

    const localKey = relation.kind === 'many' ? 'id' : relation.localKey;
    const remoteKey = relation.kind === 'many' ? relation.foreignKey : relation.targetKey;
    const keys = [...new Set(rows.map((r) => r[localKey]).filter((k) => k !== null && k !== undefined))];

    let children: Row[] = [];
    if (keys.length) {
      // Always load the join key so rows can be grouped, then trim to the
      // caller's select afterwards.
      const client = new ModelClient(relation.model, executor);
      children = await client.findMany({
        where: { AND: [{ [remoteKey]: { in: keys } }, opts.where ?? {}] },
        orderBy: opts.orderBy,
        include: opts.include,
      });
    }

    const grouped = new Map<unknown, Row[]>();
    for (const child of children) {
      const k = child[remoteKey];
      if (!grouped.has(k)) grouped.set(k, []);
      grouped.get(k)!.push(opts.select ? pick(relation.model, child, opts.select) : child);
    }
    for (const row of rows) {
      const matches = grouped.get(row[localKey]) ?? [];
      row[name] = relation.kind === 'many' ? matches : matches[0] ?? null;
    }
  }
}

async function attachCounts(model: ModelName, rows: Row[], options: any, executor: Executor): Promise<void> {
  const select = options === true ? MODELS[model].relations : options?.select;
  if (!select) throw new UnsupportedQueryError(`_count on ${model} needs a select.`);
  const ids = rows.map((r) => r.id);
  for (const row of rows) row._count = {};

  for (const [name, enabled] of Object.entries(select)) {
    if (!enabled) continue;
    const relation = MODELS[model].relations?.[name];
    if (!relation || relation.kind !== 'many') {
      throw new UnsupportedQueryError(`_count is only supported on to-many relations (${model}.${name}).`);
    }
    const target = MODELS[relation.model];
    const fk = columnOf(relation.model, relation.foreignKey);
    const result = await executor.query(
      `SELECT ${fk} AS key, COUNT(*)::int AS n FROM ${target.table} WHERE ${fk} = ANY($1) GROUP BY ${fk}`,
      [ids],
    );
    const counts = new Map(result.rows.map((r: Row) => [r.key, Number(r.n)]));
    for (const row of rows) row._count[name] = counts.get(row.id) ?? 0;
  }
}
