export interface IScenarioBase {
  executor: string; // The type of executor to use for the scenario
  startTime?: string; // Optional start time for the scenario, delaying its start
  gracefulStop?: string; // Optional duration to gradually stop VUs
  env?: { [key: string]: string }; // Optional environment variables specific to the scenario
  tags?: { [key: string]: string }; // Optional tags to categorize or identify the scenario
}

export interface IVariableLoadScenario extends IScenarioBase {
  startVUs: number; // Common for scenarios that start with a variable number of VUs
  gracefulRampDown?: string; // Duration to gradually decrease VUs at the end of stages
}

/**
 * For scenarios with a constant arrival rate of virtual users.
 */
export interface IConstantArrivalRate extends IScenarioBase {
  rate: number;
  duration: string;
  preAllocatedVUs?: number;
  maxVUs?: number;
  timeUnit?: string;
}

/**
 * For scenarios where each virtual user executes a specific number of iterations.
 */
export interface IPerVUIterations extends IScenarioBase {
  vus: number;
  iterations: number;
  maxDuration?: string;
}

/**
 * For ramping VUs scenarios, extending from IVariableLoadScenario.
 */
export interface IRampingVUS extends IVariableLoadScenario {
  stages: Array<{ duration: string; target: number }>;
}

// Type for using any of the scenario interfaces
export type TScenario = IConstantArrivalRate | IPerVUIterations | IRampingVUS;
