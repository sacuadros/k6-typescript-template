# OpenTelemetry output

k6 2.1 can export metrics directly through OpenTelemetry without a JavaScript reporter or remote module. See the [official k6 OpenTelemetry documentation](https://grafana.com/docs/k6/latest/results-output/real-time/opentelemetry/) for the complete option reference.

## Local collector

With an OpenTelemetry collector listening for insecure gRPC on `localhost:4317`:

```bash
K6_OTEL_GRPC_EXPORTER_ENDPOINT=localhost:4317 \
K6_OTEL_GRPC_EXPORTER_INSECURE=true \
K6_OTEL_SERVICE_NAME=k6-continuous-performance \
K6_OTEL_METRIC_PREFIX=k6_ \
k6 run --out opentelemetry src/tests/smoke.ts
```

The gRPC endpoint defaults to `localhost:4317`. The default export interval is 10 seconds; shorten it only when the collector and backend can handle the additional traffic:

```bash
K6_OTEL_EXPORT_INTERVAL=5s \
k6 run --out opentelemetry src/tests/smoke.ts
```

## Remote collector

For a remote collector:

- configure `K6_OTEL_GRPC_EXPORTER_ENDPOINT`;
- do not enable the insecure exporter unless the network boundary explicitly permits plaintext transport;
- configure collector authentication and TLS outside the test script;
- keep credentials out of URLs, tags, route data, logs and result artifacts.

The manual and scheduled workflows enable OpenTelemetry automatically when the `K6_OTEL_GRPC_EXPORTER_ENDPOINT` GitHub Actions secret exists.

## Failure behavior

Threshold failures still control the k6 process exit code. OpenTelemetry delivery is separate: k6 can finish successfully while reporting exporter connection errors in its logs.

Treat collector availability as an independently monitored platform concern. Do not use the presence of `--out opentelemetry` as proof that the backend received or retained every metric.

## Scope

This repository provides the exporter contract only. It deliberately does not provision a collector, Prometheus, Grafana, dashboards or retention policies because those belong to the target platform.

Stable tags available for filtering:

- `environment`;
- `test_id`;
- `workload`;
- `scenario`;
- bounded request `name`.

Review tag cardinality and data sensitivity before sending metrics to any external backend.
