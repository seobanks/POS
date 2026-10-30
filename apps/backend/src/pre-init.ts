import { existsSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { Module } from 'node:module';

// Self-healing module resolution for Vercel Serverless / Monorepo containers
// Must execute BEFORE any @nestjs or third-party packages are required
function preInitResolution() {
  const candidates = [
    '/var/task/apps/backend/node_modules',
    '/var/task/node_modules',
    resolve(process.cwd(), 'apps/backend/node_modules'),
    resolve(process.cwd(), 'node_modules'),
    resolve(__dirname, 'node_modules'),
    resolve(__dirname, '..', 'node_modules'),
    resolve(__dirname, '..', '..', 'node_modules'),
  ];

  for (const c of candidates) {
    try {
      if (existsSync(c) && !module.paths.includes(c)) {
        module.paths.unshift(c);
      }
    } catch {
      // Ignore read errors
    }
  }

  // Also check nested pnpm store if present in /var/task
  try {
    const pnpmStore = '/var/task/node_modules/.pnpm';
    if (existsSync(pnpmStore)) {
      const entries = readdirSync(pnpmStore);
      for (const entry of entries) {
        if (entry.includes('@nestjs+core')) {
          const nested = join(pnpmStore, entry, 'node_modules');
          if (existsSync(nested) && !module.paths.includes(nested)) {
            module.paths.unshift(nested);
          }
        }
      }
    }
  } catch {
    // Ignore
  }

  // Update NODE_PATH for child resolutions
  const existingNodePath = process.env.NODE_PATH || '';
  const additions = ['/var/task/apps/backend/node_modules', '/var/task/node_modules'];
  process.env.NODE_PATH = `${additions.join(':')}:${existingNodePath}`;

  try {
    (Module as any)._initPaths();
  } catch {
    // Ignore
  }
}

preInitResolution();
