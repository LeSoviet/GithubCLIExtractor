import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Patterns to replace .toFixed() with format-helpers
const replacements = [
  // Percentages - most common pattern
  {
    pattern: /\$\{([^}]+)\.toFixed\((0|1)\)\}%/g,
    replacement: (match, varName) => `\${formatPercentage(${varName})}`,
    description: 'Percentage formatting',
  },
  // Hours
  {
    pattern: /\$\{([^}]+)\.toFixed\((0|1)\)\}h/g,
    replacement: (match, varName) => `\${formatHours(${varName})}`,
    description: 'Hours formatting',
  },
  // Days
  {
    pattern: /\$\{([^}]+)\.toFixed\((0|1)\)\}d/g,
    replacement: (match, varName) => `\${formatDays(${varName})}`,
    description: 'Days formatting',
  },
  // Standalone .toFixed(1) for decimals (not followed by %, h, d)
  {
    pattern: /\$\{([^}]+)\.toFixed\(1\)\}(?![%hd])/g,
    replacement: (match, varName) => `\${formatDecimal(${varName})}`,
    description: 'Decimal formatting',
  },
  // Standalone .toFixed(0) for counts
  {
    pattern: /\$\{([^}]+)\.toFixed\(0\)\}(?![%hd])/g,
    replacement: (match, varName) => `\${formatCount(${varName})}`,
    description: 'Count formatting',
  },
];

// Files to process
const dir = 'src/analytics/report-generators';
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.ts') && !f.includes('types.ts'))
  .map((f) => join(dir, f));

let totalReplacements = 0;
const filesModified = [];

files.forEach((file) => {
  console.log(`\nProcessing: ${file}`);
  let content = readFileSync(file, 'utf-8');
  let changed = false;
  let fileReplacements = 0;

  // Check if file already imports format-helpers
  const hasImport = content.includes('format-helpers');

  replacements.forEach(({ pattern, replacement, description }) => {
    const matches = content.match(pattern);
    if (matches) {
      console.log(`  - ${description}: ${matches.length} replacements`);
      content = content.replace(pattern, replacement);
      fileReplacements += matches.length;
      changed = true;
    }
  });

  if (changed) {
    // Add import if not present
    if (!hasImport) {
      // Find the last import statement
      const importRegex = /import .+ from .+;\n/g;
      const imports = content.match(importRegex);
      if (imports) {
        const lastImport = imports[imports.length - 1];
        const importStatement = `import {\n  formatPercentage,\n  formatHours,\n  formatDays,\n  formatCount,\n  formatDecimal,\n} from '../../utils/format-helpers.js';\n`;
        content = content.replace(lastImport, lastImport + importStatement);
        console.log(`  + Added format-helpers import`);
      }
    }

    writeFileSync(file, content, 'utf-8');
    totalReplacements += fileReplacements;
    filesModified.push(file);
    console.log(`  ✓ ${fileReplacements} replacements made`);
  } else {
    console.log(`  - No changes needed`);
  }
});

console.log(`\n========================================`);
console.log(`Summary:`);
console.log(`  Files modified: ${filesModified.length}`);
console.log(`  Total replacements: ${totalReplacements}`);
console.log(`========================================\n`);

if (filesModified.length > 0) {
  console.log(`Modified files:`);
  filesModified.forEach((f) => console.log(`  - ${f}`));
}
