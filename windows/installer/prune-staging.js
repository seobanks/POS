/**
 * Prunes unnecessary development, TypeScript definitions, source maps,
 * test suites, and redundant ESM distributions from the Windows staging directory.
 *
 * This reduces path lengths well below the Windows MAX_PATH (260 char) limit
 * and prevents Win32 MoveFile code 3 errors during Inno Setup installation.
 */

const fs = require('fs');
const path = require('path');

const STAGE_DIR = process.argv[2] || 'C:\\hp-stage';

let deletedFiles = 0;
let deletedDirs = 0;
let savedBytes = 0;

const DIRS_TO_REMOVE = new Set([
  'dist-types',
  'ts3.4',
  'dist-es',
  '__tests__',
  '.github',
  'docs',
  'example',
  'examples',
  '.turbo'
]);

function prune(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (DIRS_TO_REMOVE.has(entry.name)) {
        try {
          fs.rmSync(full, { recursive: true, force: true });
          deletedDirs++;
        } catch {}
        continue;
      }
      prune(full);
    } else {
      const name = entry.name.toLowerCase();
      if (
        name.endsWith('.d.ts') ||
        name.endsWith('.d.ts.map') ||
        name.endsWith('.js.map') ||
        name.endsWith('.ts.map') ||
        name.endsWith('.d.cts') ||
        name.endsWith('.d.mts') ||
        name === 'readme.md' ||
        name === 'changelog.md' ||
        name.startsWith('license')
      ) {
        try {
          const sz = fs.statSync(full).size;
          fs.unlinkSync(full);
          savedBytes += sz;
          deletedFiles++;
        } catch {}
      }
    }
  }
}

console.log(`Pruning unnecessary development assets from ${STAGE_DIR}...`);
const targets = [
  path.join(STAGE_DIR, 'app', 'backend', 'node_modules'),
  path.join(STAGE_DIR, 'app', 'web', 'node_modules')
];

for (const target of targets) {
  if (fs.existsSync(target)) {
    prune(target);
  }
}

console.log(`[✓] Pruning complete: deleted ${deletedFiles} files and ${deletedDirs} directories.`);
console.log(`    Saved: ${(savedBytes / (1024 * 1024)).toFixed(1)} MB.`);
