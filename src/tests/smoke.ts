import { loadConfig } from '../config.ts';
import { optionsFor } from '../profiles.ts';
import { visitTarget } from '../scenarios/target.ts';

const config = loadConfig('smoke');

export const options = optionsFor('smoke', config.environment, config.testId);

export default function (): void {
  visitTarget(config);
}
