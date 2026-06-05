-- Drop the raw magic-token column. Only the SHA-256 hash (token_hash) is
-- needed for lookups; persisting the raw token defeated the hashing and
-- meant a database leak would expose every live magic link.

-- DropIndex
DROP INDEX IF EXISTS "magic_tokens_token_key";

-- AlterTable
ALTER TABLE "magic_tokens" DROP COLUMN IF EXISTS "token";
