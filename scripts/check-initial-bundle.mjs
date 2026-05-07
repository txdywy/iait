import fs from 'node:fs/promises';
import path from 'node:path';
import { gzip } from 'node:zlib';
import { promisify } from 'node:util';

const gzipAsync = promisify(gzip);
const ENTRY_LIMIT_BYTES = 300 * 1024;
const assetsDir = path.join('dist', 'assets');

async function findInitialChunks() {
  const entries = await fs.readdir(assetsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && entry.name.startsWith('index-') && entry.name.endsWith('.js'))
    .map((entry) => path.join(assetsDir, entry.name));
}

async function gzipSize(filePath) {
  const raw = await fs.readFile(filePath);
  const compressed = await gzipAsync(raw);
  return compressed.byteLength;
}

const chunks = await findInitialChunks();
if (chunks.length === 0) {
  console.error('[bundle:check] No index-*.js entry chunks found in dist/assets');
  process.exit(1);
}

let failed = false;
for (const chunk of chunks) {
  const size = await gzipSize(chunk);
  const relativeChunk = path.relative(process.cwd(), chunk);
  console.log(`[bundle:check] ${relativeChunk}: ${size} bytes gzip`);
  if (size > ENTRY_LIMIT_BYTES) {
    console.error(`Initial bundle exceeds 300KB gzip: ${relativeChunk} is ${size} bytes`);
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}
