import { loadConfig } from '../config.ts';
import { optionsFor } from '../profiles.ts';
import { preflightTarget, visitTarget } from '../scenarios/target.ts';

const config = loadConfig('average-load');

export const options = optionsFor(
  'average-load',
  config.environment,
  config.testId,
);

export function setup(): void {
  preflightTarget(config);
}

export default function (): void {
  visitTarget(config);
}
