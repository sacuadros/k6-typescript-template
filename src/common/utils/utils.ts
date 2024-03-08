import envConfig from '../config/env';
import {
  IK6Options,
  IRequestConfig,
  ITestConfig,
} from '../interfaces/ITestDefinitions';
import {
  http,
  check,
  group,
  sleep,
  htmlReport,
  textSummary,
} from 'src/common/config/generalImports';
import * as customScenarios from 'src/common/config/scenarios';

/**
 * Constructs a URL string from test configuration and request parameters.
 * @param data The test configuration including protocol and host.
 * @param request The request configuration including port, path, method, and params.
 * @returns The constructed URL string.
 */
export function getUrl(data: ITestConfig, request: IRequestConfig): string {
  let url = `${data.protocol}://${data.host}`;
  if (request.port) {
    url += `:${request.port}`;
  }
  url += request.path;

  if (request.method === 'GET' && request.queryParams) {
    const queryString = Object.entries(request.queryParams)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(String(key))}=${encodeURIComponent(String(value))}`,
      )
      .join('&');
    url += `?${queryString}`;
  }

  return url;
}

/**
 * Executes a HTTP request based on the given parameters and processes the response.
 * @param url The URL to which the request is sent.
 * @param method The HTTP method to use for the request.
 * @param body The request body for POST requests.
 * @param params Additional request parameters.
 * @param metrics An object containing metrics to track error rate, response time, and error count.
 * @param expectedStatusCode The expected HTTP status code for the request.
 */
export function executeRequest(
  url: string,
  method: string,
  body: any[],
  params: any,
  metrics: { errorRate: any; responseTime: any; errorCount: any },
  expectedStatusCode: number, // Añade el código de estado esperado como argumento
  minSleep: number = 0, // Parámetros opcionales con valores por defecto
  maxSleep: number = 5,
) {
  const { errorRate, responseTime, errorCount } = metrics;

  group(url, function () {
    try {
      const res = http.request(method, url, JSON.stringify(body), params);
      // Pasa el código de estado esperado a processResponse
      processResponse(res, metrics, expectedStatusCode);
    } catch (error) {
      errorRate.add(true);
      errorCount.add(1);
    }
  });
  const sleepTime = getRandomInt(minSleep, maxSleep);
  sleep(sleepTime);
}

/**
 * Processes the response from a HTTP request, updating metrics based on the outcome.
 * @param res The response object from the HTTP request.
 * @param metrics An object containing metrics to track error rate, response time, and error count.
 * @param expectedStatusCode The HTTP status code expected from the response.
 */
export function processResponse(
  res: any,
  metrics: { errorRate: any; responseTime: any; errorCount: any },
  expectedStatusCode: number, // Utiliza el código de estado esperado para la evaluación
) {
  const { errorRate, responseTime, errorCount } = metrics;

  // Actualiza la condición de verificación para usar el código de estado esperado
  const isSuccess = res.status === expectedStatusCode;
  check(res, { [`status is ${expectedStatusCode}`]: () => isSuccess });
  responseTime.add(res.timings.duration);
  errorRate.add(!isSuccess);
  if (!isSuccess) errorCount.add(1);
}

/**
 * Generates a report for the test execution, optionally with a custom title.
 * @param testConfig Configuration for the test including service name and test name.
 * @param data The data collected during the test execution.
 * @param customTitle An optional custom title for the report.
 * @returns An object containing the path to the HTML report and the text summary output.
 */
export function generateReport(
  testConfig: ITestConfig,
  data: any,
  customTitle?: string,
) {
  const resultPath = `./results/${testConfig.service}-${testConfig.testName}.html`;
  const title = customTitle || `${testConfig.service}-${testConfig.testName}`;
  return {
    [resultPath]: htmlReport(data, { title }),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

/**
 * Creates test options for the execution, merging any provided options with the default ones.
 * @param options The custom options to be merged with the default options.
 * @returns The merged test options.
 */
export function createTestOptions(options: IK6Options): IK6Options {
  const defaultOptions: IK6Options = {
    discardResponseBodies: true,
    thresholds: {
      http_req_failed: [
        { threshold: 'rate<0.1', abortOnFail: true, delayAbortEval: '10s' },
      ],
    },
  };

  // Create a copy of the default options to avoid direct mutation
  const mergedOptions: IK6Options = JSON.parse(JSON.stringify(defaultOptions));

  // Merge the provided options with the default ones
  mergeDeep(mergedOptions, options);
  return mergedOptions;
}

/**
 * Deeply merges two objects, specifically for merging thresholds and scenarios in test options.
 * @param target The target object to merge into.
 * @param source The source object from which to merge properties.
 */
export function mergeDeep(target: any, source: any) {
  Object.keys(source).forEach((key) => {
    if (source[key] && typeof source[key] === 'object') {
      if (!target[key]) {
        target[key] = {};
      }
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  });
}
/**
 * Generates a random integer between the specified minimum and maximum values, inclusive of the minimum and exclusive of the maximum.
 *
 * @param {number} min - The minimum value in the range.
 * @param {number} max - The maximum value in the range.
 * @returns {number} A random integer between the min (inclusive) and max (exclusive) values.
 */
export function getRandomInt(min: number, max: number): number {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min)) + min;
}

/**
 * Selects a random item from an array, assuming the input is an array of data (e.g., from a CSV file).
 *
 * @param {any[]} csvData - The array containing the data from which to select a random item.
 * @returns {any} A random item from the input array.
 */
export function getRandonFromCSV(csvData: any[]): any {
  let randIndex = getRandomInt(0, csvData.length);
  return csvData[randIndex];
}
