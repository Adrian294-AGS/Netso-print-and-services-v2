import { createServer } from 'node:http';
import { setServers } from 'node:dns';
import nextEnv from '@next/env';
import next from 'next';
import { jwtVerify } from 'jose';
import mysql from 'mysql2/promise';
import { WebSocket, WebSocketServer } from 'ws';

const hostname = '0.0.0.0';
const port = Number.parseInt(process.env.PORT || '3000', 10);
const development = process.env.NODE_ENV !== 'production';
const sessionCookieName = 'netso_session';
const validRoles = new Set([
  'customer',
  'lead_admin',
  'print_operator',
  'pre_press_artist',
  'front_desk_cashier',
]);

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd(), development);
const dnsServers = process.env.MONGODB_DNS_SERVERS?.split(',').map((server) => server.trim());
if (dnsServers) {
  if (dnsServers.some((server) => !server)) {
    throw new Error('MONGODB_DNS_SERVERS must be a comma-separated list of DNS server addresses.');
  }
  setServers(dnsServers);
}

if (!Number.isSafeInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be a valid TCP port.');
}

const app = next({ dev: development, hostname, port });
await app.prepare();
const handle = app.getRequestHandler();
const server = createServer((request, response) => handle(request, response));
const webSocketServer = new WebSocketServer({ noServer: true, maxPayload: 1024 });
const jwtSecret = process.env.JWT_SECRET?.trim();
if (!jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 bytes for WebSocket authentication.');
}

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  database: process.env.MYSQL_DATABASE,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD || '',
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONNECTION_LIMIT || 10),
  connectTimeout: Number(process.env.MYSQL_CONNECT_TIMEOUT_MS || 10000),
  enableKeepAlive: true,
  timezone: 'Z',
  supportBigNumbers: true,
  bigNumberStrings: true,
  ssl:
    String(process.env.MYSQL_SSL).toLowerCase() === 'true'
      ? { rejectUnauthorized: true }
      : undefined,
});

function getCookie(request, name) {
  const cookies = request.headers.cookie?.split(';') ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    return decodeURIComponent(cookie.slice(separator + 1).trim());
  }
  return null;
}

function writeUpgradeError(socket, status, message) {
  if (socket.destroyed) return;
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`,
  );
  socket.destroy();
}

async function authenticateSocket(request) {
  const origin = request.headers.origin;
  const host = request.headers.host;
  let parsedOrigin;
  try {
    parsedOrigin = origin ? new URL(origin) : null;
  } catch {
    return null;
  }
  if (
    !parsedOrigin ||
    !host ||
    parsedOrigin.host.toLowerCase() !== host.toLowerCase() ||
    !['http:', 'https:'].includes(parsedOrigin.protocol)
  ) {
    return null;
  }

  const token = getCookie(request, sessionCookieName);
  if (!token) return null;

  let payload;
  try {
    ({ payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret), {
      algorithms: ['HS256'],
      issuer: 'netso-prints',
      audience: 'netso-web',
    }));
  } catch {
    return null;
  }
  if (typeof payload.sub !== 'string' || typeof payload.role !== 'string' || !validRoles.has(payload.role)) {
    return null;
  }

  const [rows] = await pool.execute(
    'SELECT role, account_status FROM tbl_user WHERE UID = ? LIMIT 1',
    [payload.sub],
  );
  const account = rows[0];
  if (!account || account.account_status !== 'active' || account.role !== payload.role) {
    return null;
  }
  return { userId: payload.sub, role: account.role };
}

server.on('upgrade', (request, socket, head) => {
  let pathname;
  try {
    pathname = new URL(request.url || '/', `http://${request.headers.host}`).pathname;
  } catch {
    writeUpgradeError(socket, '400', 'Bad Request');
    return;
  }
  if (pathname !== '/realtime') {
    return;
  }

  void authenticateSocket(request)
    .then((principal) => {
      if (!principal) {
        writeUpgradeError(socket, '401', 'Unauthorized');
        return;
      }
      webSocketServer.handleUpgrade(request, socket, head, (client) => {
        client.userId = principal.userId;
        client.role = principal.role;
        client.isAlive = true;
        webSocketServer.emit('connection', client, request);
      });
    })
    .catch((error) => {
      console.error('WebSocket authentication failed:', error);
      writeUpgradeError(socket, '500', 'Internal Server Error');
    });
});

webSocketServer.on('connection', (client) => {
  client.on('pong', () => {
    client.isAlive = true;
  });
  client.on('message', () => {
    client.close(1008, 'Client messages are not supported.');
  });
});

globalThis.__NETSO_REALTIME_PUBLISH__ = (event) => {
  const frame = JSON.stringify({
    type: 'invalidate',
    topic: event.topic,
    orderId: event.orderId,
    notification: event.notification,
  });
  for (const client of webSocketServer.clients) {
    if (client.readyState !== WebSocket.OPEN) continue;
    const hasUserTargets = Boolean(event.targetUserIds?.length);
    const hasRoleTargets = Boolean(event.targetRoles?.length);
    if (
      (hasUserTargets || hasRoleTargets) &&
      !(
        (hasUserTargets && event.targetUserIds.includes(client.userId)) ||
        (hasRoleTargets && event.targetRoles.includes(client.role))
      )
    ) {
      continue;
    }
    client.send(frame);
  }
};

const heartbeat = setInterval(() => {
  for (const client of webSocketServer.clients) {
    if (!client.isAlive) {
      client.terminate();
      continue;
    }
    client.isAlive = false;
    client.ping();
  }
}, 30000);
heartbeat.unref();

const sessionCheck = setInterval(() => {
  for (const client of webSocketServer.clients) {
    void pool
      .execute('SELECT role, account_status FROM tbl_user WHERE UID = ? LIMIT 1', [client.userId])
      .then(([rows]) => {
        const account = rows[0];
        if (!account || account.account_status !== 'active' || account.role !== client.role) {
          client.close(1008, 'Session is no longer active.');
        }
      })
      .catch((error) => {
        console.error('WebSocket session revalidation failed:', error);
        client.close(1011, 'Unable to revalidate session.');
      });
  }
}, 60000);
sessionCheck.unref();

server.listen(port, hostname, () => {
  console.log(`> Netso listening on http://${hostname}:${port} with authenticated WebSockets`);
});

async function shutdown() {
  clearInterval(heartbeat);
  clearInterval(sessionCheck);
  for (const client of webSocketServer.clients) client.close(1001, 'Server shutting down.');
  await new Promise((resolve) => server.close(resolve));
  webSocketServer.close();
  await pool.end();
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
