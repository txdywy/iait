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
  it('deploys from push to main and manual dispatch without path filters', () => {
    expect(workflow).toContain('name: Deploy Pages');
    expect(workflow).toContain('push:');
    expect(workflow).toContain('branches: [main]');
    expect(workflow).toContain('workflow_dispatch:');
    expect(nonCommentWorkflow).not.toMatch(/^\s*paths:/m);
    expect(nonCommentWorkflow).not.toMatch(/^\s*paths-ignore:/m);
  });

  it('uses least-privilege Pages permissions without write access to contents', () => {
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('pages: write');
    expect(workflow).toContain('id-token: write');
    expect(workflow).not.toContain('contents: write');
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
