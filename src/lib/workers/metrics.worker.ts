import * as Comlink from 'comlink';
import { metricsEngine } from '../metrics';
import type { SiteLocation, HorizonProfile, MetricsResult } from '../../contracts';

export interface MetricsWorkerApi {
  evaluate(args: {
    site: SiteLocation;
    horizon: HorizonProfile | null;
    tString: string;
    windowDays?: number;
  }): Promise<MetricsResult>;
}

const api: MetricsWorkerApi = {
  async evaluate(args) {
    return metricsEngine.evaluate({
      site: args.site,
      horizon: args.horizon,
      t: new Date(args.tString),
      windowDays: args.windowDays
    });
  }
};

Comlink.expose(api);
