# Roadmap

This roadmap describes intended outcomes, not fixed dates or approved
implementation designs. Open an issue before starting substantial work so the
scope and safety model can be agreed first.

## Product principles

Every roadmap item must preserve:

- direct execution by k6 without a custom runner or bundler;
- safe defaults and explicit authorization for meaningful load;
- no mandatory SaaS, collector, dashboard or cloud account;
- bounded inputs, stable metric tags and redacted secrets;
- useful local behavior before optional CI or observability integrations;
- backward compatibility unless a major release is justified.

## Current release: 2.1

Version 2.1 turns the starter into a reusable performance gate:

- reusable and manually dispatched GitHub Actions workflow;
- Markdown, JSON and self-contained HTML reports;
- deterministic route weights and per-route performance budgets;
- dependency-free local pass/fail demo;
- fixed-arrival-rate capacity profile;
- OAuth client credentials, GraphQL and multipart upload recipes;
- versioned regression baselines;
- OpenAPI GET performance-coverage reporting.

## Next

| ID  | Outcome                                 | Acceptance criteria                                                                                 | Suggested scope  |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------- |
| R1  | Machine-readable gate result            | One bounded JSON file summarizes thresholds, regression and OpenAPI coverage for downstream tooling | Good first issue |
| R2  | Route catalog JSON Schema               | Editors can validate the existing route contract without changing runtime behavior                  | Good first issue |
| R3  | Reusable-workflow compatibility fixture | CI proves a minimal caller repository layout remains compatible with the published workflow         | Medium           |
| R4  | Non-GET contract coverage               | Explicit scenarios can declare covered operations without sending unsafe generic write requests     | Design required  |
| R5  | Multiple named business-flow manifests  | Independent flows can own routes and budgets without creating unbounded tags or a custom framework  | Design required  |
| R6  | Local OpenAPI reference resolution      | Bounded local JSON references work; remote references remain disabled                               | Medium           |

R4 and R5 change public contracts. They require an approved design before
implementation. A coverage declaration must never claim that an operation was
executed merely because it exists in OpenAPI.

## Later, only with demonstrated demand

- optional pull-request comments for repositories that deliberately grant
  write permission;
- additional secret-source examples backed by real contributor use cases;
- compatibility testing across supported k6 and Node.js release lines;
- richer historical comparison when a versioned baseline is insufficient.

## Not planned

- a hosted performance-testing service;
- a custom k6 framework, runner or script generator;
- bundled Grafana, Prometheus, OpenTelemetry Collector or Docker stack;
- mandatory cloud integrations;
- browser recording or distributed-load orchestration.

These would duplicate mature tools, increase maintenance cost or weaken the
starter's dependency-light purpose.

## How to contribute

1. Choose an item above or propose a problem with reproducible evidence.
2. Open an issue describing the user need, expected behavior and safety impact.
3. Agree on acceptance criteria before implementation.
4. Keep the pull request focused and include the checks you ran.
5. Update this roadmap when an item ships, changes scope or is rejected.

See [CONTRIBUTING.md](CONTRIBUTING.md) for repository conventions and
[SECURITY.md](SECURITY.md) for private vulnerability reporting.
