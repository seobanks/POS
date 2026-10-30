import { NestExpressApplication } from '@nestjs/platform-express';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AppModule } from './app.module';
import { uploadsDir } from './common/upload/image-upload.config';

// Known example/placeholder secrets that appear verbatim in this repo's own
// .env.example, docker-compose.yml, and the CasaOS/ZimaOS app-store
// manifest (casaos/docker-compose.yml) ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â that manifest hardcodes a literal
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

// Where a self-generated secret is persisted so it survives container
// restarts/recreates ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â a dedicated volume, deliberately NOT under
// UPLOADS_DIR (that directory is served as static files at /api/uploads/,
// see below; a secret has no business living anywhere web-servable even
// if today's static middleware happens to ignore dotfiles).
import { tmpdir } from 'node:os';

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
        `JWT_SECRET was not set (or was a known placeholder) Ã¢â‚¬â€ generated a random one and saved it to ${JWT_SECRET_STATE_FILE}. ` +
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

export async function bootstrap(): Promise<NestExpressApplication> {
  if (cachedApp) {
    return cachedApp;
  }

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
  await app.listen(port);
  console.log(
    `Hanva Fine Dine API listening on :${port} (docs at /api/docs)`,
  );
  cachedApp = app;
  return app;
}

// Serverless handler export (used by Vercel Functions)
export default async function handler(req: any, res: any) {
  const app = await bootstrap();
  const server = app.getHttpAdapter().getInstance();
  return server(req, res);
}

void bootstrap();
