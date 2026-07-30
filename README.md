# k6 Continuous Performance Starter

[![CI](https://github.com/sacuadros/k6-typescript-template/actions/workflows/ci.yml/badge.svg)](https://github.com/sacuadros/k6-typescript-template/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

An opinionated, dependency-light starting point for turning a first [k6](https://grafana.com/docs/k6/latest/) script into a safe and maintainable API performance test suite.

k6 runs TypeScript directly. This project deliberately has no bundler, custom runner, framework, or mandatory cloud service.

## What this solves

- Separates reusable user behavior from workload configuration.
- Provides smoke, average-load, capacity, and stress profiles with explicit safety gates.
- Encodes performance expectations as thresholds that can fail CI.
- Loads bounded route data once with `SharedArray`.
- Demonstrates bearer authentication through redacted k6 secret sources.
- Supports optional native OpenTelemetry export.
- Uses stable tags for filtering and observability.
- Publishes human-readable reports and can compare results with a versioned baseline.
- Maps tested GET routes to an OpenAPI contract and can fail on missing coverage.
- Exposes the same performance gate as a reusable GitHub Actions workflow.
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
npm run demo
```

`npm run demo` starts a dependency-free API on an ephemeral localhost port,
runs the smoke profile and shuts the server down. To see the performance gate
reject an intentionally slow response:

```bash
npm run demo:fail
```

The failure demo succeeds only when k6 exits because the 650 ms response
crosses the 500 ms latency budget. The smoke profile can also run directly
against Grafana's public test site with `npm run test:smoke`; redirects may
produce more than one HTTP request. To target a system you own or are
authorized to test:

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
| `capacity`     | 5 iterations/s for 30 seconds   | Also fails when iterations are dropped           |
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

Run a throughput-oriented capacity test:

```bash
BASE_URL=https://staging.example.com \
ENVIRONMENT=staging \
ALLOW_LOAD_TEST=true \
TARGET_RPS=20 \
PRE_ALLOCATED_VUS=10 \
MAX_VUS=40 \
npm run test:capacity
```

Capacity uses k6's open-model `constant-arrival-rate` executor and does not add
sleep inside each iteration. `TARGET_RPS` must be 1-500, VU limits must be
1-500, and pre-allocated VUs cannot exceed the maximum. Dropped iterations
fail the profile.

Stress and capacity against `ENVIRONMENT=production` are rejected unless
`ALLOW_PRODUCTION_LOAD=true` is also set. That override is intentionally
verbose: use it only with explicit authorization and an agreed test window.

Before average-load, capacity or stress starts, `setup()` performs one
preflight request. A failing target aborts the test before virtual users
generate load.

## Test data

[`src/data/routes.json`](src/data/routes.json) contains the bounded routes,
traffic distribution and performance budgets used by virtual users:

```json
[
  {
    "expectedStatus": 200,
    "maxErrorRate": 0.01,
    "method": "GET",
    "name": "GET root",
    "operationId": "getRoot",
    "path": "/",
    "p95Ms": 500,
    "weight": 1
  }
]
```

k6 loads this file once with `SharedArray` and selects entries deterministically
according to `weight`, the VU and iteration numbers. Route names must be unique
and use only bounded alphanumeric, space, dot, underscore, slash or hyphen
characters. They become metric tags and route-specific threshold selectors.
`expectedStatus` defines functional success, while `p95Ms` and `maxErrorRate`
define the route budget. Optional `operationId` links a concrete route to a
templated OpenAPI operation. The catalog currently supports `GET`; model
requests with bodies in focused scenarios instead of embedding payloads here.

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

## Optional recipes

[`recipes/`](recipes/README.md) contains inspected, standalone examples for
OAuth client credentials, GraphQL and multipart file upload. They are not
executed by the performance gate because each requires a target-specific
contract and explicit authorization.

## Configuration contract

| Variable                | Purpose                                                   |
| ----------------------- | --------------------------------------------------------- |
| `BASE_URL`              | Absolute target URL; required outside the demo smoke test |
| `ENVIRONMENT`           | `demo`, `local`, `staging`, or `production`               |
| `TEST_ID`               | Stable identifier added to result tags                    |
| `AUTH_SECRET_NAME`      | Secret-source key used by the authenticated smoke test    |
| `ALLOW_LOAD_TEST`       | Must be `true` for average-load, capacity and stress      |
| `ALLOW_PRODUCTION_LOAD` | Additional approval for capacity or stress in production  |

Do not commit secrets or production URLs, and do not place credentials inside `BASE_URL`. Add authentication with k6 secret sources or environment-specific CI secrets, and never write credentials to logs or result artifacts.

## Project structure

```text
src/
├── config.ts                 # Environment contract and safety gates
├── data/
│   ├── routes.json           # Bounded parameterization data
│   ├── routes.ts             # Validation, weighted selection, and route SLOs
│   └── weighted-selection.ts # Deterministic distribution primitive
├── profiles.ts               # Workloads, thresholds, and common tags
├── scenarios/
│   ├── authenticated-target.ts
│   └── target.ts             # Virtual-user behavior and preflight
└── tests/
    ├── authenticated-smoke.ts
    ├── average-load.ts       # Expected-load entry point
    ├── capacity.ts           # Open-model RPS entry point
    ├── routes-contract.ts    # Traffic-distribution self-check
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
| `npm run demo`              | Run a passing smoke against the local demo API         |
| `npm run demo:fail`         | Prove the gate rejects an intentional slow response    |
| `npm run format`            | Format project files                                   |
| `npm run format:check`      | Verify formatting without changing files               |
| `npm run openapi:coverage`  | Compare example routes with the example OpenAPI file   |
| `npm run recipes:inspect`   | Inspect every optional recipe without sending traffic  |
| `npm run typecheck`         | Run strict TypeScript checking                         |
| `npm run test:inspect`      | Inspect every entry point without sending HTTP traffic |
| `npm run test:report`       | Verify the Markdown summary renderer                   |
| `npm run test:baseline`     | Verify regression-baseline creation and comparison     |
| `npm run test:openapi`      | Verify OpenAPI coverage calculation                    |
| `npm run test:routes`       | Verify deterministic weighted route selection          |
| `npm run test:demo`         | Verify both local demo outcomes                        |
| `npm run test:smoke`        | Execute the safe smoke profile                         |
| `npm run test:average-load` | Execute expected load after explicit opt-in            |
| `npm run test:capacity`     | Execute a fixed arrival-rate profile after opt-in      |
| `npm run test:stress`       | Execute the stress profile after explicit opt-in       |

## CI policy

Pull requests and branch pushes run static checks and `k6 inspect`. CI also verifies that load profiles refuse to initialize without their safety flags. It does not generate meaningful traffic against external systems.

The **Performance gate** workflow accepts a controlled target, environment and workload through `workflow_dispatch`. It validates the suite, publishes a Markdown job summary and retains JSON plus a self-contained HTML report for 14 days. Capacity or stress against production requires the additional boolean approval. OpenTelemetry is enabled when the `K6_OTEL_GRPC_EXPORTER_ENDPOINT` secret exists.

Workflow inputs and result artifacts may be visible to repository collaborators. Do not place credentials or sensitive payloads in the target URL, route data, tags, test ID or results.

### Reuse the performance gate

Repositories created from this template can call the same workflow without
copying its implementation:

```yaml
name: API performance

on:
  workflow_dispatch:

jobs:
  smoke:
    uses: sacuadros/k6-typescript-template/.github/workflows/load-test.yml@main
    with:
      workload: smoke
      environment: staging
      test_id: reusable-smoke
    secrets:
      TARGET_BASE_URL: ${{ secrets.STAGING_BASE_URL }}
```

The called workflow checks out the caller repository and expects this
starter's `package.json` scripts and `src/tests` layout. Replace `@main` with a
release tag or commit SHA before relying on the gate in production. It grants
only `contents: read`, and a missing
`TARGET_BASE_URL` causes the test configuration to fail before generating
traffic. Use the public `base_url` input only for non-sensitive targets.

### Opt-in regression baseline

Create a versioned baseline from a representative summary:

```bash
mkdir -p baselines
ENVIRONMENT=staging \
WORKLOAD=capacity \
node scripts/baseline.mjs \
  create \
  results/summary.json \
  baselines/staging-capacity.json
```

The generated baseline records p95 latency, failed-request rate and request
rate, with editable tolerances. Enable comparison in the manual or reusable
workflow with:

```yaml
with:
  workload: capacity
  environment: staging
  baseline_path: baselines/staging-capacity.json
```

The comparison fails when latency or failures exceed the allowed increase, or
throughput drops below its allowed minimum. Baselines are accepted only when
their `environment` and `workload` match the current execution. No historical
artifacts are downloaded automatically.

### Opt-in OpenAPI performance coverage

The coverage report checks which OpenAPI `GET` operations have a corresponding
entry in `src/data/routes.json`. It accepts OpenAPI v3 JSON documents and uses
`operationId` when present, which lets `/users/example` cover a templated
`/users/{userId}` operation. Without `operationId`, method and path must match
exactly. Non-GET operations are reported as excluded because the bounded route
catalog intentionally executes only `GET`.

Run the bundled example:

```bash
npm run openapi:coverage
cat results/openapi-coverage.md
```

Enable it in the manual or reusable workflow:

```yaml
with:
  openapi_path: examples/openapi.json
  minimum_openapi_coverage: 100
```

The gate publishes `openapi-coverage.md` and fails below the configured
percentage of `GET` operations. The OpenAPI path must be a relative `.json`
path without parent traversal. YAML input, `$ref` resolution, callbacks,
webhooks and dynamically added methods are outside this deliberately small
coverage check.

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

Scheduled workflows execute from the repository's default branch. The job validates the suite, performs one smoke iteration and retains its Markdown, JSON and HTML reports for 14 days.

## OpenTelemetry

k6 can send metrics directly to an OpenTelemetry collector with `--out opentelemetry`. See [`docs/opentelemetry.md`](docs/opentelemetry.md) for the local and scheduled exporter contract.

No collector, dashboard or metrics backend is bundled with this repository.

## Documentation

- [`ROADMAP.md`](ROADMAP.md): planned outcomes and contribution opportunities.
- [`docs/architecture.md`](docs/architecture.md): execution flow, boundaries and extension rules.
- [`docs/opentelemetry.md`](docs/opentelemetry.md): exporter configuration and delivery limitations.
- [`recipes/README.md`](recipes/README.md): OAuth, GraphQL and upload recipes.
- [`CONTRIBUTING.md`](CONTRIBUTING.md): contribution workflow and safety requirements.
- [`SECURITY.md`](SECURITY.md): supported version, reporting and trust-boundary guidance.

## Responsible use

Load tests can disrupt systems. Run them only against infrastructure you own or have explicit permission to test. Begin with smoke, observe the system, and increase load deliberately.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
