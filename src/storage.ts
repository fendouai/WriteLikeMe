import type { CampaignRun, NewsAggregation, SourceInput, StyleProfile, TopicEvaluation, OptimizationTrajectory } from './agentEngine';

const sourceKey = 'wlm.source';
const styleKey = 'wlm.style';
const runsKey = 'wlm.runs';
const runtimeConfigKey = 'wlm.runtimeConfig';
const newsAggregationKey = 'wlm.newsAggregation';

export type LlmProviderKey = 'openai' | 'anthropic' | 'gemini' | 'deepseek' | 'openrouter' | 'xai' | 'qwen' | 'kimi';
export type SearchProviderKey = 'tavily' | 'serper' | 'brave' | 'exa' | 'bing' | 'googleCse';

export type RuntimeConfig = {
  llmKeys: Record<LlmProviderKey, string>;
  searchKeys: Record<SearchProviderKey, string>;
};

const defaultRuntimeConfig: RuntimeConfig = {
  llmKeys: {
    openai: '',
    anthropic: '',
    gemini: '',
    deepseek: '',
    openrouter: '',
    xai: '',
    qwen: '',
    kimi: '',
  },
  searchKeys: {
    tavily: '',
    serper: '',
    brave: '',
    exa: '',
    bing: '',
    googleCse: '',
  },
};

export function loadSource(): SourceInput {
  return read(sourceKey, {
    url: 'https://jasper.ai',
    title: 'Jasper for builders and SaaS founders',
    audience: 'indie hackers, SaaS founders, AI builders',
    productContext:
      'WriteLikeMe helps builders turn product ideas, AI news, GitHub repos, and launch updates into multi-platform content that keeps their personal voice.',
    sourceText:
      'Jasper has evolved from an AI writing tool into an agent workspace for marketing teams. The opportunity is to create a lighter Jasper for builders: signal capture, angle mining, writing style fingerprint, platform adaptation, evaluation, and optimization.',
  });
}

export function loadStyleSamples(): string {
  return read(
    styleKey,
    '可以。这个方向真正有价值的地方，不是让 AI 多写几段文案，而是把一个模糊信号变成可以发布、可以复用、还能保持个人表达的一整套内容资产。\n\n我会先判断它解决了什么问题，再看谁会关心，最后把它拆成观点、结构和平台版本。普通 summary 工具停在信息复述，但创作者真正需要的是判断力和表达一致性。',
  );
}

export function loadRuntimeConfig(): RuntimeConfig {
  const stored = read<Partial<RuntimeConfig> & Record<string, unknown>>(runtimeConfigKey, {});
  const migrated = {
    llmKeys: { ...defaultRuntimeConfig.llmKeys, ...(stored.llmKeys || {}) },
    searchKeys: { ...defaultRuntimeConfig.searchKeys, ...(stored.searchKeys || {}) },
  };

  if (typeof stored.llmProvider === 'string' && typeof stored.llmApiKey === 'string' && stored.llmProvider in migrated.llmKeys) {
    migrated.llmKeys[stored.llmProvider as LlmProviderKey] ||= stored.llmApiKey;
  }
  if (typeof stored.searchProvider === 'string' && typeof stored.searchApiKey === 'string' && stored.searchProvider in migrated.searchKeys) {
    migrated.searchKeys[stored.searchProvider as SearchProviderKey] ||= stored.searchApiKey;
  }

  return migrated;
}

export function saveSource(input: SourceInput): void {
  localStorage.setItem(sourceKey, JSON.stringify(input));
}

export function saveStyleSamples(samples: string): void {
  localStorage.setItem(styleKey, JSON.stringify(samples));
}

export function saveRuntimeConfig(config: RuntimeConfig): void {
  localStorage.setItem(runtimeConfigKey, JSON.stringify(config));
}

export function loadNewsAggregation(): NewsAggregation | undefined {
  return read<NewsAggregation | undefined>(newsAggregationKey, undefined);
}

export function saveNewsAggregation(news: NewsAggregation): void {
  localStorage.setItem(newsAggregationKey, JSON.stringify(news));
}

export function loadRuns(): CampaignRun[] {
  return read(runsKey, []);
}

export function saveRuns(runs: CampaignRun[]): void {
  localStorage.setItem(runsKey, JSON.stringify(runs.slice(0, 8)));
}

