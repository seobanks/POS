import { tmpdir } from 'node:os';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { NestExpressApplication } from '@nestjs/platform-express';

function uploadsDir(): string {
  const dir = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');
  try {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    return dir;
  } catch {
    const fallback = join(tmpdir(), 'nodedr-uploads');
    if (!existsSync(fallback)) {
      try {
        mkdirSync(fallback, { recursive: true });
      } catch {
        // ignore
      }
    }
    return fallback;
  }
}

// Self-healing module resolution for Vercel Serverless / Monorepo containers
function registerCandidateModulePaths() {
  const candidates = [
    resolve(process.cwd(), 'node_modules'),
    resolve(process.cwd(), '..', 'node_modules'),
    resolve(process.cwd(), '..', '..', 'node_modules'),
    resolve(__dirname, 'node_modules'),
    resolve(__dirname, '..', 'node_modules'),
    resolve(__dirname, '..', '..', 'node_modules'),
    resolve('/var/task/node_modules'),
    resolve('/var/task/apps/backend/node_modules'),
    resolve('/var/task/../../node_modules'),
  ];
  for (const c of candidates) {
    if (existsSync(c) && !module.paths.includes(c)) {
      module.paths.unshift(c);
    }
  }

  // Search /var/task for nested pnpm node_modules if present
  try {
    const varTask = '/var/task';
    if (existsSync(varTask)) {
      const pnpmStore = join(varTask, 'node_modules', '.pnpm');
      if (existsSync(pnpmStore)) {
        const pnpmEntries = readdirSync(pnpmStore);
        for (const entry of pnpmEntries) {
          if (entry.includes('@nestjs+core')) {
            const nested = join(pnpmStore, entry, 'node_modules');
            if (existsSync(nested) && !module.paths.includes(nested)) {
              module.paths.unshift(nested);
            }
          }
        }
      }
    }
  } catch {
    // Ignore
  }
}

// Known example/placeholder secrets that appear verbatim in this repo's own
// .env.example, docker-compose.yml, and the CasaOS/ZimaOS app-store
// manifest (casaos/docker-compose.yml) — that manifest hardcodes a literal
// default value (CasaOS app-store installers pre-fill it and many
// non-technical self-hosters click through without changing it) rather
// than failing loudly the way `${JWT_SECRET:?...}` does in the main
// docker-compose.yml. This is a defense-in-depth backstop that applies to
// every deployment path, not just CasaOS: refuse to issue/verify sessions
// signed with a known-public or too-short secret instead of silently
// running with one an attacker can read directly from the public repo.
const KNOWN_PLACEHOLDER_JWT_SECRETS = new Set([
  'please-change-this-to-a-long-random-string',
  'change-me-to-a-long-random-string',
  'change-me',
  'changeme',
  'secret',
  'your-secret-here',
]);
const MIN_JWT_SECRET_LENGTH = 32;

function isUsableSecret(secret: string): boolean {
  return (
    secret.length >= MIN_JWT_SECRET_LENGTH &&
    !KNOWN_PLACEHOLDER_JWT_SECRETS.has(secret.toLowerCase())
  );
}

const JWT_SECRET_STATE_FILE =
  process.env.JWT_SECRET_STATE_FILE ??
  (existsSync('/data/state')
    ? '/data/state/jwt-secret'
    : join(tmpdir(), 'jwt-secret'));

function resolveJwtSecret(): string {
  const envSecret = (process.env.JWT_SECRET ?? '').trim();
  if (isUsableSecret(envSecret)) {
    return envSecret;
  }

  try {
    if (existsSync(JWT_SECRET_STATE_FILE)) {
      const persisted = readFileSync(JWT_SECRET_STATE_FILE, 'utf8').trim();
      if (isUsableSecret(persisted)) {
        return persisted;
      }
    }
    const generated = randomBytes(32).toString('hex');
    try {
      mkdirSync(dirname(JWT_SECRET_STATE_FILE), { recursive: true });
      writeFileSync(JWT_SECRET_STATE_FILE, generated, { mode: 0o600 });
      console.warn(
        `JWT_SECRET was not set (or was a known placeholder) — generated a random one and saved it to ${JWT_SECRET_STATE_FILE}. ` +
          'It will be reused on every restart, so existing sessions stay valid. Set JWT_SECRET explicitly instead if you manage this deployment by hand.',
      );
    } catch {
      // Ephemeral / serverless environment where disk write is prohibited
      console.warn('JWT_SECRET generated in-memory for serverless invocation.');
    }
    return generated;
  } catch (err) {
    console.warn(`JWT_SECRET fallback to in-memory random secret: ${err instanceof Error ? err.message : String(err)}`);
    return randomBytes(32).toString('hex');
  }
}

