import type { CampaignRun, SourceInput, StyleProfile } from './agentEngine';

const sourceKey = 'wlm.source';
const styleKey = 'wlm.style';
const runsKey = 'wlm.runs';

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

export function saveSource(input: SourceInput): void {
  localStorage.setItem(sourceKey, JSON.stringify(input));
}

export function saveStyleSamples(samples: string): void {
  localStorage.setItem(styleKey, JSON.stringify(samples));
}

export function loadRuns(): CampaignRun[] {
  return read(runsKey, []);
}

export function saveRuns(runs: CampaignRun[]): void {
  localStorage.setItem(runsKey, JSON.stringify(runs.slice(0, 8)));
}

export function exportMarkdown(run: CampaignRun, profile: StyleProfile): string {
  return [
    `# WriteLikeMe Campaign`,
    '',
    `Created: ${new Date(run.createdAt).toLocaleString()}`,
    '',
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
    `## Angles`,
    ...run.angles.map((angle) => `- **${angle.label}**: ${angle.headline}`),
    '',
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
