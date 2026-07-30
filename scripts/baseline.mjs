import { readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MAX_SUMMARY_BYTES = 10 * 1024 * 1024;
const MAX_BASELINE_BYTES = 1024 * 1024;

function number(value, name, minimum, maximum) {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}.`);
  }

  return value;
}

function metadataValue(metadata, name) {
  const value = metadata[name];

  if (!value || !/^[A-Za-z0-9._-]{1,64}$/.test(value)) {
    throw new Error(`${name} must be a bounded stable identifier.`);
  }

  return value;
}

function extractMetrics(summary) {
  if (!summary || typeof summary !== 'object' || !summary.metrics) {
    throw new Error('Summary must contain a metrics object.');
  }

  return {
    failedRate: number(
      summary.metrics.http_req_failed?.value,
      'http_req_failed.value',
      0,
      1,
    ),
    p95Ms: number(
      summary.metrics.http_req_duration?.['p(95)'],
      'http_req_duration.p(95)',
      0,
      Number.MAX_SAFE_INTEGER,
    ),
    requestRate: number(
      summary.metrics.http_reqs?.rate,
      'http_reqs.rate',
      Number.EPSILON,
      Number.MAX_SAFE_INTEGER,
    ),
  };
}

export function createBaseline(summary, metadata = process.env) {
  const metrics = extractMetrics(summary);

  return {
    environment: metadataValue(metadata, 'ENVIRONMENT'),
    metrics: {
      failedRate: {
        maxIncreaseAbsolute: 0.005,
        value: metrics.failedRate,
      },
      p95Ms: {
        maxIncreasePercent: 20,
        value: metrics.p95Ms,
      },
      requestRate: {
        maxDecreasePercent: 20,
        value: metrics.requestRate,
      },
    },
    schemaVersion: 1,
    workload: metadataValue(metadata, 'WORKLOAD'),
  };
}

function validateBaseline(baseline) {
  if (
    !baseline ||
    typeof baseline !== 'object' ||
    baseline.schemaVersion !== 1
  ) {
    throw new Error('Baseline schemaVersion must be 1.');
  }

  const environment = metadataValue(baseline, 'environment');
  const workload = metadataValue(baseline, 'workload');
  const metrics = baseline.metrics;

  if (!metrics || typeof metrics !== 'object') {
    throw new Error('Baseline must contain metrics.');
  }

  return {
    environment,
    failedRate: {
      maxIncreaseAbsolute: number(
        metrics.failedRate?.maxIncreaseAbsolute,
        'failedRate.maxIncreaseAbsolute',
        0,
        1,
      ),
      value: number(metrics.failedRate?.value, 'failedRate.value', 0, 1),
    },
    p95Ms: {
      maxIncreasePercent: number(
        metrics.p95Ms?.maxIncreasePercent,
        'p95Ms.maxIncreasePercent',
        0,
        1000,
      ),
      value: number(
        metrics.p95Ms?.value,
        'p95Ms.value',
        0,
        Number.MAX_SAFE_INTEGER,
      ),
    },
    requestRate: {
      maxDecreasePercent: number(
        metrics.requestRate?.maxDecreasePercent,
        'requestRate.maxDecreasePercent',
        0,
        100,
      ),
      value: number(
        metrics.requestRate?.value,
        'requestRate.value',
        Number.EPSILON,
        Number.MAX_SAFE_INTEGER,
      ),
    },
    workload,
  };
}

function row(metric, current, limit, unit, passed) {
  return `| ${metric} | ${current.toFixed(3)}${unit} | ${limit.toFixed(3)}${unit} | ${passed ? '✅ Passed' : '❌ Regressed'} |`;
}

export function compareBaseline(summary, baseline, metadata = process.env) {
  const current = extractMetrics(summary);
  const expected = validateBaseline(baseline);
  const environment = metadataValue(metadata, 'ENVIRONMENT');
  const workload = metadataValue(metadata, 'WORKLOAD');

  if (environment !== expected.environment || workload !== expected.workload) {
    throw new Error(
      `Baseline targets ${expected.environment}/${expected.workload}, received ${environment}/${workload}.`,
    );
  }

  const p95Limit =
    expected.p95Ms.value * (1 + expected.p95Ms.maxIncreasePercent / 100);
  const failedRateLimit = Math.min(
    1,
    expected.failedRate.value + expected.failedRate.maxIncreaseAbsolute,
  );
  const requestRateMinimum =
    expected.requestRate.value *
    (1 - expected.requestRate.maxDecreasePercent / 100);
  const results = [
    {
      current: current.p95Ms,
      limit: p95Limit,
      metric: 'p95 latency',
      passed: current.p95Ms <= p95Limit,
      unit: ' ms',
    },
    {
      current: current.failedRate * 100,
      limit: failedRateLimit * 100,
      metric: 'failed requests',
      passed: current.failedRate <= failedRateLimit,
      unit: '%',
    },
    {
      current: current.requestRate,
      limit: requestRateMinimum,
      metric: 'request rate minimum',
      passed: current.requestRate >= requestRateMinimum,
      unit: '/s',
    },
  ];
  const regressed = results.some((result) => !result.passed);
  const markdown = [
    `## ${regressed ? '❌ Performance regression detected' : '✅ No performance regression detected'}`,
    '',
    `Baseline: \`${environment}/${workload}\``,
    '',
    '| Metric | Current | Allowed limit | Status |',
    '| --- | ---: | ---: | --- |',
    ...results.map((result) =>
      row(
        result.metric,
        result.current,
        result.limit,
        result.unit,
        result.passed,
      ),
    ),
    '',
  ].join('\n');

  return { markdown, regressed };
}

async function readJson(path, maximumBytes, name) {
  const fileStat = await stat(path);

  if (fileStat.size > maximumBytes) {
    throw new Error(`${name} exceeds its processing limit.`);
  }

  return JSON.parse(await readFile(path, 'utf8'));
}

async function main() {
  const [command, summaryPath, baselinePath, reportPath] =
    process.argv.slice(2);

  if (command === 'create' && summaryPath && baselinePath && !reportPath) {
    const summary = await readJson(summaryPath, MAX_SUMMARY_BYTES, 'Summary');
    const baseline = createBaseline(summary);
    await writeFile(
      baselinePath,
      `${JSON.stringify(baseline, null, 2)}\n`,
      'utf8',
    );
    return;
  }

  if (command === 'compare' && summaryPath && baselinePath && reportPath) {
    const [summary, baseline] = await Promise.all([
      readJson(summaryPath, MAX_SUMMARY_BYTES, 'Summary'),
      readJson(baselinePath, MAX_BASELINE_BYTES, 'Baseline'),
    ]);
    const comparison = compareBaseline(summary, baseline);
    await writeFile(reportPath, comparison.markdown, 'utf8');

    if (comparison.regressed) {
      process.exitCode = 1;
    }

    return;
  }

  throw new Error(
    'Usage: baseline.mjs create <summary.json> <baseline.json> OR compare <summary.json> <baseline.json> <report.md>',
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
