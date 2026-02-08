import { register, collectDefaultMetrics } from 'prom-client';

// Singleton to prevent multiple registrations in dev hot-reload
// @ts-ignore
if (!global.metricsInitialized) {
  collectDefaultMetrics({ register });
  // @ts-ignore
  global.metricsInitialized = true;
}

export { register };
