import { check } from 'k6';

import { weightedIndex } from '../data/weighted-selection.ts';

export const options = {
  iterations: 1,
  thresholds: {
    checks: ['rate==1'],
  },
  vus: 1,
};

export default function (): void {
  const positions = [0, 1, 2, 3, 4, 5, 6, 7];
  const expected = [0, 0, 0, 1, 0, 0, 0, 1];
  const actual = positions.map((position) => weightedIndex([3, 1], position));

  check(actual, {
    'weighted selection follows the configured distribution': (values) =>
      values.every((value, index) => value === expected[index]),
  });
}