export function exportMarkdown(
  run: CampaignRun,
  profile: StyleProfile,
  news?: NewsAggregation,
  topicEvaluation?: TopicEvaluation,
  trajectory?: OptimizationTrajectory,
): string {
  return [
    `# WriteLikeMe Campaign`,
    '',
    `Created: ${new Date(run.createdAt).toLocaleString()}`,
    '',
    ...(news
      ? [
          `## News Aggregation`,
          `- Refreshed: ${new Date(news.refreshedAt).toLocaleString()}`,
          `- Refresh count: ${news.refreshCount}`,
          `- New items: ${news.newCount}`,
          `- Updated items: ${news.updatedCount}`,
          '',
          ...news.items.slice(0, 10).map((item) => `- **${item.sourceName} #${item.rank}**: ${item.title} (${item.isNew ? 'new' : `seen ${item.seenCount}x`})`),
          '',
        ]
      : []),
    `## Style Fingerprint`,
    `- Tone: ${profile.tone.join(', ')}`,
    `- Rhythm: ${profile.rhythm}`,
    `- Signature moves: ${profile.signatureMoves.join('; ')}`,
    '',
    `## Research Dossier`,
    `### User Persona`,
    ...run.research.userPersona.map((item) => `- **${item.label}**: ${item.detail}`),
    '',
    `### Real User Search Leads`,
    ...run.research.realUserLeads.map((lead) => `- **${lead.source}**: \`${lead.query}\` — ${lead.why}`),
    '',
    `### Knowledge Base`,
    ...run.research.knowledgeBase.map((item) => `- **${item.label}**: ${item.detail}`),
    '',
    `### Demand Map`,
    ...run.research.demandMap.map((item) => `- **${item.label}**: ${item.detail}`),
    '',
    `## Signals`,
    ...run.signal.map((item) => `- ${item}`),
    '',
    ...(run.writingObjective
      ? [
          `## Writing Objective`,
          `- Framework: ${run.writingObjective.framework}`,
          `- Summary: ${run.writingObjective.summary}`,
          `- Current cognition: ${run.writingObjective.currentCognition}`,
          `- Unique value: ${run.writingObjective.uniqueValue}`,
          `- Cognitive gap: ${run.writingObjective.cognitionGap}`,
          '',
          ...run.writingObjective.dimensions.map((item) => [
            `### ${item.label}`,
            `- Target: ${item.target}`,
            `- Reader gain: ${item.readerGain}`,
            `- Success metric: ${item.successMetric}`,
            '',
          ]).flat(),
        ]
      : []),
    ...(run.contentStructure
      ? [
          `## Content Structure`,
          `- Selected template: ${run.contentStructure.templates.find((template) => template.id === run.contentStructure.selectedTemplateId)?.name || run.contentStructure.selectedTemplateId}`,
          '',
          ...run.contentStructure.sections.map((section) => `- **${section.title}**: ${section.job} Reader gain: ${section.readerGain}`),
          '',
        ]
      : []),
    `## Angles`,
    ...run.angles.map((angle) => `- **${angle.label}**: ${angle.headline}`),
    '',
    ...(topicEvaluation
      ? [
          `## Topic Meeting`,
          `- Overall: ${topicEvaluation.overall}`,
          `- Verdict: ${topicEvaluation.verdict}`,
          `- Recommendation: ${topicEvaluation.recommendation}`,
          '',
          ...topicEvaluation.dimensions.map((item) => `- **${item.label} ${item.score}**: ${item.rationale}`),
          '',
        ]
      : []),
    ...(run.sectionDrafts
      ? [
          `## Section Drafts`,
          ...run.sectionDrafts.flatMap((section) => [
            `### ${section.title}`,
            `- Objective: ${section.objective}`,
            `- Reader gain: ${section.readerGain}`,
            `- Evidence prompt: ${section.evidencePrompt}`,
            '',
            section.draft,
            '',
          ]),
        ]
      : []),
    `## X Thread Versions`,
    ...run.versions.flatMap((version) => [
      `### ${version.name}`,
      '',
      version.positioning,
      '',
      version.thread,
      '',
      `Scores: Hook ${version.scores.hook}, Novelty ${version.scores.novelty}, Style ${version.scores.styleMatch}, AI Risk ${version.scores.aiSmellRisk}`,
      '',
    ]),
    '',
    ...(trajectory
      ? [
          `## Loop Engineer`,
          `- Engine: ${trajectory.engine.name} ${trajectory.engine.version}`,
          `- Iterations: ${trajectory.iterations}`,
          `- Stop reason: ${trajectory.stopReason}`,
          `- Converged: ${trajectory.converged}`,
          `- Rollbacks: ${trajectory.rollbackCount}`,
          `- Quality gate: ${trajectory.qualityGate.passed ? 'passed' : 'failed'} (overall floor ${trajectory.qualityGate.minOverall}, current overall ${trajectory.qualityGate.convergedOrCapped ? 'measured' : 'pending'})`,
          `- Start overall: ${Math.round(Object.values(trajectory.scoresStart).reduce((sum, v) => sum + v, 0) / Object.values(trajectory.scoresStart).length)}`,
          `- End overall: ${Math.round(Object.values(trajectory.scoresEnd).reduce((sum, v) => sum + v, 0) / Object.values(trajectory.scoresEnd).length)}`,
          `- Convergence thresholds: minIterations=${trajectory.options.minIterations}, improvementThreshold=${trajectory.options.improvementThreshold}, maxRegressions=${trajectory.options.maxRegressions}`,
          '',
          ...trajectory.passes.flatMap((pass) => [
            `### Pass ${pass.iteration}`,
            `- Quality gate: ${pass.qualityGate}${pass.rolledBack ? ` (rolled back: ${pass.rollbackReason})` : ''}`,
            `- Overall: ${pass.overallBefore} → ${pass.overallAfter}`,
            `- Targets: ${pass.targets.join('、')}`,
            `- Improvements: ${pass.improvements.length ? pass.improvements.join('；') : 'none'}`,
            `- Regressions: ${pass.regressions.length ? pass.regressions.join('；') : 'none'}`,
            '',
          ]),
        ]
      : []),
    `## Scores`,
    `- Hook: ${run.scores.hook}`,
    `- Novelty: ${run.scores.novelty}`,
    `- Style Match: ${run.scores.styleMatch}`,
    `- Platform Fit: ${run.scores.platformFit}`,
    `- Credibility: ${run.scores.credibility}`,
    `- AI Smell Risk: ${run.scores.aiSmellRisk}`,
    '',
    `## Assets`,
    ...run.assets.flatMap((asset) => [`### ${asset.platform}: ${asset.title}`, '', asset.content, '', `CTA: ${asset.cta}`, '']),
  ].join('\n');
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
