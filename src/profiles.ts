import type { Options } from 'k6/options';

import { routeThresholds } from './data/routes.ts';

export type Workload = 'smoke' | 'average-load' | 'capacity' | 'stress';

type FixedWorkload = Exclude<Workload, 'capacity'>;

const summaryTrendStats = [
  'avg',
  'min',
  'med',
  'max',
  'p(90)',
  'p(95)',
  'p(99)',
];

const thresholds: NonNullable<Options['thresholds']> = {
  checks: ['rate>0.99'],
  http_req_duration: ['p(95)<500'],
  http_req_failed: ['rate<0.01'],
  ...routeThresholds(),
};

const profiles = {
  smoke: {
    discardResponseBodies: true,
    iterations: 1,
    summaryTrendStats,
    thresholds,
    vus: 1,
  },
  'average-load': {
    discardResponseBodies: true,
    duration: '1m',
    summaryTrendStats,
    thresholds,
    vus: 10,
  },
  stress: {
    discardResponseBodies: true,
    summaryTrendStats,
    stages: [
      { duration: '30s', target: 10 },
      { duration: '1m', target: 25 },
      { duration: '30s', target: 0 },
    ],
    thresholds,
  },
} satisfies Record<FixedWorkload, Options>;

function boundedInteger(
  name: string,
  fallback: number,
  maximum: number,
): number {
  const value = __ENV[name] || fallback.toString();

  if (!/^\d+$/.test(value)) {
    throw new Error(`${name} must be an integer.`);
  }

  const parsed = Number(value);

  if (parsed < 1 || parsed > maximum) {
    throw new Error(`${name} must be between 1 and ${maximum}.`);
  }

  return parsed;
}

function capacityProfile(): Options {
  const rate = boundedInteger('TARGET_RPS', 5, 500);
  const preAllocatedVUs = boundedInteger('PRE_ALLOCATED_VUS', 5, 500);
  const maxVUs = boundedInteger('MAX_VUS', 20, 500);

  if (preAllocatedVUs > maxVUs) {
    throw new Error('PRE_ALLOCATED_VUS must not exceed MAX_VUS.');
  }

  return {
    discardResponseBodies: true,
    scenarios: {
      capacity: {
        duration: '30s',
        executor: 'constant-arrival-rate',
        maxVUs,
        preAllocatedVUs,
        rate,
        timeUnit: '1s',
      },
    },
    summaryTrendStats,
    thresholds: {
      ...thresholds,
      dropped_iterations: ['count==0'],
    },
  };
}

export function optionsFor(
  workload: Workload,
  environment: string,
  testId: string,
): Options {
  const profile =
    workload === 'capacity' ? capacityProfile() : profiles[workload];

  return {
    ...profile,
    tags: {
      environment,
      test_id: testId,
      workload,
    },
  };
}
