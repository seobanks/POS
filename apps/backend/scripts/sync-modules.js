const fs = require('node:fs');
const path = require('node:path');

const backendDir = path.resolve(__dirname, '..');
const distDir = path.join(backendDir, 'dist');
const distSrcNm = path.join(distDir, 'src', 'node_modules');
const distNm = path.join(distDir, 'node_modules');

console.log('[sync-modules] Checking module symlinks for Vercel Serverless container...');

// In Vercel Linux containers:
// Entrypoint is at /var/task/src/main.js
// Traced packages are physically in /var/task/apps/backend/node_modules
// Create relative symlinks so that /var/task/src/node_modules resolves to /var/task/apps/backend/node_modules
if (process.platform !== 'win32') {
  try {
    const srcDir = path.join(distDir, 'src');
    if (fs.existsSync(srcDir) && !fs.existsSync(distSrcNm)) {
      fs.symlinkSync('../apps/backend/node_modules', distSrcNm);
      console.log('[sync-modules] Created symlink: dist/src/node_modules -> ../apps/backend/node_modules');
    }
  } catch (err) {
    console.warn('[sync-modules] Symlink dist/src/node_modules skipped:', err.message);
  }

  try {
    if (fs.existsSync(distDir) && !fs.existsSync(distNm)) {
      fs.symlinkSync('apps/backend/node_modules', distNm);
      console.log('[sync-modules] Created symlink: dist/node_modules -> apps/backend/node_modules');
    }
  } catch (err) {
    console.warn('[sync-modules] Symlink dist/node_modules skipped:', err.message);
  }
}

console.log('[sync-modules] Module synchronization complete.');
