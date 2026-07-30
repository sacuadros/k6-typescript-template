import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const mode = process.argv[2] || 'pass';
const expectedExitCode = mode === 'pass' ? 0 : 99;

if (!['pass', 'slow'].includes(mode)) {
  throw new Error('Demo mode must be pass or slow.');
}

const serverPath = fileURLToPath(
  new URL('../examples/demo-api/server.mjs', import.meta.url),
);

function waitForDemoUrl(child) {
  return new Promise((resolve, reject) => {
    let output = '';
    const timeout = setTimeout(() => {
      reject(new Error('Demo API did not become ready within 5 seconds.'));
    }, 5_000);

    child.once('error', reject);
    child.once('exit', (code) => {
      reject(new Error(`Demo API exited before readiness with code ${code}.`));
    });
    child.stdout.on('data', (chunk) => {
      const text = chunk.toString();
      process.stdout.write(text);
      output += text;

      if (output.length > 8_192) {
        reject(new Error('Demo API readiness output exceeded 8 KiB.'));
        return;
      }

      const match = output.match(/DEMO_API_URL=(http:\/\/127\.0\.0\.1:\d+)/);

      if (match) {
        clearTimeout(timeout);
        resolve(match[1]);
      }
    });
  });
}

function runK6(baseUrl) {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'k6',
      [
        'run',
        '-e',
        `BASE_URL=${baseUrl}`,
        '-e',
        'ENVIRONMENT=local',
        '-e',
        `TEST_ID=demo-${mode}`,
        'src/tests/smoke.ts',
      ],
      {
        env: process.env,
        stdio: 'inherit',
      },
    );

    child.once('error', reject);
    child.once('exit', (code) => resolve(code));
  });
}

const server = spawn(process.execPath, [serverPath], {
  env: {
    ...process.env,
    DEMO_MODE: mode,
  },
  stdio: ['ignore', 'pipe', 'inherit'],
});

try {
  const baseUrl = await waitForDemoUrl(server);
  const exitCode = await runK6(baseUrl);

  if (exitCode !== expectedExitCode) {
    throw new Error(
      `Expected k6 exit ${expectedExitCode} in ${mode} mode, received ${exitCode}.`,
    );
  }

  console.log(
    mode === 'pass'
      ? 'Demo passed as expected.'
      : 'Demo crossed the latency budget as expected.',
  );
} finally {
  if (server.exitCode === null) {
    server.kill('SIGTERM');
  }
}
