import { loadConfig } from '../config.ts';
import { optionsFor } from '../profiles.ts';
import { visitAuthenticatedTarget } from '../scenarios/authenticated-target.ts';

const config = loadConfig('smoke');
const secretName = __ENV.AUTH_SECRET_NAME?.trim();

if (!secretName) {
  throw new Error('Authenticated smoke requires AUTH_SECRET_NAME.');
}

if (!/^[A-Za-z0-9._-]{1,128}$/.test(secretName)) {
  throw new Error(
    'AUTH_SECRET_NAME must be 1-128 letters, numbers, dots, underscores, or hyphens.',
  );
}

export const options = optionsFor('smoke', config.environment, config.testId);

export default async function (): Promise<void> {
  await visitAuthenticatedTarget(config, secretName);
}
