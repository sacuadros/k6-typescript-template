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
  ├─ setup()                         # average-load and stress only
  │    └─ preflightTarget()
  └─ scenario
       ├─ routeForIteration()
       │    └─ SharedArray(src/data/routes.json)
       ├─ HTTP request and checks
       └─ k6 metrics
            ├─ terminal summary
            ├─ optional summary.json
            └─ optional OpenTelemetry output
```

The authenticated smoke path retrieves its bearer token from `k6/secrets` inside the VU context and uses `http.asyncRequest`. It does not pass the secret through `__ENV`, `setup()` or result data.

## Main modules

| Path                                    | Responsibility                                    |
| --------------------------------------- | ------------------------------------------------- |
| `src/config.ts`                         | Trust-boundary validation and load authorization  |
| `src/profiles.ts`                       | Workloads, thresholds and global tags             |
| `src/data/routes.ts`                    | Bounded route loading and deterministic selection |
| `src/scenarios/target.ts`               | Public target flow and load preflight             |
| `src/scenarios/authenticated-target.ts` | Secret-backed bearer flow                         |
| `src/tests/*.ts`                        | Independently runnable k6 entrypoints             |
| `.github/workflows/ci.yml`              | Non-destructive checks and negative safety tests  |
| `.github/workflows/load-test.yml`       | Explicit manual load execution                    |
| `.github/workflows/scheduled-smoke.yml` | Opt-in scheduled smoke                            |

## Safety invariants

1. Pull-request CI never runs a load profile.
2. Average-load and stress require `ALLOW_LOAD_TEST=true`.
3. Production stress also requires `ALLOW_PRODUCTION_LOAD=true`.
4. Scheduled traffic remains disabled until `SCHEDULED_ENABLED=true`.
5. Targets accept only absolute HTTP or HTTPS URLs without embedded credentials.
6. Metric identifiers remain bounded to limit cardinality.
7. Secrets are not stored in source, URLs, setup data or result artifacts.

The CI workflow leaves runnable negative checks for these boundaries.

## Extending the suite

### Add a route

Add a bounded `name` and relative `path` to `src/data/routes.json`. The path must start with exactly one slash.

### Add a business flow

Create a focused function in `src/scenarios/`. Reuse `TestConfig`, keep request names stable and return checks that represent user-visible success.

### Add an entrypoint

Compose configuration, one workload and one scenario in `src/tests/`. Then add the file to `npm run test:inspect`.

### Change a workload

Edit `src/profiles.ts` and update the documented load model. New meaningful-load profiles must remain opt-in and outside pull requests.

## Operational limits

- Thresholds are example SLOs and must be replaced with target-specific objectives.
- The bundled route dataset contains only `/`; adopters must model their own authorized flows.
- OpenTelemetry delivery is not a release gate. k6 can pass while the exporter reports delivery errors.
- GitHub scheduled workflows run only from the default branch and may be delayed by the platform.