let cachedApp: NestExpressApplication | null = null;
let bootstrapError: any = null;

export async function bootstrap(): Promise<NestExpressApplication> {
  if (cachedApp) {
    return cachedApp;
  }

  registerCandidateModulePaths();

  // Dynamic imports so top-level evaluation does not crash before diagnostic handlers can run
  const { NestFactory } = await import('@nestjs/core');
  const { AppModule } = await import('./app.module.js');
  const { DocumentBuilder, SwaggerModule } = await import('@nestjs/swagger');
  const cookieParser = (await import('cookie-parser')).default;
  const helmet = (await import('helmet')).default;

  process.env.JWT_SECRET = resolveJwtSecret();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(cookieParser());
  const corsOrigin = process.env.CORS_ORIGIN;
  app.enableCors({
    origin: corsOrigin
      ? corsOrigin.includes(',')
        ? corsOrigin.split(',').map((o) => o.trim())
        : corsOrigin
      : true,
    credentials: true,
  });
  app.setGlobalPrefix('api');
  try {
    app.useStaticAssets(uploadsDir(), { prefix: '/api/uploads/' });
  } catch (err) {
    console.warn('Static assets init skipped:', err);
  }

  if (
    process.env.NODE_ENV !== 'production' ||
    process.env.ENABLE_SWAGGER === 'true'
  ) {
    const config = new DocumentBuilder()
      .setTitle('Hanva Fine Dine API')
      .setDescription('REST API for Hanva Fine Dine management system')
      .setVersion('1.0')
      .addCookieAuth('nodedr_session')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  if (!process.env.VERCEL) {
    await app.listen(port);
    console.log(
      `Hanva Fine Dine API listening on :${port} (docs at /api/docs)`,
    );
  } else {
    await app.init();
  }

  cachedApp = app;
  return app;
}

function buildDebugReport(err?: any) {
  const safeEnv: Record<string, any> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (k.includes('SECRET') || k.includes('PASSWORD') || k.includes('KEY')) {
      safeEnv[k] = v ? `Set (${v.length} chars)` : 'Empty';
    } else if (k.includes('URL') || k.includes('DATABASE')) {
      safeEnv[k] = v ? `${v.substring(0, 16)}...` : 'Empty';
    } else {
      safeEnv[k] = v;
    }
  }

  const listSafeDir = (p: string) => {
    try {
      return existsSync(p) ? readdirSync(p).slice(0, 40) : null;
    } catch (e) {
      return `Error: ${e instanceof Error ? e.message : String(e)}`;
    }
  };

  return {
    timestamp: new Date().toISOString(),
    status: err ? 'BOOTSTRAP_ERROR' : 'OK',
    error: err
      ? {
          name: err.name,
          message: err.message,
          code: err.code,
          stack: err.stack,
        }
      : null,
    runtime: {
      node: process.version,
      platform: process.platform,
      arch: process.arch,
      pid: process.pid,
      cwd: process.cwd(),
      dirname: __dirname,
      modulePaths: module.paths,
    },
    env: safeEnv,
    filesystem: {
      cwd_files: listSafeDir(process.cwd()),
      dirname_files: listSafeDir(__dirname),
      var_task_files: listSafeDir('/var/task'),
      var_task_src_files: listSafeDir('/var/task/src'),
      var_task_nm_files: listSafeDir('/var/task/node_modules'),
      var_task_backend_nm_files: listSafeDir('/var/task/apps/backend/node_modules'),
    },
  };
}

// Serverless handler export (used by Vercel Functions)
export default async function handler(req: any, res: any) {
  const url = req.url || '';
  if (url.includes('/debug') || url.includes('/api/debug')) {
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify(buildDebugReport(bootstrapError), null, 2));
    return;
  }

  try {
    const app = await bootstrap();
    const server = app.getHttpAdapter().getInstance();
    return server(req, res);
  } catch (err: any) {
    bootstrapError = err;
    console.error('Hanva API bootstrap failed:', err);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 500;
    res.end(JSON.stringify(buildDebugReport(err), null, 2));
  }
}

// Standalone Server (Docker / Local Dev)
if (!process.env.VERCEL) {
  void bootstrap().catch((err) => {
    console.error('Fatal bootstrap failure in standalone mode:', err);
  });
}
