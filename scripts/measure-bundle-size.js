/**
 * Task 9.6.5: Bundle Size Measurement Script
 * 
 * Measures gzipped size of dist/assets/*.js and *.css files.
 * Fails if total exceeds 40 KB.
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, '..', 'dist', 'assets');

if (!fs.existsSync(assetsDir)) {
  console.error('❌ dist/assets directory not found. Run `npm run build` first.');
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);
const jsFiles = files.filter((f) => f.endsWith('.js'));
const cssFiles = files.filter((f) => f.endsWith('.css'));

let totalSize = 0;
const breakdown = [];

console.log('\n📦 Bundle Size Report\n');

// Measure JS files
console.log('JavaScript Files:');
for (const file of jsFiles) {
  const filePath = path.join(assetsDir, file);
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  const sizeKB = (gzipped.length / 1024).toFixed(2);
  console.log(`  ${file}: ${sizeKB} KB (gzipped)`);
  totalSize += gzipped.length;
  breakdown.push({ file, sizeKB, type: 'js' });
}

// Measure CSS files
console.log('\nCSS Files:');
for (const file of cssFiles) {
  const filePath = path.join(assetsDir, file);
  const content = fs.readFileSync(filePath);
  const gzipped = zlib.gzipSync(content);
  const sizeKB = (gzipped.length / 1024).toFixed(2);
  console.log(`  ${file}: ${sizeKB} KB (gzipped)`);
  totalSize += gzipped.length;
  breakdown.push({ file, sizeKB, type: 'css' });
}

const totalKB = (totalSize / 1024).toFixed(2);
const limit = 40;

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Total (gzipped): ${totalKB} KB`);
console.log(`Limit: ${limit} KB`);

if (totalSize > limit * 1024) {
  console.error(
    `\n❌ ERROR: Bundle size ${totalKB} KB exceeds ${limit} KB limit!\n`
  );
  process.exit(1);
} else {
  const remaining = (limit - totalKB).toFixed(2);
  console.log(`✅ Within limit (${remaining} KB remaining)\n`);
}
