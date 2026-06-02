const fs = require('fs');
const path = 'd:/FAFICS/apps/web/src/lib/schemas/application.schema.ts';
let content = fs.readFileSync(path, 'utf8');

// Replace .optional() with .nullish() globally, but exclude arrays
content = content.replace(/z\.string\(\)\.optional\(\)/g, 'z.string().nullish()');
content = content.replace(/z\.number\(\)\.optional\(\)/g, 'z.number().nullish()');
content = content.replace(/z\.string\(\)\.uuid\('([^']+)'\)\.optional\(\)/g, "z.string().uuid('$1').nullish()");
content = content.replace(/z\.union\(\[([^\]]+)\]\)\.optional\(\)/g, 'z.union([$1]).nullish()');
content = content.replace(/z\.enum\(\[([^\]]+)\]\)\.optional\(\)/g, 'z.enum([$1]).nullish()');

fs.writeFileSync(path, content);
console.log('Schema updated successfully');
