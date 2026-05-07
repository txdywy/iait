import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const geoOutputPath = path.join('public', 'data', 'geo', 'countries-110m.json');
const crossrefSourcePath = path.join('scripts', 'mappings', 'entity-crossref.json');
const crossrefOutputPath = path.join('public', 'data', 'entity-crossref.json');

async function copyJsonAsset(sourcePath: string, outputPath: string): Promise<void> {
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.copyFile(sourcePath, outputPath);
}

export async function prepareGeoAssets(): Promise<void> {
  const countriesSourcePath = require.resolve('world-atlas/countries-110m.json');

  await copyJsonAsset(countriesSourcePath, geoOutputPath);
  await copyJsonAsset(crossrefSourcePath, crossrefOutputPath);

  console.log(`[prepare-geo] Wrote ${geoOutputPath}`);
  console.log(`[prepare-geo] Wrote ${crossrefOutputPath}`);
}

await prepareGeoAssets();
