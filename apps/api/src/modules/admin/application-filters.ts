import { ListApplicationsDto } from './dto/list-applications.dto';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Prisma-style filter and sort objects, compiled by DatabaseService. */
type Where = Record<string, any>;
type OrderBy = Record<string, any>;

/**
 * The Applications filters, shared by the list and its Excel export so the
 * file always holds exactly what the screen shows.
 */
export function applicationsWhere(dto: Partial<ListApplicationsDto>): Where {
  const where: Where = {};
  const and: Where[] = [];

  if (dto.status) {
    where.status = dto.status as any;
  } else if (dto.excludeDrafts) {
    where.status = { not: 'draft' };
  }

  // Awaiting the President for at least N days (the dashboard's waiting flag).
  if (dto.waitingMinDays) {
    where.status = 'submitted';
    where.submittedAt = { lte: new Date(Date.now() - dto.waitingMinDays * DAY_MS) };
  }

  if (dto.country) {
    where.associationCountry = { equals: dto.country, mode: 'insensitive' };
  }
  if (dto.association) {
    where.associationName = { equals: dto.association, mode: 'insensitive' };
  }

  if (dto.search) {
    and.push({
      OR: [
        { firstName: { contains: dto.search, mode: 'insensitive' } },
        { lastName: { contains: dto.search, mode: 'insensitive' } },
        { associationName: { contains: dto.search, mode: 'insensitive' } },
        { email: { contains: dto.search, mode: 'insensitive' } },
        { referenceNumber: { contains: dto.search, mode: 'insensitive' } },
      ],
    });
  }

  if (dto.areaKey) {
    and.push({ expertise: { some: { areaKey: dto.areaKey } } });
  }

  if (and.length) where.AND = and;
  return where;
}

/** Sort orders offered on the Applications page. */
export const APPLICATION_SORTS = ['updated', 'oldest', 'newest', 'name'] as const;
export type ApplicationSort = (typeof APPLICATION_SORTS)[number];

export function applicationsOrderBy(sort?: ApplicationSort): OrderBy[] {
  // id last so equal values (e.g. two people with the same name) keep one
  // fixed order across list pages and the Excel export.
  switch (sort) {
    case 'oldest':
      return [{ submittedAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }, { id: 'asc' }];
    case 'newest':
      return [{ submittedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'asc' }];
    case 'name':
      return [{ lastName: 'asc' }, { firstName: 'asc' }, { createdAt: 'asc' }, { id: 'asc' }];
    default:
      return [{ updatedAt: 'desc' }, { id: 'asc' }];
  }
}
