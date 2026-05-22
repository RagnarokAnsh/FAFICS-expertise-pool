const fs = require('fs');
const path = require('path');

const dtoDir = path.join(__dirname, 'apps/api/src/modules/applications/dto/nested');
const files = fs.readdirSync(dtoDir).filter(f => f.endsWith('.ts'));

for (const file of files) {
  const filePath = path.join(dtoDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Replace @IsNotEmpty() with @IsOptional()
  content = content.replace(/@IsNotEmpty\(\)/g, '@IsOptional()');

  // Ensure IsOptional is imported
  if (!content.includes('IsOptional')) {
    content = content.replace(/import \{([\s\S]*?)\} from 'class-validator';/, (match, p1) => {
      return `import { IsOptional, ${p1.trim()} } from 'class-validator';`;
    });
  }

  // Replace `propertyName!: type;` with `propertyName?: type;`
  // We use regex to find lines with `!:`
  content = content.replace(/(\w+)\!:/g, '$1?:');

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
