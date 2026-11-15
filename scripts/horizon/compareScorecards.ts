import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { metricsEngine } from '../../src/lib/metrics';
import type { Site, HorizonProfile } from '../../src/contracts';

const catalogPath = path.resolve(process.cwd(), 'public/data/catalog.json');
const catalogRaw = JSON.parse(fs.readFileSync(catalogPath, 'utf-8'));
const sites: Site[] = catalogRaw.sites || catalogRaw;

const nominalDate = new Date('2026-03-01T00:00:00.000Z');

interface ComparisonRow {
  id: string;
  name: string;
  isPolar: boolean;
  status: string;
  before: {
    illumPct: number;
    maxDarkHrs: number;
    dtePct: number;
    powerScore: number;
    commsScore: number;
    overallScore: number;
  };
  after: {
    illumPct: number;
    maxDarkHrs: number;
    dtePct: number;
    powerScore: number;
    commsScore: number;
    overallScore: number;
  };
  deltaScore: number;
}

const rows: ComparisonRow[] = [];

async function run() {
  for (const site of sites) {
    const horizonPath = path.resolve(process.cwd(), `public/data/horizon/${site.id}.json`);
    const currentHorizon: HorizonProfile = JSON.parse(fs.readFileSync(horizonPath, 'utf-8'));

    // Get baseline horizon from v1-baseline git tag
    let baselineHorizon: HorizonProfile;
    try {
      const baselineRaw = execSync(`git show v1-baseline:public/data/horizon/${site.id}.json`, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore']
      });
      baselineHorizon = JSON.parse(baselineRaw);
    } catch (e) {
      baselineHorizon = currentHorizon;
    }

    const siteLoc = {
      latDeg: site.latDeg,
      lonDeg: site.lonDeg,
      elevationM: site.elevationM
    };

    const beforeMetrics = await metricsEngine.evaluate({
      site: siteLoc,
      horizon: baselineHorizon,
      t: nominalDate
    });

    const afterMetrics = await metricsEngine.evaluate({
      site: siteLoc,
      horizon: currentHorizon,
      t: nominalDate
    });

    rows.push({
      id: site.id,
      name: site.name,
      isPolar: site.isSouthPoleRegion,
      status: currentHorizon.coverageStatus ?? 'SYNTHETIC',
      before: {
        illumPct: Math.round(beforeMetrics.illuminationFraction * 1000) / 10,
        maxDarkHrs: Math.round(beforeMetrics.longestDarkStretchHours * 10) / 10,
        dtePct: Math.round(beforeMetrics.dteAvailabilityFraction * 1000) / 10,
        powerScore: beforeMetrics.scorecard.powerScore,
        commsScore: beforeMetrics.scorecard.communicationScore,
        overallScore: beforeMetrics.scorecard.overallScore
      },
      after: {
        illumPct: Math.round(afterMetrics.illuminationFraction * 1000) / 10,
        maxDarkHrs: Math.round(afterMetrics.longestDarkStretchHours * 10) / 10,
        dtePct: Math.round(afterMetrics.dteAvailabilityFraction * 1000) / 10,
        powerScore: afterMetrics.scorecard.powerScore,
        commsScore: afterMetrics.scorecard.communicationScore,
        overallScore: afterMetrics.scorecard.overallScore
      },
      deltaScore: afterMetrics.scorecard.overallScore - beforeMetrics.scorecard.overallScore
    });
  }

  console.log(JSON.stringify(rows, null, 2));
}

run().catch(console.error);
