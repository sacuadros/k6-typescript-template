import {
  IConstantArrivalRate,
  IPerVUIterations,
  IRampingVUS,
} from '../types/ScenarioTypes';

/**
 * Defines a constant arrival rate scenario for load testing.
 * This scenario configures a test to send a fixed number of requests per second.
 */
export const defaultTest: IConstantArrivalRate = {
  executor: 'constant-arrival-rate',
  rate: 17, // 17 requests per second
  timeUnit: '1s', // Defines the rate per second
  duration: '1m', // Total duration of the test
  preAllocatedVUs: 50, // Initial number of VUs to handle the load
  maxVUs: 100, // Maximum number of VUs if the preAllocatedVUs are not enough
};

/**
 * Defines a per VU iterations scenario for load testing.
 * This scenario configures a test where each VU executes a specific number of iterations.
 */
export const smokeTest: IPerVUIterations = {
  executor: 'per-vu-iterations',
  vus: 1, // Number of virtual users
  iterations: 1, // Total number of iterations to be completed by all VUs
  maxDuration: '5s', // Maximum duration of the test
};

export const breakPoint: IRampingVUS = {
  executor: 'ramping-vus',
  startVUs: 0,
  stages: [
    { duration: '1m', target: 1000 },
    { duration: '1m', target: 2000 },
    { duration: '1m', target: 3000 },
    { duration: '1m', target: 4000 },
  ],
  gracefulRampDown: '0s',
};
