import * as Comlink from 'comlink';
import type { MetricsWorkerApi } from './metrics.worker';
import { metricsEngine } from '../metrics';
import type { SiteLocation, HorizonProfile, MetricsResult } from '../../contracts';

let workerProxy: Comlink.Remote<MetricsWorkerApi> | null = null;

function getWorker(): Comlink.Remote<MetricsWorkerApi> | null {
  if (typeof window === 'undefined' || typeof Worker === 'undefined') {
    return null;
  }
  if (!workerProxy) {
    try {
      const worker = new Worker(new URL('./metrics.worker.ts', import.meta.url), {
        type: 'module'
      });
      workerProxy = Comlink.wrap<MetricsWorkerApi>(worker);
    } catch (err) {
      console.warn('[workerClient] Web Worker initialization failed, falling back to main thread:', err);
      return null;
    }
  }
  return workerProxy;
}

/**
 * Evaluates metrics off the main thread via Web Worker when available,
 * seamlessly falling back to synchronous in-thread evaluation if unsupported.
 */
export async function evaluateMetricsAsync(args: {
  site: SiteLocation;
  horizon: HorizonProfile | null;
  t: Date;
  windowDays?: number;
}): Promise<MetricsResult> {
  const worker = getWorker();
  if (worker) {
    try {
      return await worker.evaluate({
        site: args.site,
        horizon: args.horizon,
        tString: args.t.toISOString(),
        windowDays: args.windowDays
      });
    } catch (err) {
      console.warn('[workerClient] Worker execution error, evaluating on main thread:', err);
    }
  }

  // Fallback to direct metrics engine evaluation
  return metricsEngine.evaluate(args);
}
