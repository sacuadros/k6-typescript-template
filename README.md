# k6 Continuous Performance Starter

[![CI](https://github.com/sacuadros/k6-typescript-template/actions/workflows/ci.yml/badge.svg)](https://github.com/sacuadros/k6-typescript-template/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

An opinionated, dependency-light starting point for turning a first [k6](https://grafana.com/docs/k6/latest/) script into a safe and maintainable API performance test suite.

k6 runs TypeScript directly. This project deliberately has no bundler, custom runner, framework, or mandatory cloud service.

## What this solves

- Separates reusable user behavior from workload configuration.
- Provides smoke, average-load, and stress profiles with explicit safety gates.
- Encodes performance expectations as thresholds that can fail CI.
- Loads bounded route data once with `SharedArray`.
- Demonstrates bearer authentication through redacted k6 secret sources.
- Supports optional native OpenTelemetry export.
- Uses stable tags for filtering and observability.
- Keeps pull-request checks non-destructive.

This repository does not try to replace `k6 new`, k6 Studio, or Grafana Cloud. It starts where generated scripts usually stop: organizing tests for repeated team use.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) 2.1 or newer

## Quick start

```bash
git clone https://github.com/sacuadros/k6-typescript-template.git
cd k6-typescript-template
npm ci
npm run check
npm run test:smoke
```

The smoke profile performs one iteration against Grafana's public test site by default. Redirects may produce more than one HTTP request. To target a system you own or are authorized to test:

```bash
BASE_URL=https://staging.example.com \
ENVIRONMENT=staging \
npm run test:smoke
```

## Workload profiles

| Profile        | Default load                    | Safety rule                                      |
| -------------- | ------------------------------- | ------------------------------------------------ |
| `smoke`        | 1 VU, 1 iteration               | Safe default; may use the public demo target     |
| `average-load` | 10 VUs for 1 minute             | Requires `BASE_URL` and `ALLOW_LOAD_TEST=true`   |
| `stress`       | Ramps from 0 to 25 VUs and back | Also blocks production without a second override |

Run average load intentionally:

```bash
BASE_URL=https://staging.example.com \
ENVIRONMENT=staging \
ALLOW_LOAD_TEST=true \
TEST_ID=checkout-baseline \
npm run test:average-load
```

Run stress against staging:

```bash
BASE_URL=https://staging.example.com \
ENVIRONMENT=staging \
ALLOW_LOAD_TEST=true \
npm run test:stress
```

Stress against `ENVIRONMENT=production` is rejected unless `ALLOW_PRODUCTION_LOAD=true` is also set. That override is intentionally verbose: use it only with explicit authorization and an agreed test window.

Before average-load or stress starts, `setup()` performs one preflight request. A failing target aborts the test before virtual users generate load.

## Test data

[`src/data/routes.json`](src/data/routes.json) contains the bounded routes used by virtual users:

```json
[
  {
    "name": "GET root",
    "path": "/"
  }
]
```

k6 loads this file once with `SharedArray` and selects entries deterministically from the VU and iteration numbers. Add only routes valid for your target. Keep `name` stable and never put IDs, timestamps, credentials, or unbounded values in it.

## Authenticated smoke

The authenticated example obtains a bearer token from `k6/secrets`. Secret values are not stored in the repository or passed through `__ENV`.

Create an ignored local file:

```bash
printf 'auth-token=replace-me\n' > .env.k6-secrets
```

Then run:

```bash
k6 run \
  --secret-source=file=.env.k6-secrets \
  -e AUTH_SECRET_NAME=auth-token \
  -e BASE_URL=https://staging.example.com \
  -e ENVIRONMENT=staging \
  src/tests/authenticated-smoke.ts
```

The file source is suitable for local development. In CI, connect an appropriate k6 secret source instead of committing a secret file.

## Configuration contract

| Variable                | Purpose                                                    |
| ----------------------- | ---------------------------------------------------------- |
| `BASE_URL`              | Absolute target URL; required outside the demo smoke test  |
| `ENVIRONMENT`           | `demo`, `local`, `staging`, or `production`                |
| `TEST_ID`               | Stable identifier added to result tags                     |
| `AUTH_SECRET_NAME`      | Secret-source key used by the authenticated smoke test     |
| `ALLOW_LOAD_TEST`       | Must be `true` for average-load and stress                 |
| `ALLOW_PRODUCTION_LOAD` | Additional explicit approval for stress against production |

Do not commit secrets or production URLs, and do not place credentials inside `BASE_URL`. Add authentication with k6 secret sources or environment-specific CI secrets, and never write credentials to logs or result artifacts.

## Project structure

```text
src/
├── config.ts                 # Environment contract and safety gates
├── data/
│   ├── routes.json           # Bounded parameterization data
│   └── routes.ts             # SharedArray loader and selection
├── profiles.ts               # Workloads, thresholds, and common tags
├── scenarios/
│   ├── authenticated-target.ts
│   └── target.ts             # Virtual-user behavior and preflight
└── tests/
    ├── authenticated-smoke.ts
    ├── average-load.ts       # Expected-load entry point
    ├── smoke.ts              # Pull-request-safe entry point
    └── stress.ts             # Deliberate stress entry point
```

Add a test by creating or reusing a function in `src/scenarios/`, then compose it with one workload in `src/tests/`. Keep each entry point focused on one purpose.

See [`docs/architecture.md`](docs/architecture.md) for the execution flow, design boundaries and extension rules.

## Performance contract

Every profile currently enforces:

- more than 99% successful checks;
- less than 1% failed HTTP requests;
- p95 HTTP duration below 500 ms.

These values are examples, not universal SLOs. Replace them with expectations agreed for the target system before treating a load result as a release decision.

Requests use stable `name` and `scenario` tags. Do not put IDs, UUIDs, timestamps, or other unbounded values in metric tags.

## Commands

| Command                     | Purpose                                                |
| --------------------------- | ------------------------------------------------------ |
| `npm run check`             | Run formatting, TypeScript, and k6 inspection checks   |
| `npm run format`            | Format project files                                   |
| `npm run format:check`      | Verify formatting without changing files               |
| `npm run typecheck`         | Run strict TypeScript checking                         |
| `npm run test:inspect`      | Inspect every entry point without sending HTTP traffic |
| `npm run test:smoke`        | Execute the safe smoke profile                         |
| `npm run test:average-load` | Execute expected load after explicit opt-in            |
| `npm run test:stress`       | Execute the stress profile after explicit opt-in       |

## CI policy

Pull requests and branch pushes run static checks and `k6 inspect`. CI also verifies that load profiles refuse to initialize without their safety flags. It does not generate meaningful traffic against external systems.

The **Manual load test** workflow accepts a controlled target, environment and workload through `workflow_dispatch`. It validates the suite, runs the selected profile and retains `summary.json` for 14 days. Stress against production requires the additional boolean approval. OpenTelemetry is enabled when the `K6_OTEL_GRPC_EXPORTER_ENDPOINT` secret exists.

Workflow inputs and result artifacts may be visible to repository collaborators. Do not place credentials or sensitive payloads in the target URL, route data, tags, test ID or results.

## Scheduled smoke

The scheduled workflow runs at 08:17, Monday through Friday, in `America/Bogota`. It remains skipped until explicitly enabled, so publishing this template cannot generate traffic by itself.

Configure these GitHub Actions values:

| Type     | Name                             | Required | Purpose                                    |
| -------- | -------------------------------- | -------- | ------------------------------------------ |
| Variable | `SCHEDULED_ENABLED`              | Yes      | Set to `true` to enable the job            |
| Secret   | `SCHEDULED_BASE_URL`             | Yes      | Authorized target URL                      |
| Variable | `SCHEDULED_ENVIRONMENT`          | No       | Defaults to `staging`                      |
| Secret   | `K6_OTEL_GRPC_EXPORTER_ENDPOINT` | No       | Enables OpenTelemetry when present         |
| Variable | `K6_OTEL_GRPC_EXPORTER_INSECURE` | No       | Defaults to `false`; use only when allowed |

Scheduled workflows execute from the repository's default branch. The job validates the suite, performs one smoke iteration and retains its JSON summary for 14 days.

## OpenTelemetry

k6 can send metrics directly to an OpenTelemetry collector with `--out opentelemetry`. See [`docs/opentelemetry.md`](docs/opentelemetry.md) for the local and scheduled exporter contract.

No collector, dashboard or metrics backend is bundled with this repository.

## Documentation

- [`docs/architecture.md`](docs/architecture.md): execution flow, boundaries and extension rules.
- [`docs/opentelemetry.md`](docs/opentelemetry.md): exporter configuration and delivery limitations.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution workflow and safety requirements.
- [`SECURITY.md`](SECURITY.md): supported version, reporting and trust-boundary guidance.

## Responsible use

Load tests can disrupt systems. Run them only against infrastructure you own or have explicit permission to test. Begin with smoke, observe the system, and increase load deliberately.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
