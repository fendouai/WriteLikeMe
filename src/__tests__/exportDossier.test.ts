import { describe, it, expect } from 'vitest';
import { exportMarkdown } from '../storage';
import { optimizeLoop, runCampaign, analyzeStyle } from '../agentEngine';
import type { SourceInput, StyleProfile } from '../agentEngine';

const source: SourceInput = {
  url: 'https://example.com/loop-engineer-export',
  title: 'Loop Engineer ships self-optimizing content loops',
  sourceText:
    'A self-optimizing writing loop turns weak dimensions into targeted rewrites, re-scores the work, and stops only when it converges or hits a quality floor.',
  audience: 'AI builders and content engineers',
  productContext:
    'WriteLikeMe is a desktop writing workspace that compresses a news signal into an engineered article plus platform assets, with a Loop Engineer that audits the final run.',
};

const style: StyleProfile = analyzeStyle(
  'Loop Engineer: keep the writer\'s voice intact, rewrite only the weakest dimensions, re-score, and stop only when the trajectory converges or hits the quality floor.',
);

describe('exportMarkdown dossier with Loop Engineer trajectory', () => {
  it('omits the Loop Engineer section when no trajectory is provided', () => {
    const run = runCampaign(source, style);
    const md = exportMarkdown(run, style);
    expect(md).not.toMatch(/^## Loop Engineer/m);
  });

  it('includes a Loop Engineer section with engine metadata when trajectory is provided', () => {
    const run = runCampaign(source, style);
    const { run: optimized, trajectory } = optimizeLoop(run, style);
    const md = exportMarkdown(optimized, style, undefined, undefined, trajectory);
    expect(md).toMatch(/^## Loop Engineer/m);
    expect(md).toMatch(/Engine: WriteLikeMe Loop Engineer v\d+/);
    expect(md).toMatch(/Iterations: \d+/);
    expect(md).toMatch(/Stop reason: (converged|max-iterations|quality-gate|regression-loop|no-improvement)/);
    expect(md).toMatch(/Rollbacks: \d+/);
    expect(md).toMatch(/Quality gate: (passed|failed)/);
    expect(md).toMatch(/Convergence thresholds: minIterations=\d+, improvementThreshold=\d+, maxRegressions=\d+/);
  });

  it('lists every pass with its quality-gate verdict and improvement/regression deltas', () => {
    const run = runCampaign(source, style);
    const { trajectory } = optimizeLoop(run, style, { maxIterations: 5 });
    const md = exportMarkdown(run, style, undefined, undefined, trajectory);
    for (const pass of trajectory.passes) {
      expect(md).toMatch(new RegExp(`### Pass ${pass.iteration}`));
      expect(md).toMatch(/Quality gate: (passed|regressed|no-change)/);
      expect(md).toMatch(/Overall: \d+ → \d+/);
      expect(md).toMatch(/Targets: /);
      expect(md).toMatch(/Improvements: /);
      expect(md).toMatch(/Regressions: /);
    }
  });

  it('preserves the Scores section after the Loop Engineer section', () => {
    const run = runCampaign(source, style);
    const { trajectory } = optimizeLoop(run, style);
    const md = exportMarkdown(run, style, undefined, undefined, trajectory);
    const loopIdx = md.indexOf('## Loop Engineer');
    const scoresIdx = md.indexOf('## Scores');
    expect(loopIdx).toBeGreaterThan(-1);
    expect(scoresIdx).toBeGreaterThan(loopIdx);
    // The Scores section still lists the core quality + virality dimensions.
    expect(md).toMatch(/- Hook: \d+/);
    expect(md).toMatch(/- Novelty: \d+/);
    expect(md).toMatch(/- Style Match: \d+/);
    expect(md).toMatch(/- Platform Fit: \d+/);
    expect(md).toMatch(/- Credibility: \d+/);
    expect(md).toMatch(/- AI Smell Risk: \d+/);
    expect(md).toMatch(/- Curiosity Gap: \d+/);
    expect(md).toMatch(/- Emotional Charge: \d+/);
    expect(md).toMatch(/- Shareability: \d+/);
    expect(md).toMatch(/- Comment Bait: \d+/);
    expect(md).toMatch(/- Screenshot Sentence: \d+/);
  });

  it('does not crash when trajectory.passes is empty (edge case for cap=0)', () => {
    const run = runCampaign(source, style);
    const { trajectory } = optimizeLoop(run, style, { maxIterations: 0 });
    const md = exportMarkdown(run, style, undefined, undefined, trajectory);
    expect(md).toMatch(/Iterations: 0/);
    expect(md).toMatch(/## Loop Engineer/);
  });
});
