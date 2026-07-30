import { SharedArray } from 'k6/data';

interface TestRoute {
  name: string;
  path: string;
}

const routes = new SharedArray<TestRoute>('test routes', () => {
  const data = JSON.parse(open('./routes.json')) as unknown;

  if (!Array.isArray(data) || data.length === 0) {
    throw new Error('src/data/routes.json must contain at least one route.');
  }

  for (const route of data) {
    if (
      typeof route?.name !== 'string' ||
      route.name.length === 0 ||
      route.name.length > 80 ||
      typeof route?.path !== 'string' ||
      route.path.length > 2048 ||
      !route.path.startsWith('/') ||
      route.path.startsWith('//')
    ) {
      throw new Error(
        'Each test route requires a bounded stable name and a path starting with one slash.',
      );
    }
  }

  return data as TestRoute[];
});

export function routeForIteration(): TestRoute {
  return routes[(__VU + __ITER) % routes.length];
}
