// Importing utility functions and types directly from their modules for better visibility and modularity
import {
  Rate,
  Trend,
  Counter,
  SharedArray,
  papaparse,
} from 'src/common/config/generalImports';
import {
  IRequestConfig,
  ITestConfig,
} from 'src/common/interfaces/ITestDefinitions';
import {
  createTestOptions,
  executeRequest,
  generateReport,
  getRandonFromCSV,
  getUrl,
} from 'src/common/utils/utils';
import * as customScenarios from 'src/common/config/scenarios';

// Metrics definitions to track the performance and errors of the test
const metrics = {
  errorRate: new Rate('errors'), // Tracks the rate of errors occurred during the test
  responseTime: new Trend('response_time'), // Records the response time of requests to analyze performance trends
  errorCount: new Counter('errorCount'), // Counts the total number of errors
};

// Configuration for the test options using a utility function for better reusability and clarity
export const options = createTestOptions({
  scenarios: {
    default: customScenarios.smokeTest, // Define test scenarios, here using a predefined smoke test scenario
  },
});

// Defining test configuration with details about the request and test environment
const testConfig: ITestConfig = {
  host: 'reqres.in', // The API host
  protocol: 'https', // Protocol used for the requests
  service: 'templates', // The service or API endpoint category being tested
  testName: 'http-post-using-csv', // Name of the test for identification
};

// Preparing test data from a CSV file, utilizing SharedArray for performance optimization with large datasets
const csvData = new SharedArray('another data name', function () {
  return papaparse.parse(open('./fake_data.csv'), { header: true }).data;
});

// Main test execution function
export default function () {
  // Randomly selects a data entry from the CSV for the request body
  const body = getRandonFromCSV(csvData);

  // Configuration for the POST request
  const requests: IRequestConfig[] = [
    {
      method: 'POST',
      path: '/api/users',
      queryParams: {}, // Additional query parameters if needed
      params: {
        headers: { 'X-MyHeader': 'k6test' }, // Custom headers for the request
        cookies: { my_cookie: 'value' }, // Cookies to include in the request
        tags: { k6test: 'yes' }, // Tags for tracking or identification purposes
      },
      body, // The request body selected from the CSV data
    },
  ];
  const expectedStatusCode: number = 201; // The expected status code for a successful POST request

  // Iterating over the requests configuration to execute them
  requests.forEach((request) => {
    const url = getUrl(testConfig, request); // Constructing the URL from the test configuration and request details
    const params = request.params ?? {}; // Ensuring params are defined
    const body = request.body ?? {}; // Ensuring body is defined

    // Execute the request and pass in the metrics for tracking
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

// Function to handle the summary of test results, leveraging a custom report generation function
export function handleSummary(data: any) {
  // Generating and returning the test report based on the test configuration and test data
  return generateReport(testConfig, data);
}
