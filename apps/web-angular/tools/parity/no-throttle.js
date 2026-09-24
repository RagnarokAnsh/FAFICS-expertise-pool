// Preloaded into the parity API only (stack.js): the scripted flows make far more
// requests per minute than the per-IP limits allow, and all of them come from
// localhost. Resolves @nestjs/throttler exactly as apps/api does, so the patched
// class is the one the API registers as its global guard.
const path = require('path');

const throttlerPath = require.resolve('@nestjs/throttler', { paths: [path.resolve(__dirname, '../../../api')] });
const { ThrottlerGuard } = require(throttlerPath);
ThrottlerGuard.prototype.canActivate = async function canActivate() {
  return true;
};
