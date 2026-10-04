import 'server-only';

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value || value.startsWith('replace-with-')) {
    throw new Error(`Missing or placeholder environment variable: ${name}`);
  }

  return value;
}

function integer(name: string, defaultValue: number, minimum: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`${name} must be an integer greater than or equal to ${minimum}`);
  }

  return parsed;
}

function boolean(name: string, defaultValue: boolean): boolean {
  const value = process.env[name]?.toLowerCase();
  if (!value) return defaultValue;
  if (value === 'true') return true;
  if (value === 'false') return false;

  throw new Error(`${name} must be "true" or "false"`);
}

const isProduction = process.env.NODE_ENV === 'production';
const mysqlSsl = boolean('MYSQL_SSL', isProduction);
const mongodbTls = boolean('MONGODB_TLS', isProduction);

if (isProduction && !mysqlSsl) {
  throw new Error('MYSQL_SSL must be true in production');
}

if (isProduction && !mongodbTls) {
  throw new Error('MONGODB_TLS must be true in production');
}

export const serverEnv = {
  mysql: {
    host: required('MYSQL_HOST'),
    port: integer('MYSQL_PORT', 3306, 1),
    database: required('MYSQL_DATABASE'),
    user: required('MYSQL_USER'),
    password: process.env.MYSQL_PASSWORD ?? '',
    ssl: mysqlSsl,
    connectionLimit: integer('MYSQL_CONNECTION_LIMIT', 10, 1),
    connectTimeout: integer('MYSQL_CONNECT_TIMEOUT_MS', 10_000, 1),
  },
  mongodb: {
    uri: required('MONGODB_URI'),
    tls: mongodbTls,
    maxPoolSize: integer('MONGODB_MAX_POOL_SIZE', 10, 1),
    serverSelectionTimeoutMS: integer('MONGODB_SERVER_SELECTION_TIMEOUT_MS', 10_000, 1),
    socketTimeoutMS: integer('MONGODB_SOCKET_TIMEOUT_MS', 45_000, 1),
  },
};

if (isProduction && !serverEnv.mysql.password) {
  throw new Error('MYSQL_PASSWORD is required in production');
}

if (!/^mongodb(?:\+srv)?:\/\//i.test(serverEnv.mongodb.uri)) {
  throw new Error('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme');
}

export function getJwtSecret(): string {
  const jwtSecret = required('JWT_SECRET');
  if (new TextEncoder().encode(jwtSecret).byteLength < 32) {
    throw new Error('JWT_SECRET must be at least 32 bytes');
  }
  return jwtSecret;
}

export function getGoogleOAuthEnv() {
  const appUrl = required('APP_URL').replace(/\/+$/, '');
  let parsedAppUrl: URL;
  try {
    parsedAppUrl = new URL(appUrl);
  } catch {
    throw new Error('APP_URL must be a valid absolute URL');
  }
  if (!['http:', 'https:'].includes(parsedAppUrl.protocol)) {
    throw new Error('APP_URL must use http or https');
  }
  if (isProduction && parsedAppUrl.protocol !== 'https:') {
    throw new Error('APP_URL must use HTTPS in production');
  }

  return {
    googleClientId: required('GOOGLE_CLIENT_ID'),
    googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
    appUrl,
  };
}

export function getB2Env() {
  const region = required('B2_REGION');
  if (!/^[a-z0-9-]+$/.test(region)) {
    throw new Error('B2_REGION must be a valid Backblaze B2 region name');
  }

  return {
    region,
    accessKeyId: required('B2_KEY_ID'),
    secretAccessKey: required('B2_APPLICATION_KEY'),
    bucket: required('B2_BUCKET_NAME'),
  };
}
