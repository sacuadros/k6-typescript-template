# Contributing

Contributions are welcome when they keep the starter focused, safe by default and usable without proprietary infrastructure.

## Development workflow

1. Fork the repository and create a focused branch.
2. Install the pinned development dependencies with `npm ci`.
3. Make the smallest change that solves the current problem.
4. Update documentation when commands, inputs, profiles, safety rules or workflows change.
5. Run `npm run check`.
6. Open a pull request describing the behavior, motivation, risk and verification performed.

Run a real smoke test only against an authorized target:

```bash
BASE_URL=https://staging.example.com \
ENVIRONMENT=staging \
npm run test:smoke
```

Do not run average-load or stress merely to validate a contribution. `k6 inspect` and the existing CI checks cover their initialization without generating traffic.

## Project conventions

- Keep k6 entrypoints in `src/tests/`.
- Keep reusable virtual-user behavior in `src/scenarios/`.
- Keep workload options and thresholds in `src/profiles.ts`.
- Keep environment validation and load authorization in `src/config.ts`.
- Use explicit relative `.ts` imports; k6 runs TypeScript directly.
- Give requests bounded, stable names. Never use IDs, timestamps or full dynamic URLs as metric tags.
- Add every new entrypoint to `npm run test:inspect`.

Do not add a bundler, custom runner, framework, remote JavaScript module or package without demonstrating that native k6 and the existing code cannot solve the requirement.

## Safety requirements

Every workload that can generate meaningful traffic must:

- require an explicit target;
- fail closed without deliberate authorization;
- remain outside pull-request execution;
- document its expected load and intended environment;
- avoid secrets and sensitive payloads in source, URLs, tags, logs and artifacts.

Production stress must retain the second `ALLOW_PRODUCTION_LOAD=true` gate.

## Pull requests

Keep pull requests scoped. Include:

- what changed and why;
- user or developer impact;
- local checks executed;
- runtime evidence, if an authorized target was used;
- remaining risks or unverified remote behavior.

Security vulnerabilities must follow [`SECURITY.md`](SECURITY.md), not public issues.
