import http from 'node:http';

const modes = new Set(['pass', 'slow', 'error']);
const mode = process.env.DEMO_MODE || 'pass';

if (!modes.has(mode)) {
  throw new Error('DEMO_MODE must be pass, slow or error.');
}

function send(response, status, body) {
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-length': Buffer.byteLength(body),
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(body);
}

const server = http.createServer((request, response) => {
  if (request.method !== 'GET') {
    send(response, 405, '{"error":"method_not_allowed"}');
    return;
  }

  if (request.url === '/health') {
    send(response, 200, '{"status":"ok"}');
    return;
  }

  if (request.url !== '/') {
    send(response, 404, '{"error":"not_found"}');
    return;
  }

  const delayMs = mode === 'slow' ? 650 : 20;
  const status = mode === 'error' ? 503 : 200;
  const body =
    status === 200 ? `{"mode":"${mode}"}` : '{"error":"demo_unavailable"}';

  setTimeout(() => send(response, status, body), delayMs);
});

server.headersTimeout = 5_000;
server.keepAliveTimeout = 1_000;
server.maxRequestsPerSocket = 100;
server.requestTimeout = 5_000;

server.listen(0, '127.0.0.1', () => {
  const address = server.address();

  if (!address || typeof address === 'string') {
    throw new Error('Demo API did not bind to a TCP port.');
  }

  console.log(`DEMO_API_URL=http://127.0.0.1:${address.port}`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
