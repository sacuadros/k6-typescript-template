import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_OPENAPI_BYTES = 10 * 1024 * 1024;
const MAX_ROUTES_BYTES = 1024 * 1024;
const MAX_OPERATIONS = 2_000;
const MAX_DETAIL_ROWS = 500;
const METHODS = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'query',
  'trace',
]);

function markdown(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('`', '&#96;')
    .replaceAll('|', '\\|')
    .replaceAll(/\r?\n/g, ' ');
}

function identifier(value, name) {
  if (
    typeof value !== 'string' ||
    value.length === 0 ||
    value.length > 256 ||
    value.trim() !== value ||
    /[\u0000-\u001f\u007f]/.test(value)
  ) {
    throw new Error(`${name} must be a bounded non-empty string.`);
  }

  return value;
}

function operationsFrom(document) {
  if (
    !document ||
    typeof document !== 'object' ||
    typeof document.openapi !== 'string' ||
    !document.openapi.startsWith('3.') ||
    !document.paths ||
    typeof document.paths !== 'object' ||
    Array.isArray(document.paths)
  ) {
    throw new Error(
      'OpenAPI input must be a version 3 JSON document with paths.',
    );
  }

  const operations = [];
  const operationIds = new Set();

  for (const [path, pathItem] of Object.entries(document.paths)) {
    if (
      typeof path !== 'string' ||
      !path.startsWith('/') ||
      path.length > 2_048 ||
      /\s/.test(path) ||
      !pathItem ||
      typeof pathItem !== 'object' ||
      Array.isArray(pathItem)
    ) {
      throw new Error(
        'Each OpenAPI path must contain a valid Path Item object.',
      );
    }

    for (const [method, operation] of Object.entries(pathItem)) {
      if (!METHODS.has(method)) {
        continue;
      }

      if (
        !operation ||
        typeof operation !== 'object' ||
        Array.isArray(operation)
      ) {
        throw new Error(
          `OpenAPI operation ${method.toUpperCase()} ${path} is invalid.`,
        );
      }

      const operationId =
        operation.operationId === undefined
          ? undefined
          : identifier(
              operation.operationId,
              `operationId for ${method.toUpperCase()} ${path}`,
            );

      if (operationId && operationIds.has(operationId)) {
        throw new Error(`OpenAPI operationId must be unique: ${operationId}.`);
      }

      if (operationId) {
        operationIds.add(operationId);
      }

      operations.push({
        key: `${method.toUpperCase()} ${path}`,
        method: method.toUpperCase(),
        operationId,
        path,
      });

      if (operations.length > MAX_OPERATIONS) {
        throw new Error(
          `OpenAPI input supports at most ${MAX_OPERATIONS} operations.`,
        );
      }
    }
  }

  if (operations.length === 0) {
    throw new Error('OpenAPI input must define at least one operation.');
  }

  return operations;
}

function routesFrom(value) {
  if (!Array.isArray(value) || value.length === 0 || value.length > 100) {
    throw new Error('Routes input must contain between 1 and 100 routes.');
  }

  const keys = new Set();
  const operationIds = new Set();

  return value.map((route, index) => {
    if (
      !route ||
      typeof route !== 'object' ||
      route.method !== 'GET' ||
      typeof route.path !== 'string' ||
      !route.path.startsWith('/') ||
      route.path.startsWith('//') ||
      route.path.length > 2_048 ||
      /\s/.test(route.path)
    ) {
      throw new Error(
        `Route ${index + 1} must contain a valid GET method and path.`,
      );
    }

    const operationId =
      route.operationId === undefined
        ? undefined
        : identifier(route.operationId, `operationId for route ${index + 1}`);
    const key = `${route.method} ${route.path}`;

    if (keys.has(key)) {
      throw new Error(`Route method and path must be unique: ${key}.`);
    }

    if (operationId && operationIds.has(operationId)) {
      throw new Error(`Route operationId must be unique: ${operationId}.`);
    }

    keys.add(key);
    if (operationId) {
      operationIds.add(operationId);
    }

    return { key, method: route.method, operationId, path: route.path };
  });
}

