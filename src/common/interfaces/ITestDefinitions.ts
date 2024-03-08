import { TScenario } from "../types/ScenarioTypes";

/**
 * Defines the configuration for a test, including the target host, protocol, service, and test name.
 */
export interface ITestConfig {
  host: string; // The host name or IP address of the target server
  protocol: string; // The protocol used for the test (e.g., http, https)
  service: string; // The name of the service under test
  testName: string; // The name of the test being executed
}

/**
 * Describes the configuration for a request, including optional body, headers, HTTP method, query parameters, path, port, and any additional tags.
 */
export interface IRequestConfig {
  body?: any; // Optional request body
  method: string; // HTTP method (e.g., GET, POST)
  queryParams?: Record<string, any>; // Optional query parameters
  params?: Record<string, any>; // Optional additional parameters including headers, cookies, redirects, and tags
  path: string; // URL path
  port?: number | null; // Optional port number
}

/**
 * Specifies the options for a k6 test, including settings for response body discard, performance thresholds, and defined scenarios.
 */
export interface IK6Options {
  discardResponseBodies?: boolean; // Whether to discard response bodies to save memory
  thresholds?: {
    [metricName: string]: {
      threshold: string; // Performance threshold expression
      abortOnFail?: boolean; // Whether to abort the test on threshold failure
      delayAbortEval?: string; // Delay before evaluating abort condition
    }[];
  };
  scenarios?: { [name: string]: TScenario }; // Defined scenarios for the test
  [extraOptions: string]: any; // Allows for additional properties not explicitly defined
}

/**
 * Groups tests by service, providing a way to organize and reference multiple tests within a specific service.
 */
export interface ITestGroup {
  service: string; // The name of the service containing the tests
  tests: string[]; // An array of test names included in the service
}
