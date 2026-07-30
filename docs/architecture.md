# Architecture

## Purpose

This repository bridges the gap between a generated k6 script and a maintainable team-owned performance test suite.

The architecture prioritizes:

- safe defaults;
- direct execution by k6;
- explicit environment and load contracts;
- reusable business flows;
- stable performance signals;
- optional observability without cloud lock-in.

## Non-goals

The project is not:

- a k6 script generator;
- a custom test framework or runner;
- a hosted performance-testing platform;
- a collector, dashboard or metrics backend;
- a browser recorder or distributed-load orchestrator.

## Execution flow

```text
src/tests/<entrypoint>.ts
  ├─ loadConfig(workload)
  │    └─ validates target, environment, test ID and load authorization
  ├─ optionsFor(workload)
  │    └─ applies load profile, thresholds and stable global tags
  ├─ setup()                         # average-load, capacity and stress
  │    └─ preflightTarget()
  └─ scenario
       ├─ routeForIteration()
       │    └─ weighted SharedArray(src/data/routes.json)
       ├─ HTTP request and checks
       └─ k6 metrics
            ├─ terminal summary
            ├─ optional Markdown, JSON and HTML reports
            ├─ optional baseline and OpenAPI coverage gates
            └─ optional OpenTelemetry output
```

The authenticated smoke path retrieves its bearer token from `k6/secrets` inside the VU context and uses `http.asyncRequest`. It does not pass the secret through `__ENV`, `setup()` or result data.

## Main modules

| Path                                    | Responsibility                                   |
| --------------------------------------- | ------------------------------------------------ |
| `src/config.ts`                         | Trust-boundary validation and load authorization |
| `src/profiles.ts`                       | Workloads, thresholds and global tags            |
| `src/data/routes.ts`                    | Route validation, weighted selection and SLOs    |
| `src/scenarios/target.ts`               | Public target flow and load preflight            |
| `src/scenarios/authenticated-target.ts` | Secret-backed bearer flow                        |
| `src/tests/*.ts`                        | Independently runnable k6 entrypoints            |
| `.github/workflows/ci.yml`              | Non-destructive checks and negative safety tests |
| `.github/workflows/load-test.yml`       | Manual and reusable performance gate             |
| `.github/workflows/scheduled-smoke.yml` | Opt-in scheduled smoke                           |
| `scripts/render-summary.mjs`            | Bounded JSON-to-Markdown CI report renderer      |
| `scripts/baseline.mjs`                  | Scoped baseline creation and regression gate     |
| `scripts/openapi-coverage.mjs`          | Bounded OpenAPI-to-route coverage gate           |
| `examples/demo-api/server.mjs`          | Dependency-free local pass/fail target           |
| `recipes/*.ts`                          | Opt-in target-specific API examples              |

## Safety invariants

1. Pull-request CI never runs a load profile.
2. Average-load, capacity and stress require `ALLOW_LOAD_TEST=true`.
3. Production stress and capacity also require `ALLOW_PRODUCTION_LOAD=true`.
4. Scheduled traffic remains disabled until `SCHEDULED_ENABLED=true`.
5. Targets accept only absolute HTTP or HTTPS URLs without embedded credentials.
6. Metric identifiers remain bounded to limit cardinality.
7. Secrets are not stored in source, URLs, setup data or result artifacts.
8. Reusable workflow callers receive no write permission from the gate.
9. Demo verification binds only to an ephemeral localhost port.
10. Recipes are inspected in CI but never execute target traffic by default.
11. Regression baselines must match the current environment and workload.
12. OpenAPI coverage reads only bounded version 3 JSON and local GET route data.

The CI workflow leaves runnable negative checks for these boundaries.

## Reusable workflow boundary

The performance gate supports both `workflow_dispatch` and `workflow_call`.
When called from another repository, GitHub checks out the caller repository,
so the caller must retain this starter's package scripts and `src/tests`
entrypoints.

The called workflow requests only `contents: read`. It accepts an optional
`TARGET_BASE_URL` secret, which takes precedence over the non-secret
`base_url` input for reusable calls. Fork pull requests do not receive caller
secrets, so a secret-backed gate fails closed before generating traffic.

Average-load, capacity and stress are explicit workload selections. Stress or
capacity against production still requires `allow_production_load: true`; the
reusable boundary does not bypass the runtime checks in `src/config.ts`.

## Extending the suite

### Add a route

Add a unique bounded `name`, `GET` method, relative `path`, `weight`,
`expectedStatus`, `p95Ms` and `maxErrorRate` to `src/data/routes.json`. Add a
unique `operationId` when the route represents a templated OpenAPI path. The
path must start with exactly one slash. Route weights are deterministic and
total weight is capped. Route names feed tag-specific thresholds, so dynamic
identifiers are rejected.

### Add a business flow

Create a focused function in `src/scenarios/`. Reuse `TestConfig`, keep request names stable and return checks that represent user-visible success.

### Add an entrypoint

Compose configuration, one workload and one scenario in `src/tests/`. Then add the file to `npm run test:inspect`.

### Change a workload

Edit `src/profiles.ts` and update the documented load model. New meaningful-load profiles must remain opt-in and outside pull requests. Arrival-rate profiles must not add `sleep()` to the paced iteration.

## Operational limits

- Thresholds are example SLOs and must be replaced with target-specific objectives.
- The bundled route dataset contains only `GET /`; adopters must model their own authorized flows and budgets.
- OpenTelemetry delivery is not a release gate. k6 can pass while the exporter reports delivery errors.
- OpenAPI coverage supports version 3 JSON `paths` and reports only `GET`, matching the executable route catalog; YAML, `$ref` resolution, callbacks, webhooks and `additionalOperations` are not included.
- GitHub scheduled workflows run only from the default branch and may be delayed by the platform.