export function calculateOpenApiCoverage(document, routeData, minimum = 100) {
  if (
    typeof minimum !== 'number' ||
    !Number.isFinite(minimum) ||
    minimum < 0 ||
    minimum > 100
  ) {
    throw new Error('Minimum coverage must be between 0 and 100.');
  }

  const operations = operationsFrom(document);
  const routes = routesFrom(routeData);
  const supportedOperations = operations.filter(
    (operation) => operation.method === 'GET',
  );
  const excluded = operations.filter((operation) => operation.method !== 'GET');

  if (supportedOperations.length === 0) {
    throw new Error('OpenAPI input must define at least one GET operation.');
  }

  const operationById = new Map(
    supportedOperations
      .filter((operation) => operation.operationId)
      .map((operation) => [operation.operationId, operation]),
  );
  const operationByKey = new Map(
    supportedOperations.map((operation) => [operation.key, operation]),
  );
  const coveredKeys = new Set();
  const unmatchedRoutes = [];

  for (const route of routes) {
    const operation = route.operationId
      ? operationById.get(route.operationId)
      : operationByKey.get(route.key);

    if (!operation || operation.method !== route.method) {
      unmatchedRoutes.push(route);
      continue;
    }

    coveredKeys.add(operation.key);
  }

  const covered = supportedOperations.filter((operation) =>
    coveredKeys.has(operation.key),
  );
  const missing = supportedOperations.filter(
    (operation) => !coveredKeys.has(operation.key),
  );
  const percentage = (covered.length / supportedOperations.length) * 100;
  const passed = percentage >= minimum;
  const detailRows = [
    ...covered.map((operation) => ({ operation, status: '✅ Covered' })),
    ...missing.map((operation) => ({ operation, status: '❌ Missing' })),
  ];
  const lines = [
    `## ${passed ? '✅' : '❌'} OpenAPI GET performance coverage: ${percentage.toFixed(2)}%`,
    '',
    `Required: **${minimum.toFixed(2)}%** · Covered: **${covered.length}/${supportedOperations.length}** · Unmatched routes: **${unmatchedRoutes.length}** · Excluded non-GET operations: **${excluded.length}**`,
    '',
    '| Operation | operationId | Status |',
    '| --- | --- | --- |',
    ...detailRows
      .slice(0, MAX_DETAIL_ROWS)
      .map(
        ({ operation, status }) =>
          `| \`${markdown(operation.key)}\` | ${operation.operationId ? `\`${markdown(operation.operationId)}\`` : '_none_'} | ${status} |`,
      ),
  ];

  if (detailRows.length > MAX_DETAIL_ROWS) {
    lines.push(
      `| _${detailRows.length - MAX_DETAIL_ROWS} additional operations omitted_ |  |  |`,
    );
  }

  if (unmatchedRoutes.length > 0) {
    lines.push(
      '',
      '### Unmatched test routes',
      '',
      ...unmatchedRoutes.map(
        (route) =>
          `- \`${markdown(route.key)}\`${route.operationId ? ` (\`${markdown(route.operationId)}\`)` : ''}`,
      ),
    );
  }

  return {
    covered,
    excluded,
    markdown: `${lines.join('\n')}\n`,
    missing,
    passed,
    percentage,
    unmatchedRoutes,
  };
}

async function readJson(path, maximumBytes, name) {
  const fileStat = await stat(path);

  if (fileStat.size > maximumBytes) {
    throw new Error(`${name} exceeds its processing limit.`);
  }

  return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
  const [openApiPath, routesPath, reportPath, minimumValue = '100'] =
    process.argv.slice(2);
  const minimum = Number(minimumValue);

  if (
    !openApiPath ||
    !routesPath ||
    !reportPath ||
    minimumValue.trim() === ''
  ) {
    throw new Error(
      'Usage: openapi-coverage.mjs <openapi.json> <routes.json> <report.md> [minimum-percent]',
    );
  }

  const [document, routes] = await Promise.all([
    readJson(openApiPath, MAX_OPENAPI_BYTES, 'OpenAPI document'),
    readJson(routesPath, MAX_ROUTES_BYTES, 'Routes document'),
  ]);
  const coverage = calculateOpenApiCoverage(document, routes, minimum);
  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, coverage.markdown, 'utf8');

  if (!coverage.passed) {
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
