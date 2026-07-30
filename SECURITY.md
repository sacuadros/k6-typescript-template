# Security Policy

## Supported version

Security fixes apply to the latest commit on the default branch. Older branches, tags and forks are not maintained by this repository.

This project is a source-code starter, not a hosted load-testing service. Operators remain responsible for target authorization, network access, secret storage and observability infrastructure.

## Reporting a vulnerability

Do not open a public issue for a suspected vulnerability. Use [GitHub private vulnerability reporting](https://github.com/sacuadros/k6-typescript-template/security/advisories/new).

Include:

- affected file, workflow or commit;
- expected and observed behavior;
- minimal reproduction steps;
- realistic impact;
- suggested mitigation, if known.

Do not include live credentials, private target URLs, personal data or unrelated sensitive content.

## Security boundaries

### Targets and load

- Run tests only against systems you own or have explicit permission to test.
- Keep load profiles fail-closed.
- Do not remove the additional production-stress authorization gate.
- Treat workflow inputs and repository variables as visible configuration, not secret storage.

### Secrets

- Use `k6/secrets` or GitHub Actions secrets for credentials.
- Never put credentials in `BASE_URL`, route data, `TEST_ID`, tags, logs or artifacts.
- Do not return secrets from `setup()` or serialize them into test data.

### Dependencies and workflows

- Pin GitHub Actions to full commit SHAs.
- Keep workflow permissions minimal.
- Use `npm ci` and the committed lockfile.
- Do not import mutable remote JavaScript modules into tests.

### Results and telemetry

Load-test summaries and telemetry can reveal URLs, timing, topology or identifiers. Review their contents and retention before sharing them or sending them to an external collector.

OpenTelemetry exporter errors do not necessarily make k6 exit unsuccessfully. Monitor collector delivery independently from test thresholds.
