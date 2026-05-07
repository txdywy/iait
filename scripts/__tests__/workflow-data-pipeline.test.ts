import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const workflowPath = join(process.cwd(), '.github/workflows/data-pipeline.yml');
const workflow = readFileSync(workflowPath, 'utf-8');
const pinnedActionPatternDescription = 'uses:.*@[0-9a-f]{40}';
const mutableMajorActionPatternDescription = 'actions/.*@v[0-9]';
const globalSuppressionPatternDescription = '[skip ci]|[ci skip]|[skip actions]';

function pushPathsBlock(): string {
  const match = workflow.match(/push:\n(?<block>(?: {4}.+\n| {6}.+\n| {8}.+\n)+)/);
  expect(match?.groups?.block).toBeDefined();
  return match?.groups?.block ?? '';
}

function nonCommentUsesLines(): string[] {
  return workflow
    .split('\n')
    .filter((line) => !line.trimStart().startsWith('#'))
    .filter((line) => /\buses:\s*\S+/.test(line));
}

function commitGeneratedDataStepBody(): string {
  const match = workflow.match(/- name: Commit generated data\n\s+run: \|\n(?<body>(?:\s{10}.+\n?)+)/);
  expect(match?.groups?.body).toBeDefined();
  return match?.groups?.body ?? '';
}

describe('data pipeline workflow contract', () => {
  it('is named and triggered for schedule, manual dispatch, and source/config pushes only', () => {
    expect(workflow).toContain('name: Data Pipeline');
    expect(workflow).toContain("- cron: '0 0,6,12,18 * * *'");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');

    const paths = pushPathsBlock();
    expect(paths).toContain('.github/workflows/data-pipeline.yml');
    expect(paths).toContain('scripts/**');
    expect(paths).toContain('src/data/**');
    expect(paths).toContain('public/sources/**');
    expect(paths).toContain('package.json');
    expect(paths).toContain('package-lock.json');
    expect(paths).toContain('tsconfig*.json');
    expect(paths).toContain('vite.config.*');
    expect(paths).not.toContain('public/data/**');
  });

  it('uses least practical repository permissions without secrets', () => {
    expect(workflow).toContain('contents: write');
    expect(workflow).not.toMatch(/secrets\./);
  });

  it('enforces the fifteen minute runtime budget', () => {
    expect(workflow).toContain('timeout-minutes: 15');
  });

  it('runs tests, typecheck, staged pipeline, validation, snapshots, build, and bundle checks', () => {
    expect(workflow).toContain('npm ci');
    expect(workflow).toContain('npm test');
    expect(workflow).toContain('npm run typecheck');
    expect(workflow).toContain('COMPUTEATLAS_DATA_DIR=public/data-staging npm run pipeline');
    expect(workflow).toContain('npm run data:validate:dir -- public/data-staging');
    expect(workflow).toContain('npm run data:snapshot -- public/data');
    expect(workflow).toContain('npm run build');
    expect(workflow).toContain('npm run bundle:check');
  });

  it('commits and pushes only generated public data from the successful commit branch', () => {
    expect(workflow).toContain('git add public/data');
    expect(workflow).not.toMatch(/git add \./);
    expect(workflow).not.toMatch(/git add -A/);
    expect(workflow).toContain('data: refresh automated snapshot');
    expect(workflow).not.toMatch(/\[skip ci\]|\[ci skip\]|\[skip actions\]/);

    const stepBody = commitGeneratedDataStepBody();
    const noChangeIndex = stepBody.indexOf('No generated data changes to commit');
    const elseIndex = stepBody.indexOf('else');
    const commitIndex = stepBody.indexOf('git commit -m "data: refresh automated snapshot"');
    const pushIndex = stepBody.indexOf('git push');
    const fiIndex = stepBody.indexOf('fi');

    expect(noChangeIndex).toBeGreaterThan(-1);
    expect(elseIndex).toBeGreaterThan(noChangeIndex);
    expect(stepBody.slice(noChangeIndex, elseIndex)).not.toContain('git push');
    expect(commitIndex).toBeGreaterThan(elseIndex);
    expect(pushIndex).toBeGreaterThan(commitIndex);
    expect(pushIndex).toBeLessThan(fiIndex);
  });

  it('pins every action use to an immutable full commit SHA and rejects mutable action refs', () => {
    const usesLines = nonCommentUsesLines();
    expect(usesLines.length).toBeGreaterThanOrEqual(2);
    for (const line of usesLines) {
      expect(line).toMatch(/uses: [^\s]+@[0-9a-f]{40}/);
    }
    expect(workflow).not.toMatch(/uses: actions\/.*@v[0-9]+/);
    expect(workflow).not.toMatch(/uses: .*@main/);
    expect(workflow).not.toMatch(/uses: .*@master/);
  });
});
