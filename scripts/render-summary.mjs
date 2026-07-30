import { readFile, stat, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const MAX_SUMMARY_BYTES = 10 * 1024 * 1024;

function number(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metric(metrics, name) {
  const value = metrics[name];
  return value && typeof value === 'object' ? value : {};
}

function markdownCell(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('|', '\\|')
    .replaceAll(/\r?\n/g, ' ');
}

function milliseconds(value) {
  const parsed = number(value);
  return parsed === null ? 'n/a' : `${parsed.toFixed(2)} ms`;
}

function decimal(value, suffix = '') {
  const parsed = number(value);
  return parsed === null ? 'n/a' : `${parsed.toFixed(2)}${suffix}`;
}

function integer(value) {
  const parsed = number(value);
  return parsed === null ? 'n/a' : Math.round(parsed).toString();
}

function thresholdRows(metrics) {
  const rows = [];

  for (const [metricName, values] of Object.entries(metrics)) {
    if (!values || typeof values !== 'object' || !values.thresholds) {
      continue;
    }

    for (const [expression, failed] of Object.entries(values.thresholds)) {
      if (typeof failed !== 'boolean') {
        continue;
      }

      rows.push({
        expression,
        failed,
        metricName,
      });
    }
  }

  return rows;
}

export function renderSummary(summary, metadata = process.env) {
  if (!summary || typeof summary !== 'object' || !summary.metrics) {
    throw new Error('Summary must contain a metrics object.');
  }

  const metrics = summary.metrics;
  const duration = metric(metrics, 'http_req_duration');
  const failedRequests = metric(metrics, 'http_req_failed');
  const requests = metric(metrics, 'http_reqs');
  const checks = metric(metrics, 'checks');
  const iterations = metric(metrics, 'iterations');
  const thresholds = thresholdRows(metrics);
  const failedThresholds = thresholds.filter((threshold) => threshold.failed);
  const gate =
    thresholds.length === 0
      ? '⚠️ No thresholds found'
      : failedThresholds.length === 0
        ? '✅ Performance budget passed'
        : '❌ Performance budget failed';

  const lines = [
    `## ${gate}`,
    '',
    '| Context | Value |',
    '| --- | --- |',
    `| Workload | ${markdownCell(metadata.WORKLOAD || 'unknown')} |`,
    `| Environment | ${markdownCell(metadata.ENVIRONMENT || 'unknown')} |`,
    `| Test ID | ${markdownCell(metadata.TEST_ID || 'unknown')} |`,
    `| Commit | ${markdownCell(metadata.GITHUB_SHA || 'local')} |`,
    '',
    '| Metric | Result |',
    '| --- | ---: |',
    `| p95 latency | ${milliseconds(duration['p(95)'])} |`,
    `| p99 latency | ${milliseconds(duration['p(99)'])} |`,
    `| Failed requests | ${decimal(number(failedRequests.value) === null ? null : failedRequests.value * 100, '%')} |`,
    `| Request rate | ${decimal(requests.rate, '/s')} |`,
    `| Successful checks | ${decimal(number(checks.value) === null ? null : checks.value * 100, '%')} |`,
    `| Requests | ${integer(requests.count)} |`,
    `| Iterations | ${integer(iterations.count)} |`,
    '',
    '| Threshold | Metric | Status |',
    '| --- | --- | --- |',
  ];

  if (thresholds.length === 0) {
    lines.push('| _none_ | _none_ | ⚠️ Missing |');
  } else {
    for (const threshold of thresholds.sort((left, right) =>
      `${left.metricName}:${left.expression}`.localeCompare(
        `${right.metricName}:${right.expression}`,
      ),
    )) {
      lines.push(
        `| \`${markdownCell(threshold.expression)}\` | \`${markdownCell(threshold.metricName)}\` | ${threshold.failed ? '❌ Failed' : '✅ Passed'} |`,
      );
    }
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  const inputPath = process.argv[2] || 'results/summary.json';
  const outputPath = process.argv[3] || 'results/summary.md';
  const inputStat = await stat(inputPath);

  if (inputStat.size > MAX_SUMMARY_BYTES) {
    throw new Error('Summary exceeds the 10 MiB processing limit.');
  }

  const summary = JSON.parse(await readFile(inputPath, 'utf8'));
  await writeFile(outputPath, renderSummary(summary), 'utf8');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
