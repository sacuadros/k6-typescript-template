import type { Options } from 'k6/options';

export type Workload = 'smoke' | 'average-load' | 'stress';

const thresholds: NonNullable<Options['thresholds']> = {
  checks: ['rate>0.99'],
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
};

const profiles = {
  smoke: {
    discardResponseBodies: true,
    iterations: 1,
    thresholds,
    vus: 1,
  },
  'average-load': {
    discardResponseBodies: true,
    duration: '1m',
    thresholds,
    vus: 10,
  },
  stress: {
    discardResponseBodies: true,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 25 },
      { duration: '30s', target: 0 },
    ],
    thresholds,
  },
} satisfies Record<Workload, Options>;

export function optionsFor(
  workload: Workload,
  environment: string,
  testId: string,
): Options {
  return {
    ...profiles[workload],
    tags: {
      environment,
      test_id: testId,
      workload,
    },
  };
}
