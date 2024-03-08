import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';
import { htmlReport } from 'https://raw.githubusercontent.com/benc-uk/k6-reporter/main/dist/bundle.js';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import exec from 'k6/execution';
import papaparse from 'https://jslib.k6.io/papaparse/5.1.1/index.js';
import { SharedArray } from 'k6/data';
/**
 * Re-exports the http module from k6 for making HTTP requests in tests.
 */
export { http };

/**
 * Re-exports the check function from k6 for making assertions on HTTP responses.
 */
export { check };

/**
 * Re-exports the sleep function from k6 for pausing execution between requests.
 */
export { sleep };

/**
 * Re-exports the group function from k6 for organizing test logic into named blocks.
 */
export { group };

/**
 * Re-exports the Rate metric from k6 for calculating the rate of events.
 */
export { Rate };

/**
 * Re-exports the Trend metric from k6 for tracking the trend of values over time.
 */
export { Trend };

/**
 * Re-exports the Counter metric from k6 for counting occurrences of events.
 */
export { Counter };

/**
 * Re-exports the htmlReport function for generating HTML reports of test results.
 */
export { htmlReport };

/**
 * Re-exports the textSummary function for generating text summaries of test results.
 */
export { textSummary };

/**
 * Re-exports the exec module from k6 for accessing execution-specific properties and methods.
 */
export { exec };
/**
 * Re-exports the papaparse module from k6 for parsing CSV data.
 */
export { papaparse };
/**
 * Re-exports the SharedArray module from k6 for sharing data between VUs.
 */
export { SharedArray };
