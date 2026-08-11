import { readFileSync, writeFileSync } from 'node:fs';

const src = readFileSync('/Users/nas/Desktop/gbp-audit/pages/index.js', 'utf8');
// ALL_DATA starts at line 6 with `const ALL_DATA = {` and is a single object literal.
// Strategy: find the object literal between the first `= {` after "const ALL_DATA" and
// the matching closing brace at the same depth (balance braces until we return to depth 0).
const startMarker = 'const ALL_DATA =';
const startIdx = src.indexOf(startMarker);
if (startIdx === -1) throw new Error('ALL_DATA not found');
const openBrace = src.indexOf('{', startIdx);
let depth = 0;
let i = openBrace;
for (; i < src.length; i++) {
  const c = src.charAt(i);
  if (c === '{') depth++;
  else if (c === '}') { depth--; if (depth === 0) break; }
}
if (depth !== 0) throw new Error('unbalanced');
const objectLiteral = src.slice(openBrace, i + 1);
// Evaluate the JS object literal in a module context.
const data = new Function(`return (${objectLiteral});`)();
const slugs = Object.keys(data);
console.log(`Extracted ${slugs.length} businesses`);
writeFileSync('data/all-data.json', JSON.stringify(data, null, 2) + '\n');
