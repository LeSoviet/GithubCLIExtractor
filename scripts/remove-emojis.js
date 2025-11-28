import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Emoji replacements (remove all emojis from report output)
const emojiReplacements = {
  '📊': '',
  '🟢': '',
  '🟡': '',
  '🔴': '',
  '📈': 'Improving',
  '📉': 'Declining',
  '→': 'Stable',
  '⚠️': '',
  '✅': '',
  '❌': '',
  '💊': '',
  '🎯': '',
  '🏷️': '',
  '🟠': '',
  '💡': '',
  '📋': '',
  '↑': '^',
  '↓': 'v',
};

// Find all report generator files
const dir = 'src/analytics/report-generators';
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.ts'))
  .map((f) => join(dir, f));

files.forEach((file) => {
  console.log(`Processing: ${file}`);
  let content = readFileSync(file, 'utf-8');
  let changed = false;

  // Replace emojis
  Object.entries(emojiReplacements).forEach(([emoji, replacement]) => {
    if (content.includes(emoji)) {
      content = content.split(emoji).join(replacement);
      changed = true;
    }
  });

  if (changed) {
    writeFileSync(file, content, 'utf-8');
    console.log(`  ✓ Updated ${file}`);
  } else {
    console.log(`  - No changes needed for ${file}`);
  }
});

console.log('\nDone! All emojis removed from report generators.');
