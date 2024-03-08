import * as GeneralImports from 'src/common/config/generalImports';
import {
  IRequestConfig,
  ITestConfig,
} from 'src/common/interfaces/ITestDefinitions';
import {
  createTestOptions,
  executeRequest,
  generateReport,
  getUrl,
} from 'src/common/utils/utils';

import * as customScenarios from 'src/common/config/scenarios';

// Use destructuring to simplify access to imported elements
const { Rate, Trend, Counter } = GeneralImports;
// Metric definitions
const metrics = {
  errorRate: new Rate('errors'),
  responseTime: new Trend('response_time'),
  errorCount: new Counter('errorCount'),
};

// Test options configuration
export const options = createTestOptions({
  scenarios: {
    default: customScenarios.smokeTest,
  },
});

// Test configuration
const testConfig: ITestConfig = {
  host: 'reqres.in',
  protocol: 'https',
  service: 'templates',
  testName: 'http-put',
};
const body = {
  name: 'morpheus',
  job: 'zion resident',
};

// Main test function
export default function () {
  // Request configuration
  const requests: IRequestConfig[] = [
    {
      method: 'PUT',
      path: '/api/users/2',
      queryParams: {},
      params: {
        headers: { 'X-MyHeader': 'k6test' },
        cookies: { my_cookie: 'value' },
        tags: { k6test: 'yes' },
      },
      body,
    },
  ];
  const expectedStatusCode: number = 200;
  requests.forEach((request) => {
    const url = getUrl(testConfig, request);
    const params = request.params ?? {};
    const body = request.body ?? [];

    executeRequest(
      url,
      request.method,
      body,
      params,
      metrics,
      expectedStatusCode,
    );
  });
}

// Handling the summary of results
export function handleSummary(data: any) {
  return generateReport(testConfig, data);
}
