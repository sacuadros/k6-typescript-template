# k6 TypeScript Template

[![CI](https://github.com/sacuadros/k6-typescript-template/actions/workflows/ci.yml/badge.svg)](https://github.com/sacuadros/k6-typescript-template/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](LICENSE)

A minimal starter for writing type-checked [k6](https://grafana.com/docs/k6/latest/) load tests in TypeScript. k6 runs TypeScript directly, so this template does not need a custom bundler or test runner.

## Prerequisites

- [Node.js](https://nodejs.org/) 20 or newer
- npm
- [k6](https://grafana.com/docs/k6/latest/set-up/install-k6/) installed locally

## Quick start

```bash
git clone https://github.com/sacuadros/k6-typescript-template.git
cd k6-typescript-template
npm ci
npm run check
npm run test:smoke
```

The smoke test targets Grafana's public k6 test site by default. To use a system you are authorized to test:

```bash
k6 run -e BASE_URL=https://your-test-system.example src/smoke.ts
```

## Project structure

```text
src/
└── smoke.ts          # Small runnable example
.github/workflows/
└── ci.yml            # Formatting, types, and k6 inspection
```

Create another test by copying `src/smoke.ts`, then import k6 modules directly. Keep local imports relative and fully specified so k6 can resolve them.

## Commands

| Command                | Purpose                                      |
| ---------------------- | -------------------------------------------- |
| `npm run check`        | Run every non-destructive project check      |
| `npm run format`       | Format tracked project files                 |
| `npm run format:check` | Verify formatting without changing files     |
| `npm run typecheck`    | Run strict TypeScript checking               |
| `npm run test:inspect` | Validate the k6 script without sending HTTP  |
| `npm run test:smoke`   | Execute one iteration against the target URL |

## Responsible use

Load tests can disrupt systems. Run them only against infrastructure you own or have explicit permission to test. Start with a small scenario and increase load intentionally.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports should follow [SECURITY.md](SECURITY.md).

## License

Licensed under the [Apache License 2.0](LICENSE).
