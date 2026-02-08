import { register, collectDefaultMetrics } from 'prom-client';

// Singleton to prevent multiple registrations in dev hot-reload
// @ts-expect-error global property not typed
if (!global.metricsInitialized) {
  collectDefaultMetrics({ register });
  // @ts-expect-error global property not typed
  global.metricsInitialized = true;
}

export { register };
