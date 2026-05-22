const fs = require('fs');
const path = require('path');

const dtoDir = path.join(__dirname, 'apps/api/src/modules/applications/dto/nested');
const files = fs.readdirSync(dtoDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dtoDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Remove unused IsNotEmpty imports
  content = content.replace(/IsNotEmpty,\s*/g, '');
  content = content.replace(/,\s*IsNotEmpty/g, '');
  content = content.replace(/IsNotEmpty\s*/g, '');

  fs.writeFileSync(filePath, content, 'utf8');
}
console.log('Cleaned up unused IsNotEmpty imports');
