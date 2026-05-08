import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const workflowPath = join(process.cwd(), '.github/workflows/deploy.yml');
const workflow = readFileSync(workflowPath, 'utf-8');
const nonCommentWorkflow = workflow
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n');

const viteConfig = readFileSync(join(process.cwd(), 'vite.config.ts'), 'utf-8');
const router = readFileSync(join(process.cwd(), 'src/app/router.tsx'), 'utf-8');

describe('Deploy Pages workflow contract', () => {
  it('deploys from push to main and manual/data-pipeline dispatch without path filters', () => {
    expect(workflow).toContain('name: Deploy Pages');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toMatch(/source:\n\s+description: 'Dispatch source, e\.g\. data-pipeline'\n\s+required: false\n\s+type: string/);
    expect(workflow).toMatch(/source_run_id:\n\s+description: 'Data Pipeline run id that requested deployment'\n\s+required: false\n\s+type: string/);
    expect(workflow).toMatch(/source_sha:\n\s+description: 'Generated data commit SHA requested for deployment'\n\s+required: false\n\s+type: string/);
    expect(nonCommentWorkflow).not.toMatch(/^\s*paths:/m);
    expect(nonCommentWorkflow).not.toMatch(/^\s*paths-ignore:/m);
  });

  it('uses least-privilege Pages permissions without write access to contents', () => {
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).not.toContain('contents: write');
  });

  it('checks out and verifies workflow_dispatch source_sha when provided', () => {
    expect(workflow).toContain('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5');
    expect(workflow).toContain('ref: ${{ inputs.source_sha || github.sha }}');
    expect(workflow).toMatch(/with:\n\s+ref: \$\{\{ inputs\.source_sha \|\| github\.sha \}\}/);
    expect(workflow).toContain('Verify requested source SHA');
    expect(workflow).toContain("if: ${{ inputs.source_sha != '' }}");
    expect(workflow).toMatch(/EXPECTED_SOURCE_SHA:\s+\$\{\{ inputs\.source_sha \}\}/);
    expect(workflow).toContain('EXPECTED_SHA="$EXPECTED_SOURCE_SHA"');
    expect(workflow).toContain('ACTUAL_SHA="$(git rev-parse HEAD)"');
    expect(workflow).toContain('Checked out $ACTUAL_SHA but expected $EXPECTED_SHA');
    expect(workflow).toContain('exit 1');
  });

  it('rejects workflow_dispatch source_sha unless it is reachable from origin main before build or publish', () => {
    expect(workflow).toContain('fetch-depth: 0');
    expect(workflow).toContain('Verify requested source SHA is on main');
    expect(workflow).toContain("if: ${{ inputs.source_sha != '' }}");
    expect(workflow).toMatch(/REQUESTED_SOURCE_SHA:\s+\$\{\{ inputs\.source_sha \}\}/);
    expect(workflow).toContain('REQUESTED_SHA="$REQUESTED_SOURCE_SHA"');
    expect(workflow).toContain('git fetch');
    expect(workflow).toContain('origin/main');
    expect(workflow).toContain('git merge-base --is-ancestor "$REQUESTED_SHA" origin/main');
    expect(workflow).toContain('Requested source SHA $REQUESTED_SHA is not reachable from origin/main');

    const sourceShaVerificationIndex = workflow.indexOf('Verify requested source SHA');
    const ancestryVerificationIndex = workflow.indexOf('Verify requested source SHA is on main');
    const setupNodeIndex = workflow.indexOf('Setup Node.js');
    const validateDataIndex = workflow.indexOf('Validate committed data');
    const buildIndex = workflow.indexOf('Build static site');
    const uploadIndex = workflow.indexOf('Upload Pages artifact');
    const deployIndex = workflow.indexOf('Deploy to GitHub Pages');

    expect(ancestryVerificationIndex).toBeGreaterThan(sourceShaVerificationIndex);
    expect(ancestryVerificationIndex).toBeLessThan(setupNodeIndex);
    expect(ancestryVerificationIndex).toBeLessThan(validateDataIndex);
    expect(ancestryVerificationIndex).toBeLessThan(buildIndex);
    expect(ancestryVerificationIndex).toBeLessThan(uploadIndex);
    expect(ancestryVerificationIndex).toBeLessThan(deployIndex);
  });

  it('validates, tests, prepares geo data, builds, and checks the static bundle', () => {
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm run data:validate');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('npm run prepare:geo');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('npm run bundle:check');
  });

  it('uploads dist as the Pages artifact and deploys through GitHub Pages', () => {
    expect(workflow).toContain('actions/upload-pages-artifact');
    expect(workflow).toContain('path: dist');
    expect(workflow).toContain('actions/deploy-pages');
  });

  it('does not depend on secrets or paid API keys', () => {
    expect(workflow).not.toContain('secrets.');
  });

  it('pins every action reference to a full immutable commit SHA', () => {
    const usesLines = workflow
      .split('\n')
      .filter((line) => line.trim().startsWith('uses:'));

    expect(usesLines.length).toBeGreaterThanOrEqual(4);
    for (const line of usesLines) {
      expect(line.trim()).toMatch(/^uses: [^\s]+@[0-9a-f]{40}$/);
    }

    expect(workflow).not.toMatch(/uses: actions\/.*@v[0-9]+/);
    expect(workflow).not.toMatch(/uses: .+@main/);
    expect(workflow).not.toMatch(/uses: .+@master/);
  });

  it('keeps Vite and routing compatible with GitHub Pages static hosting', () => {
    expect(viteConfig).toContain("base: '/iait/'");
    expect(router).toContain('HashRouter');
    expect(router).not.toContain('BrowserRouter');
  });
});
