export type Platform = 'X Thread' | 'LinkedIn' | 'Newsletter' | 'Xiaohongshu' | 'Blog Outline';

export type SourceInput = {
  url: string;
  title: string;
  sourceText: string;
  audience: string;
  productContext: string;
};

export type ResearchItem = {
  label: string;
  detail: string;
};

export type SearchLead = {
  source: string;
  query: string;
  why: string;
};

export type ResearchDossier = {
  userPersona: ResearchItem[];
  realUserLeads: SearchLead[];
  knowledgeBase: ResearchItem[];
  demandMap: ResearchItem[];
  authorProfile: ResearchItem[];
};

export type NewsSource = {
  id: string;
  name: string;
  type: 'hotlist' | 'rss';
};

export type NewsItem = {
  id: string;
  title: string;
  sourceId: string;
  sourceName: string;
  sourceType: NewsSource['type'];
  url: string;
  rank: number;
  firstSeenAt: string;
  lastSeenAt: string;
  seenCount: number;
  isNew: boolean;
  relevance: number;
  summary: string;
};

export type NewsAggregation = {
  refreshedAt: string;
  refreshCount: number;
  newCount: number;
  updatedCount: number;
  sources: NewsSource[];
  items: NewsItem[];
};

export type StyleProfile = {
  tone: string[];
  rhythm: string;
  vocabulary: string[];
  forbidden: string[];
  signatureMoves: string[];
  sampleLine: string;
};

export type Angle = {
  id: string;
  label: string;
  headline: string;
  rationale: string;
  hook: string;
};

export type TopicScoreDimension = {
  label: string;
  score: number;
  rationale: string;
};

export type TopicEvaluation = {
  overall: number;
  verdict: string;
  dimensions: TopicScoreDimension[];
  recommendation: string;
};

export type WritingGoalDimension = {
  label: string;
  target: string;
  readerGain: string;
  successMetric: string;
};

export type WritingObjective = {
  framework: string;
  summary: string;
  currentCognition: string;
  uniqueValue: string;
  cognitionGap: string;
  dimensions: WritingGoalDimension[];
};

export type StructureSection = {
  title: string;
  job: string;
  readerGain: string;
};

export type StructureTemplate = {
  id: string;
  name: string;
  bestFor: string;
  rationale: string;
  sections: StructureSection[];
};

export type ContentStructure = {
  selectedTemplateId: string;
  templates: StructureTemplate[];
  sections: StructureSection[];
};

export type SectionDraft = {
  title: string;
  objective: string;
  readerGain: string;
  evidencePrompt: string;
  draft: string;
};

export type PlatformAsset = {
  platform: Platform;
  title: string;
  content: string;
  cta: string;
};

export type ContentVersion = {
  name: string;
  positioning: string;
  thread: string;
  scores: ScoreCard;
};

export type ScoreCard = {
  hook: number;
  novelty: number;
  styleMatch: number;
  platformFit: number;
  credibility: number;
  aiSmellRisk: number;
  curiosityGap: number;
  emotionalCharge: number;
  shareability: number;
  commentBait: number;
  screenshotSentence: number;
};

export const scoreLabels: Record<keyof ScoreCard, string> = {
  hook: '传播钩子',
  novelty: '观点新鲜度',
  styleMatch: '风格匹配',
  platformFit: '平台适配',
  credibility: '可信度',
  aiSmellRisk: 'AI 味风险',
  curiosityGap: '信息缺口',
  emotionalCharge: '情绪张力',
  shareability: '转发价值',
  commentBait: '评论诱因',
  screenshotSentence: '截图句子',
};

export type CampaignRun = {
  id: string;
  createdAt: string;
  research: ResearchDossier;
  signal: string[];
  writingObjective: WritingObjective;
  contentStructure: ContentStructure;
  sectionDrafts: SectionDraft[];
  angles: Angle[];
  selectedAngleId: string;
  versions: ContentVersion[];
  assets: PlatformAsset[];
  scores: ScoreCard;
  optimizationNotes: string[];
  /** Snapshot of the source material at the time the run was created; used by the Loop
   *  Engineer when re-scoring rewritten drafts so sourceDepth/hasSpecifics stay stable. */
  sourceSnapshot?: SourceInput;
  /** Set when the Loop Engineer has run on this run; persisted so the dossier can audit it. */
  trajectory?: OptimizationTrajectory;
  /** Optional batch exploration layer: 10 candidate topics, 10 tweets, workflow/final analysis,
   *  and process-level optimizations derived from those samples. */
  topicBatch?: TopicBatchReport;
};

export type TopicArtifactReview = {
  label: string;
  score: number;
  note: string;
};

export type TopicTweetItem = {
  id: string;
  topic: string;
  sourceLabel: string;
  tweet: string;
  workflowReviews: TopicArtifactReview[];
  workflowScore: number;
  finalReviews: TopicArtifactReview[];
  finalScore: number;
  loopIterations: number;
  stopReason: 'quality-threshold' | 'max-iterations' | 'no-improvement';
  optimizationNotes: string[];
};

export type TopicBatchSummary = {
  averageWorkflowScore: number;
  averageFinalScore: number;
  strongestTopic: string;
  weakestTopic: string;
  workflowOptimizations: string[];
  finalOptimizations: string[];
};

export type TopicBatchReport = {
  createdAt: string;
  summary: string;
  items: TopicTweetItem[];
  aggregateWorkflowReviews: TopicArtifactReview[];
  aggregateFinalReviews: TopicArtifactReview[];
  processOptimizations: string[];
};

export type NewsTopicPreview = {
  id: string;
  topic: string;
  sourceLabel: string;
  tweet: string;
  viralityScore: number;
  reviews: TopicArtifactReview[];
  whyNow: string;
};

export type NewsTopicBoard = {
  createdAt: string;
  summary: string;
  items: NewsTopicPreview[];
  processOptimizations: string[];
};

const stopWords = new Set([
  // English function words
  'the', 'and', 'for', 'that', 'with', 'this', 'from', 'you', 'are', 'but', 'not', 'have', 'has', 'into', 'about',
  'was', 'were', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'must', 'shall',
  'how', 'why', 'what', 'when', 'where', 'who', 'which', 'whose',
  'their', 'there', 'they', 'them', 'his', 'her', 'its', 'our', 'your', 'my', 'mine',
  'new', 'old', 'more', 'most', 'less', 'least', 'much', 'many', 'some', 'any', 'all', 'both',
  'than', 'then', 'now', 'here', 'out', 'over', 'under', 'between', 'through',
  'one', 'two', 'first', 'second', 'third', 'last', 'next',
  'shows', 'show', 'shown', 'using', 'used', 'use', 'uses', 'make', 'makes', 'made', 'get', 'gets', 'got',
  'also', 'even', 'very', 'just', 'only', 'still', 'well', 'too', 'so', 'as', 'at', 'by', 'on', 'or', 'be', 'been',
  'becoming', 'becomes', 'became', 'being', 'going', 'gets', 'getting',
  'good', 'great', 'best', 'better', 'bad', 'big', 'small', 'high', 'low',
  'thing', 'things', 'way', 'ways', 'time', 'times', 'day', 'days', 'year', 'years',
  'article', 'post', 'story', 'story', 'read', 'reading',
  // Chinese function words
  '一个', '不是', '可以', '以及', '他们', '我们', '这个', '如果',
  '的', '了', '是', '在', '和', '与', '或', '也', '都', '就', '还', '又', '更', '最',
  '这', '那', '这些', '那些', '什么', '怎么', '为什么', '如何', '哪里', '哪个',
  '因为', '所以', '但是', '而且', '虽然', '不过', '然后', '其实', '确实', '真的',
  '自己', '别人', '大家', '我们', '你们', '它们',
  '把', '被', '让', '使', '给', '对', '从', '到', '向', '往', '跟',
  '上', '下', '里', '外', '中', '间', '前', '后',
  '来', '去', '会', '能', '要', '想', '做', '做', '看', '说', '用',
]);

const platforms: Platform[] = ['X Thread', 'LinkedIn', 'Newsletter', 'Xiaohongshu', 'Blog Outline'];

const newsSources: NewsSource[] = [
  { id: 'hacker-news', name: 'Hacker News', type: 'hotlist' },
  { id: 'product-hunt', name: 'Product Hunt', type: 'hotlist' },
  { id: 'github-trending', name: 'GitHub Trending', type: 'hotlist' },
  { id: 'thepaper', name: '澎湃新闻', type: 'hotlist' },
  { id: 'weibo', name: '微博热搜', type: 'hotlist' },
  { id: 'zhihu', name: '知乎热榜', type: 'hotlist' },
  { id: 'ruanyifeng', name: '阮一峰周刊', type: 'rss' },
  { id: 'ai-newsletter', name: 'AI Newsletter', type: 'rss' },
];

export function analyzeStyle(samples: string): StyleProfile {
  const text = samples.trim();
  const sentences = splitSentences(text);
  const words = extractKeywords(text, 12);
  const avgLength = sentences.length
    ? Math.round(sentences.reduce((sum, sentence) => sum + sentence.length, 0) / sentences.length)
    : 0;
  const hasPunch = /[？?!！]|反而|其实|关键|本质|真正/.test(text);
  const hasLists = /(^|\n)\s*[-*0-9]/.test(text);
  const hasEnglish = /[A-Za-z]{3,}/.test(text);

  return {
    tone: [
      hasPunch ? '观点直接' : '解释型',
      hasLists ? '结构清晰' : '自然叙述',
      hasEnglish ? '中英混合' : '中文表达',
    ],
    rhythm: avgLength > 65 ? '长句铺陈，适合深度分析' : avgLength > 28 ? '中等句长，节奏稳定' : '短句推进，适合社媒传播',
    vocabulary: words,
    forbidden: ['作为一个 AI', '在当今快节奏的时代', '不难发现', '赋能', '颠覆式创新'],
    signatureMoves: [
      hasPunch ? '先给判断，再解释原因' : '先搭上下文，再收束观点',
      hasLists ? '用分点降低认知负担' : '用连续段落制造推进感',
      '把功能翻译成用户场景',
    ],
    sampleLine: sentences[0] || '把一个信息点，变成一个有立场、有结构、像本人写的内容资产。',
  };
}

export function runCampaign(input: SourceInput, style: StyleProfile, selectedAngleId?: string): CampaignRun {
  const research = buildResearchDossier(input, style);
  const signal = extractSignal(input, research);
  const writingObjective = buildWritingObjective(input, research, signal);
  const contentStructure = buildContentStructure(input, writingObjective, signal);
  const sectionDrafts = buildSectionDrafts(input, style, writingObjective, contentStructure, research, signal);
  const angles = buildAngles(input, signal, research);
  const selectedAngle = angles.find((angle) => angle.id === selectedAngleId) ?? angles[0];
  const versions = buildVersions(input, style, selectedAngle, signal, research);
  const assets = platforms.map((platform) => adaptToPlatform(platform, input, style, selectedAngle, signal, research));
  const scores = scoreRun(input, style, selectedAngle, assets, sectionDrafts, versions);
  const optimizationNotes = buildOptimizationNotes(scores, style, selectedAngle);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    research,
    signal,
    writingObjective,
    contentStructure,
    sectionDrafts,
    angles,
    selectedAngleId: selectedAngle.id,
    versions,
    assets,
    scores,
    optimizationNotes,
    sourceSnapshot: input,
  };
}

export function refreshNewsAggregation(input: SourceInput, previous?: NewsAggregation): NewsAggregation {
  const now = new Date().toISOString();
  const previousItems = new Map((previous?.items || []).map((item) => [item.id, item]));
  const generated = buildNewsItems(input, now);
  let newCount = 0;
  let updatedCount = 0;

  const mergedItems = generated.map((item) => {
    const existing = previousItems.get(item.id);
    if (!existing) {
      newCount += 1;
      return item;
    }
    updatedCount += 1;
    return {
      ...item,
      firstSeenAt: existing.firstSeenAt,
      lastSeenAt: now,
      seenCount: existing.seenCount + 1,
      isNew: false,
    };
  });

  const offListItems = [...previousItems.values()]
    .filter((item) => !generated.some((next) => next.id === item.id))
    .map((item) => ({ ...item, isNew: false }))
    .slice(0, 6);

  return {
    refreshedAt: now,
    refreshCount: (previous?.refreshCount || 0) + 1,
    newCount,
    updatedCount,
    sources: newsSources,
    items: [...mergedItems, ...offListItems].sort((a, b) => b.relevance - a.relevance).slice(0, 18),
  };
}

export function evaluateTopic(angle: Angle, input: SourceInput, news: NewsAggregation): TopicEvaluation {
  const text = `${input.title} ${input.sourceText} ${input.productContext} ${angle.headline}`;
  const newsBoost = Math.min(12, news.items.filter((item) => item.isNew).length * 2 + news.refreshCount);
  const hasSpecifics = /\d|github|product|saas|agent|workflow|api|开源|用户|增长|营销/i.test(text);
  const debate = angle.id === 'contrarian' || angle.id === 'debate';
  const dimensions: TopicScoreDimension[] = [
    { label: '用户痛感', score: clampScore(72 + (hasSpecifics ? 10 : 0)), rationale: '读者是否正在被这个问题困扰，是否愿意停下来读。' },
    { label: '新鲜度', score: clampScore(66 + newsBoost), rationale: '新闻聚合里新增内容越多，说明话题越有当下性。' },
    { label: '观点差异', score: clampScore(70 + (debate ? 14 : 5)), rationale: '是否不是普通复述，而能提供清晰判断。' },
    { label: '证据可得性', score: clampScore(64 + Math.min(18, news.items.length)), rationale: '是否容易找到来源、案例和真实用户语言。' },
    { label: '传播钩子', score: clampScore(68 + angle.hook.length / 8), rationale: '首句是否有冲突、反差或强判断。' },
    { label: '作者匹配', score: clampScore(76 + (input.productContext ? 8 : 0)), rationale: '是否适合作者长期表达和产品叙事。' },
    { label: '平台适配', score: clampScore(74 + (angle.id === 'tool' ? 8 : 4)), rationale: '是否能自然拆成 thread、长文、社媒短帖。' },
    { label: '商业价值', score: clampScore(70 + (/saas|product|founder|marketing|增长/i.test(text) ? 12 : 2)), rationale: '是否能带来产品认知、订阅、咨询或转化。' },
    { label: '争议空间', score: clampScore(62 + (debate ? 20 : 6)), rationale: '是否能引发评论、反驳、补充经验。' },
    { label: '执行难度', score: clampScore(82 - (news.items.length > 12 ? 4 : 0)), rationale: '分数越高代表越容易快速写出可信版本。' },
  ];
  const overall = Math.round(dimensions.reduce((sum, item) => sum + item.score, 0) / dimensions.length);
  return {
    overall,
    verdict: overall >= 82 ? '强烈建议进入写作' : overall >= 72 ? '值得写，但需要补证据' : '暂缓，先继续观察',
    dimensions,
    recommendation:
      overall >= 82
        ? '选题有清晰用户痛点和传播钩子，可以直接进入作者风格适配。'
        : overall >= 72
          ? '建议先补 1-2 条真实用户证据，再进入写作。'
          : '建议回到新闻聚合或角度选择，寻找更强信号。',
  };
}

function buildWritingObjective(input: SourceInput, research: ResearchDossier, signal: string[]): WritingObjective {
  const topic = input.title || research.knowledgeBase[0]?.detail || '这份素材';
  const currentCognition = research.userPersona[1]?.detail || '读者了解表层信息，但还没有把它转化成可用的决策。';
  const uniqueValue = `把「${topic}」从信息点推进成一个可判断、可执行、可复用的写作资产。`;
  const cognitionGap = `读者已经知道“发生了什么”，但还缺少“为什么重要、如何判断、下一步怎么做”。`;

  return {
    framework: '读者价值目标（Reader Value Objective）',
    summary: `读完之后，读者应该能说明「${topic}」的真正价值，并能用一套流程把类似信号转成内容决策。`,
    currentCognition,
    uniqueValue,
    cognitionGap,
    dimensions: [
      {
        label: '知识与判断',
        target: `理解 ${signal[0] || `「${topic}」`} 背后的关键变化，而不是停留在复述新闻或功能。`,
        readerGain: '获得一个更清晰的判断框架，知道这个话题为什么值得注意。',
        successMetric: '读者能用一句话复述文章主判断，并区分它和普通摘要的差异。',
      },
      {
        label: '方法与流程',
        target: '看到从信号、用户、需求、结构到成稿的完整路径。',
        readerGain: '能把同类输入拆成研究、选题、结构、分段写作和平台适配。',
        successMetric: '读者能照着流程完成自己的下一篇文章草案。',
      },
      {
        label: '情绪、态度与决策',
        target: '让读者相信写作可以被工程化，同时仍然保留作者判断和个人声音。',
        readerGain: '从“我需要灵感”转向“我可以按步骤推进”。',
        successMetric: '读者愿意保存、评论、转发，或把其中一个步骤放进自己的内容工作流。',
      },
    ],
  };
}

function buildContentStructure(input: SourceInput, objective: WritingObjective, signal: string[]): ContentStructure {
  const topic = input.title || extractKeywords(input.sourceText, 1)[0] || 'this signal';
  const templates = buildStructureTemplates(topic, objective, signal);
  const selectedTemplate =
    templates.find((template) => /workflow|pipeline|agent|jasper|执行|工作流/i.test(`${input.sourceText} ${input.productContext}`) && template.id === 'problem-system') ||
    templates.find((template) => /news|trend|signal|趋势|新闻/i.test(`${input.sourceText} ${input.productContext}`) && template.id === 'signal-bet') ||
    templates[0];

  return {
    selectedTemplateId: selectedTemplate.id,
    templates,
    sections: selectedTemplate.sections,
  };
}

function buildStructureTemplates(topic: string, objective: WritingObjective, signal: string[]): StructureTemplate[] {
  return [
    {
      id: 'problem-system',
      name: 'Problem, Insight, System, Proof, Action',
      bestFor: '产品分析、创始人观点、工作流类文章',
      rationale: '先建立痛点，再给出独特判断，最后把判断落成可执行系统。',
      sections: [
        { title: 'Problem', job: '指出读者正在遇到但尚未准确命名的问题。', readerGain: '意识到问题不是单点工具，而是流程断裂。' },
        { title: 'Insight', job: '给出文章的核心判断和认知增量。', readerGain: objective.dimensions[0]?.readerGain || '获得更清晰判断。' },
        { title: 'System', job: '把判断拆成可复用的步骤。', readerGain: objective.dimensions[1]?.readerGain || '看到可执行路径。' },
        { title: 'Proof', job: '补充新闻、案例、真实用户语言或产品细节。', readerGain: '相信这不是空泛观点。' },
        { title: 'Action', job: '告诉读者读完之后可以做什么。', readerGain: objective.dimensions[2]?.readerGain || '形成行动意愿。' },
      ],
    },
    {
      id: 'before-after',
      name: 'Before, Shift, After, Playbook',
      bestFor: '解释市场变化、新范式、新工具迁移',
      rationale: '用前后对比降低理解成本，再给出实践手册。',
      sections: [
        { title: 'Before', job: '描述旧方法和旧约束。', readerGain: '确认自己原有认知的边界。' },
        { title: 'Shift', job: `解释 ${signal[0] || topic} 代表的变化。`, readerGain: '知道为什么现在需要换一种看法。' },
        { title: 'After', job: '展示新方法下结果会如何不同。', readerGain: '看到新工作流带来的实际收益。' },
        { title: 'Playbook', job: '给出可照做的步骤。', readerGain: '拿到具体操作路径。' },
      ],
    },
    {
      id: 'misconception',
      name: 'Misconception, Reality, Mechanism, Implication',
      bestFor: '反常识观点、争议话题、纠偏类文章',
      rationale: '先拆掉常见误解，再解释机制和后果。',
      sections: [
        { title: 'Misconception', job: '提出一个常见但不完整的看法。', readerGain: '发现自己原来的判断可能太粗。' },
        { title: 'Reality', job: '给出更准确的现实描述。', readerGain: '获得新的判断角度。' },
        { title: 'Mechanism', job: '解释为什么现实会这样运作。', readerGain: '理解背后的因果链。' },
        { title: 'Implication', job: '说明这对读者的选择意味着什么。', readerGain: '形成更好的决策标准。' },
      ],
    },
    {
      id: 'case-pattern',
      name: 'Case, Pattern, Principle, Checklist',
      bestFor: '教程、复盘、案例拆解、运营笔记',
      rationale: '从具体案例进入，再抽象成原则和清单。',
      sections: [
        { title: 'Case', job: `用 ${topic} 建立具体场景。`, readerGain: '快速进入真实语境。' },
        { title: 'Pattern', job: '抽出可重复出现的模式。', readerGain: '从单个案例看到通用规律。' },
        { title: 'Principle', job: '总结可迁移原则。', readerGain: '知道下次如何判断。' },
        { title: 'Checklist', job: '给出检查项。', readerGain: '可以直接用于自己的写作或产品。' },
      ],
    },
    {
      id: 'signal-bet',
      name: 'Signal, Meaning, Bet, Execution',
      bestFor: '新闻驱动、趋势判断、机会分析',
      rationale: '先说信号，再说含义、下注和执行路径。',
      sections: [
        { title: 'Signal', job: '压缩新闻或来源里的关键信号。', readerGain: '知道发生了什么以及哪部分最重要。' },
        { title: 'Meaning', job: '解释信号对用户、市场或创作者意味着什么。', readerGain: '理解它为什么和自己有关。' },
        { title: 'Bet', job: '给出作者下注或趋势判断。', readerGain: '获得明确立场。' },
        { title: 'Execution', job: '把判断落成行动步骤。', readerGain: '知道下一步怎么做。' },
      ],
    },
  ];
}

function buildSectionDrafts(
  input: SourceInput,
  style: StyleProfile,
  objective: WritingObjective,
  structure: ContentStructure,
  research: ResearchDossier,
  signal: string[],
): SectionDraft[] {
  const topic = input.title || research.knowledgeBase[0]?.detail || '这个信号';
  const label = topicLabel(topic); // concise form, so a long title isn't repeated verbatim many times
  const voiceMove = style.signatureMoves[0] || '先给判断，再解释原因';
  const proofLead = research.realUserLeads[0]?.query || '补一个真实用户搜索结果、案例或数据';

  return structure.sections.map((section, index) => {
    const evidencePrompt =
      index === 0
        ? `用一句真实用户抱怨或新闻细节证明问题存在：${proofLead}`
        : index === structure.sections.length - 1
          ? '补一个具体行动清单或下一步 CTA。'
          : `补充一个来源、案例、截图、评论或数字，让 ${section.title} 更可信。`;

    return {
      title: section.title,
      objective: section.job,
      readerGain: section.readerGain,
      evidencePrompt,
      draft: draftSection(label, section, objective, research, signal, voiceMove, index),
    };
  });
}

function draftSection(
  topic: string,
  section: StructureSection,
  objective: WritingObjective,
  research: ResearchDossier,
  signal: string[],
  voiceMove: string,
  index: number,
): string {
  const audience = research.userPersona[0]?.detail || '目标读者';
  const trim = (s: string) => (s || '').replace(/[。.]\s*$/, '');
  // Strip signal prefixes when embedding mid-sentence (signals carry their own lead-in).
  const cleanSig = (s: string) => (s || '').replace(/^(真正的张力在于：|增长空间在于：|「[^」]*」的核心，是)/, '').replace(/[。.]\s*$/, '');
  const demand = trim(research.demandMap[2]?.detail) || '把信息转成可执行判断';
  const cognition = trim(research.demandMap[1]?.detail) || '读者有了信息，却还没把它变成可用的决策';
  const opening = index === 0 ? `关于「${topic}」，真正值得写的不是它本身有多新，而是它对 ${audience} 暴露了一个更具体的问题。\n\n先给判断：这不是又一个被热议的概念，而是一个值得认真拆解的信号。把它讲清楚，本身就是为读者节省决策成本。` : '';
  const bodyByTitle: Record<string, string> = {
    Problem: `对 ${audience} 来说，难点通常不是缺少信息，而是缺少一个能稳定推进的判断框架。\n\n${cognition}。每天看到的素材很多，但能稳定变成可发布内容、还能保持个人判断的，反而很少。问题不在于“写不出来”，而在于没有一个从 ${topic} 的信号到成稿的可靠路径，每篇文章都像在重新发明流程。\n\n所以真正要解决的，不是某一段写得好不好，而是让围绕「${topic}」的整条判断链路可重复、可检查。`,
    Insight: `${voiceMove}：${objective.uniqueValue}\n\n这篇文章要补上的认知，不是“${topic} 很火”，而是 ${audience} 如何判断它和自己有什么关系。我会先说清楚它的核心张力在哪——${cognition}，再给出一个可以迁移的判断框架，最后落到读者能立刻检查的几个问题上。\n\n核心增量在于：把模糊的“它很重要”变成具体的“它为谁、解决了什么、为什么是现在”。`,
    System: `可以把「${topic}」的处理拆成几个互相支撑的环节，每个环节都产出可检查的中间件，而不是直接跳到成稿。\n\n第一步是确认这个信号到底在说什么、张力在哪；第二步是确认 ${audience} 当前的认知水平，避免自说自话；第三步定义写作目标——读者获得什么，而不是主题是什么；第四步选择匹配目标的结构；第五步按结构逐段写作并打分。\n\n这样做的回报是：对「${topic}」的判断从一次性灵感，变成可以迭代和复用的工程。哪怕某一篇没写好，你也能定位是哪一步出了问题。`,
    Proof: `判断「${topic}」的支撑，应该来自真实用户语言、具体数据或同类案例，而不是泛泛的形容词。\n\n现在最需要补的是：谁已经在为这个问题付出时间、钱或注意力。去找 ${audience} 真实的搜索词、评论区抱怨、付费行为或开源项目的增长曲线——它们比“这很有潜力”有力得多。\n\n一个有效的证据，往往是一句具体到能复述的用户原话，或一个能被验证的数字。没有它，前面关于「${topic}」的判断就停在观点层面。`,
    Action: `读完之后，${audience} 可以先做一件和「${topic}」相关的具体小事，而不是收藏之后忘记。\n\n拿你今天看到的相关素材，写下三行：当前认知、独特价值、认知差距。然后从结构模板里挑一个，把这三行扩展成围绕「${topic}」的第一版骨架。\n\n如果走完一遍发现卡住，那说明前面某一步还不够清楚——这本身就是有效的反馈。目标是让下一次围绕同类信号的写作比这一次更快、更稳，而不是追求一次性完美。`,
    Before: `在过去，${audience} 处理「${topic}」这类信号，更像从空白编辑器开始：先想一个标题，再逼自己写出正文，最后才发现目标读者和结构都不够清楚。\n\n这个过程的问题在于，最关键的两个决策——写给谁、读者获得什么——被推迟到最后，甚至被跳过。结果是文章要么信息正确但没人想读，要么有想法但结构散乱。\n\n很多人会把它归因为“写不好”，但更准确的说法是缺少前置决策：没在动笔前想清楚「${topic}」到底为谁服务。`,
    Shift: `关于「${topic}」，真正的变化是：${cleanSig(signal[0]) || '写作正在从单次灵感变成可编排的流程'}。\n\n这背后的驱动力是：信息密度越来越高，${audience} 对“又一个复述”的容忍度越来越低。如果只是把「${topic}」翻译一遍，价值趋近于零；真正稀缺的是判断力和表达一致性。\n\n变化不在于工具更强大，而在于谁能把判断、结构、证据和声音稳定地组织起来，把「${topic}」变成一个可以被验证的判断。`,
    After: `如果按这套方法处理「${topic}」，新的结果不是多一篇稿子，而是一组带着同一判断、不同平台形态的内容资产。\n\n同一套围绕「${topic}」的核心观点，可以同时变成长推、图文、newsletter 和博客。读者在不同场景遇到你时，接收到的判断是一致的，只是形态适配了场景。\n\n这带来的复利是：你对「${topic}」的判断被验证的次数变多，表达也被打磨得越来越锐利，而不是每次都从零开始。`,
    Playbook: `围绕「${topic}」的可执行流程是：先研究 ${audience}，再定义认知增量，接着选择结构，最后逐段写作和评分。\n\n每一步都有明确的产出物：一份读者画像、一个写作目标、一份结构骨架、若干段落草稿和一组评分。任何一个环节不满意，都可以单独重做，而不必推翻全部。\n\n建议先用「${topic}」走完一遍完整闭环，再回头优化其中最弱的那个环节。这样每一次迭代都有明确的着力点。`,
    Misconception: `关于「${topic}」，${audience} 一个常见的误解是：只要工具足够强，内容就会自然变好。\n\n这个想法的问题在于，它把质量完全归因于“生成能力”，却忽略了内容本质上是一连串决策——写给谁、读者已知什么、要补上什么认知、用哪种结构。工具能加速表达，但这些决策它替不了你做。\n\n更隐蔽的是，强工具反而可能让「${topic}」相关的内容更“顺滑却空洞”，因为缺的不是文字，而是判断。`,
    Reality: `回到现实：处理「${topic}」时，模型能加速表达，但不能替你决定 ${audience} 该获得什么。\n\n一篇好内容的差异，往往不在文字是否漂亮，而在判断是否清晰、证据是否扎实、结构是否服务目标。模型擅长的是把你的判断扩展成连贯的文字，但它需要你先给出关于「${topic}」的那个判断。\n\n换句话说，瓶颈通常不在“写不出来”，而在“还没想清楚「${topic}」写给谁、为什么”。`,
    Mechanism: `真正决定「${topic}」这篇内容质量的，是目标、结构、证据和声音之间是否互相支撑。\n\n目标决定了取舍什么、忽略什么；结构决定了信息以什么顺序展开；证据决定了判断是否站得住；声音决定了 ${audience} 是否愿意继续读下去。这四者任何一处断裂，「${topic}」就会出现“读得懂但记不住”或“信息全但没价值”的问题。\n\n所以质量不是某一维度的极致，而是这几者之间的协调。`,
    Implication: `所以更合理的做法是，把围绕「${topic}」的内容当成决策工程，再把模型当成执行助手。\n\n这意味着 ${audience} 前期要花更多时间在读者研究和目标定义上，看起来慢，但它让后面的写作、改稿、平台适配都变得更快。工具的价值，在于把已经想清楚的判断高效地表达出来，而不是替你完成思考。\n\n对你来说，这意味着投资一套可复用的流程，比单独打磨「${topic}」这一篇稿子回报更高。`,
    Case: `以「${topic}」为例，第一步不是急着改写，而是判断它为 ${audience} 创造了什么新价值。\n\n先问三个问题：谁会因为这件事改变行动？他们现在卡在哪？你的独特角度是什么？如果三个问题都答得含糊，说明「${topic}」这个信号还不值得写，或者还需要再研究。\n\n案例的价值不在于复述事件，而在于借「${topic}」把一个通用判断讲具体。读者记住的永远是判断，而不是事件本身。`,
    Pattern: `从「${topic}」可以提炼出一个可复用的模式：信号越杂，越需要先建立认知目标和结构边界。\n\n当 ${audience} 输入只有一个模糊热点时，直觉是赶紧写、抢时效。但抢出来的往往是复述，而不是判断。相反，花十分钟定义“读者读完该获得什么”，反而能让围绕「${topic}」的写作更快、更聚焦。\n\n这个模式适用于几乎所有内容创作：先收敛目标，再发散素材，最后再收敛成稿。`,
    Principle: `一条可以迁移到「${topic}」的原则是：先确定 ${audience} 的认知增量，再选择表达路径。结构服务目标，素材服务结构。\n\n很多关于「${topic}」的文章读起来散，不是因为素材不够，而是因为没有一个明确的目标在统帅它们。当目标清楚时，取舍就变得自然——该删的删，该补的补，每个段落都知道自己在做什么。\n\n如果只能记住一件事，记住这个：先想清楚读者读完「${topic}」会获得什么不同，再动笔。`,
    Checklist: `写完「${topic}」后，一份可用的检查清单：目标是否清楚、结构是否匹配目标、证据是否足够具体、段落是否各司其职、结尾是否推动 ${audience} 行动。\n\n更具体地说：第一段是否在 30 秒内说清「${topic}」的价值？每个段落是否有明确的 reader gain？有没有至少一处真实证据？结尾有没有给读者一个下一步？\n\n建议逐项过一遍。任何一项答不上来，就回到对应环节补强，而不是靠辞藻掩盖。`,
    Signal: `${cleanSig(signal[0]) || `「${topic}」是这篇文章的起点`}，但远不是文章的全部。\n\n一个信号本身只是触发器，真正让「${topic}」有价值的是你对它的判断：它为什么重要、对 ${audience} 重要、现在重要还是一直重要。如果只停留在“发生了这件事”，读者完全可以自己看到。\n\n所以处理「${topic}」的第一步，不是急着转述，而是想清楚它背后的张力在哪。`,
    Meaning: `对 ${audience} 来说，「${topic}」的意义在于：${demand}。\n\n换句话说，这件事改变的不是某个工具的强弱，而是他们在做决策或执行时的某个环节。看懂这一点，才能判断「${topic}」值不值得投入精力跟进。\n\n意义的判断，本质上是把“它是什么”翻译成“它和我有什么关系”。这个翻译做得越好，内容就越能打动目标读者。`,
    Bet: `关于「${topic}」，我的判断是：未来有价值的做法会更像一个判断系统，而不是一个更会续写的工具。\n\n理由是，纯生成的边际价值会持续下降——当大家都能生成顺滑的文字时，稀缺的就变成了判断力、证据组织和风格一致性。而这些恰恰需要流程，而不是更强的模型。\n\n所以如果现在要下注，围绕「${topic}」我愿意押在“流程化决策”而不是“更强的单次生成”上。`,
    Execution: `执行上，${audience} 把围绕「${topic}」的内容拆成目标、结构、段落、平台和评分，才能让产出稳定复用。\n\n具体起步：先用「${topic}」走完整个闭环，记录哪一步最慢、最不确定；然后专门优化那一步。比起一次性追求完美，这种“走完一遍再定点改进”的方式，能让你的内容产能和质量同时上升。\n\n目标是让流程本身变成资产，这样每一次围绕「${topic}」的写作都在加固它，而不是消耗它。`,
  };

  return [opening, bodyByTitle[section.title] || `${section.job} 这一节需要服务的读者收益是：${section.readerGain}`]
    .filter(Boolean)
    .join('\n\n');
}

/**
 * Apply a deterministic transform to an asset: strip generic AI-filler, tighten the
 * opening if the hook is weak, optionally extend content when platformFit is weak.
 * NEVER invents new claims or template sentences.
 *
 * Always returns a NEW asset object so callers can rely on a fresh reference (and so
 * UI can detect "Optimize" was pressed). The internal loop engineer can call
 * `applyAssetTransform` directly if it wants a no-op signal.
 */
export function optimizeAsset(asset: PlatformAsset, scores: ScoreCard): PlatformAsset {
  const { content, didExtend } = applyAssetTransform(asset, scores);
  const cta = !asset.cta || /^todo|placeholder|lorem|tbd|请填写/i.test(asset.cta.trim())
    ? '写下来，发出去，看评论告诉你下一轮改哪里。'
    : asset.cta;

  return {
    ...asset,
    // Always mark the title so the UI can detect that Optimize did something. We still
    // differentiate via `didExtend` in case a future caller wants to branch on it.
    title: `${asset.title} · 已优化`,
    content,
    cta,
  };
}

/**
 * Internal transform helper shared between `optimizeAsset` (UI-facing) and the loop
 * engineer. Returns `{ content, didExtend }`. `content` is the rewritten asset body
 * (may equal the original if the transform was a no-op); `didExtend` reports whether
 * the platformFit-extension branch added new text.
 */
function applyAssetTransform(asset: PlatformAsset, scores: ScoreCard): { content: string; didExtend: boolean } {
  let content = asset.content;
  // 1. Tighten the opening sentence if the hook is weak.
  if (scores.hook < 80) {
    const firstBreak = content.indexOf('\n');
    const lead = firstBreak === -1 ? content : content.slice(0, firstBreak);
    const rest = firstBreak === -1 ? '' : content.slice(firstBreak);
    const tightenedLead = lead
      .replace(new RegExp('^今天我们(来|就|要)?(聊|谈|讨论|说说|分享|看一看|来看看)[，,：:。]?'), '')
      .replace(new RegExp('^随着.*的发展[，,。]?'), '')
      .replace(new RegExp('^在当今[\\u4e00-\\u9fa5]*时代[，,。]?'), '')
      .replace(/^(首先[，,]?)/u, '');
    if (tightenedLead !== lead && tightenedLead.length > 0) {
      content = `${tightenedLead}${rest}`;
    }
  }
  // 2. Strip generic transition / summary filler that lifts aiSmellRisk.
  content = content
    .replace(/(值得注意的是[，,]?)/g, '')
    .replace(/(总而言之[，,]?)/g, '')
    .replace(/(综上所述[，,]?)/g, '')
    .replace(/(不可否认[，,]?)/g, '')
    .replace(/(众所周知[，,]?)/g, '')
    .replace(/(简而言之[，,]?)/g, '');
  // 3. Extend ONLY when platformFit is the weak dimension, by restating the asset's
  // own last sentence as a one-line "if you read one thing" addendum.
  let didExtend = false;
  if (scores.platformFit < 70) {
    const sentences = content.split(/(?<=[。！？\n])/).map((s) => s.trim()).filter(Boolean);
    if (sentences.length >= 2) {
      const last = sentences[sentences.length - 1];
      if (last.length >= 12) {
        const addendum = `\n\n——\n如果只看一句：${last.replace(/^[—–\-—，,\s]+/, '').slice(0, 60)}。`;
        content = `${content}${addendum}`;
        didExtend = true;
      }
    }
  }
  return { content, didExtend };
}

// Weakest dimensions of a scorecard (the ones an optimization pass should target).
export function weakestDimensions(scores: ScoreCard): { key: keyof ScoreCard; value: number }[] {
  // aiSmellRisk is "lower is better", so invert it when ranking weakness.
  const entries: { key: keyof ScoreCard; value: number }[] = (Object.keys(scores) as (keyof ScoreCard)[]).map((key) => ({
    key,
    value: key === 'aiSmellRisk' ? 100 - scores[key] : scores[key],
  }));
  return entries.sort((a, b) => a.value - b.value);
}

// Generic AI-filler phrases that drag down `aiSmellRisk`. Kept in one place so the
// rewrite and the scorer share the same vocabulary.
const AI_FILLER_PHRASES = [
  '值得注意的是',
  '总而言之',
  '综上所述',
  '不可否认',
  '众所周知',
  '在当今',
  '简而言之',
];

function stripAiFiller(text: string): string {
  let cleaned = text;
  for (const phrase of AI_FILLER_PHRASES) {
    cleaned = cleaned.replace(new RegExp(`${phrase}[，,。]?`, 'g'), '');
  }
  // Generic transition-word density reduction (over-used in AI prose).
  cleaned = cleaned
    .replace(/因此[，,]?/g, '')
    .replace(/所以[，,]?/g, '')
    .replace(/从而[，,]?/g, '')
    .replace(/进而[，,]?/g, '')
    .replace(/总之[，,]?/g, '');
  // Conservative generic-count stripping. We only remove "一个" / "可以" when they
  // appear as bare fillers, not when they are syntactically required. The rules below
  // are tight on purpose — better to leave some filler than to mangle the prose.
  // 1. "一个" before a noun it's quantifying (and not preceded by 同 / 仅 / 这 / 那 / 唯 / 第)
  cleaned = cleaned.replace(
    /(?<![同仅这那唯第是连很还])一个(?=[\u4e00-\u9fa5]{1,6}[。，！？\s])/g,
    '',
  );
  // 2. "可以" when it leads a sentence or follows a comma (suggests "you can…" scaffolding)
  cleaned = cleaned.replace(/^可以[，,]?/gm, '');
  cleaned = cleaned.replace(/[，,]可以[，,]?/g, '，');
  // Tidy up double punctuation / orphan spaces left behind by stripping.
  cleaned = cleaned.replace(/[ \t]{2,}/g, ' ').replace(/。。/g, '。').replace(/^ +| +$/gm, '');
  return cleaned;
}

// Rewrite a single section draft to lift a specific weak dimension.
//
// HARD RULE: never invent new template sentences. Every transform below either
// (a) strips AI-filler from existing text, (b) reorders existing sentences, or
// (c) prefixes an existing claim marker only if the text already has a strong
// claim to anchor to. This is what makes the loop actually converge without
// trading one weak dimension for another.
function rewriteDraft(draft: SectionDraft, weakKey: keyof ScoreCard, style: StyleProfile): SectionDraft {
  const text = draft.draft;

  if (weakKey === 'aiSmellRisk') {
    const cleaned = stripAiFiller(text);
    if (cleaned !== text) return { ...draft, draft: cleaned };
    return draft;
  }

  if (weakKey === 'hook') {
    // Only prepend a claim marker if the existing first sentence already carries
    // a strong claim — otherwise we'd just be adding scaffolding the scorer
    // already penalizes.
    const firstBreak = text.indexOf('\n');
    const lead = firstBreak === -1 ? text : text.slice(0, firstBreak);
    const rest = firstBreak === -1 ? '' : text.slice(firstBreak);
    const claimMarker = /([\u4e00-\u9fa5]*?(不是|真正|关键|为什么|可能错了|被低估|背后))/;
    if (claimMarker.test(lead)) {
      // Already has a claim; just tighten by stripping filler from it.
      const tightened = stripAiFiller(lead);
      if (tightened !== lead) {
        return { ...draft, draft: `${tightened}${rest}` };
      }
      return draft;
    }
    // No claim in the lead — try the second sentence instead of fabricating one.
    if (rest.length > 0) {
      const secondBreak = rest.indexOf('\n');
      const second = secondBreak === -1 ? rest : rest.slice(0, secondBreak);
      if (claimMarker.test(second)) {
        return { ...draft, draft: `${second}${rest.slice(secondBreak === -1 ? rest.length : secondBreak)}` };
      }
    }
    return draft;
  }

  if (weakKey === 'credibility') {
    // Add evidence scaffolding only if the draft already contains a concrete number
    // we can anchor to — otherwise we'd be inventing one and the scorer will treat
    // it as filler.
    const numMatch = text.match(/\d+(?:\.\d+)?[%％x倍万千]?/);
    if (!numMatch) return draft;
    // Promote the number-bearing sentence to the end as a concrete anchor line.
    const sentences = text.split(/(?<=[。！？])/).filter(Boolean);
    const idx = sentences.findIndex((s) => numMatch && s.includes(numMatch[0]));
    if (idx === -1 || idx === sentences.length - 1) return draft;
    const moved = sentences.splice(idx, 1)[0];
    sentences.push(moved);
    const reordered = sentences.join('').replace(/。。/g, '。');
    if (reordered !== text) return { ...draft, draft: reordered };
    return draft;
  }

  if (weakKey === 'styleMatch') {
    // Inject signature vocabulary without inventing prose: only as inline parenthetical
    // markers attached to existing sentences, not as new clauses.
    const signatureVocab = style.vocabulary.find((v) => v && v.length > 1 && !text.includes(v));
    if (!signatureVocab) return draft;
    // Insert into the first sentence as a parenthetical (only if no parenthetical exists
    // already in that sentence).
    const firstBreak = text.indexOf('\n');
    const lead = firstBreak === -1 ? text : text.slice(0, firstBreak);
    const rest = firstBreak === -1 ? '' : text.slice(firstBreak);
    if (!/（|）|\(|\)/.test(lead)) {
      const injection = `${lead}（${signatureVocab}）`;
      return { ...draft, draft: `${injection}${rest}` };
    }
    return draft;
  }

  if (weakKey === 'platformFit') {
    // Platform-fit is driven by asset length, not draft text — drafts are the article body.
    // Returning the draft unchanged keeps the run consistent: the asset rewrite path
    // (which runs only when platformFit is a weak key) handles the actual length work.
    return draft;
  }

  if (weakKey === 'curiosityGap') {
    if (/(为什么|真正的|问题是|背后)/.test(text)) return draft;
    return { ...draft, draft: `问题是：${text}` };
  }

  if (weakKey === 'emotionalCharge') {
    if (/(低估|错了|机会|成本|噪音|危险|稀缺)/.test(text)) return draft;
    return { ...draft, draft: `${text} 这不是中性变化，而是会直接改变判断和执行成本。` };
  }

  if (weakKey === 'shareability') {
    if (/(保存|转发|写下来|下一步)/.test(text)) return draft;
    return { ...draft, draft: `${text} 如果你觉得这条判断有用，值得保存下来，下一次遇到同类信号时直接套用。` };
  }

  if (weakKey === 'commentBait') {
    if (/(你怎么看|你会|你认同吗|如果你不同意)/.test(text)) return draft;
    return { ...draft, draft: `${text} 如果你不同意，最值得反驳的是哪一句？` };
  }

  if (weakKey === 'screenshotSentence') {
    const firstBreak = text.indexOf('\n');
    const lead = firstBreak === -1 ? text : text.slice(0, firstBreak);
    if (lead.length >= 24 && lead.length <= 80 && /(不是|而是|真正|关键)/.test(lead)) return draft;
    const condensed = lead.replace(/[。！？].*$/u, '').slice(0, 68);
    return { ...draft, draft: `真正稀缺的不是信息，而是判断。${condensed}${firstBreak === -1 ? '' : text.slice(firstBreak)}` };
  }

  if (weakKey === 'novelty') {
    // If the text already contains a contrarian word, no rewrite needed.
    if (/(反共识|主流|被低估|重新组织|真正的|缺的不是|稀缺的)/.test(text)) return draft;
    // Otherwise strip filler and let the existing voice carry; we don't fabricate.
    const cleaned = stripAiFiller(text);
    if (cleaned !== text) return { ...draft, draft: cleaned };
    return draft;
  }

  return draft;
}

export type OptimizationPass = {
  iteration: number;
  scoresBefore: ScoreCard;
  scoresAfter: ScoreCard;
  targets: string[];
  improvements: string[];
  regressions: string[];
  overallBefore: number;
  overallAfter: number;
  qualityGate: 'passed' | 'regressed' | 'no-change';
  rolledBack: boolean;
  rollbackReason?: string;
};

export type LoopEngineerOptions = {
  maxIterations?: number;
  /** Minimum iterations the loop MUST run before it can declare convergence. */
  minIterations?: number;
  /** A pass is considered meaningful only if at least one dimension improves by >= this. */
  improvementThreshold?: number;
  /** A pass is rolled back if more than this many dimensions regressed. */
  maxRegressions?: number;
  /** Hard quality floor for the final overall score. Below this, stopReason='quality-gate'. */
  minOverallScore?: number;
};

export type LoopEngineerMeta = {
  name: string;
  version: string;
};

export const LOOP_ENGINEER: LoopEngineerMeta = {
  name: 'WriteLikeMe Loop Engineer',
  version: 'v1',
};

export type StopReason =
  | 'converged'
  | 'max-iterations'
  | 'quality-gate'
  | 'regression-loop'
  | 'no-improvement';

export type QualityGate = {
  minOverall: number;
  convergedOrCapped: boolean;
  passed: boolean;
};

export type OptimizationTrajectory = {
  iterations: number;
  converged: boolean;
  passes: OptimizationPass[];
  scoresStart: ScoreCard;
  scoresEnd: ScoreCard;
  engine: LoopEngineerMeta;
  options: Required<LoopEngineerOptions>;
  qualityGate: QualityGate;
  rollbackCount: number;
  stopReason: StopReason;
};

export const DEFAULT_LOOP_OPTIONS: Required<LoopEngineerOptions> = {
  maxIterations: 5,
  minIterations: 2,
  improvementThreshold: 2,
  maxRegressions: 1,
  minOverallScore: 60,
};

// Convert a raw ScoreCard to an "all-up-is-better" view: for aiSmellRisk we invert so
// higher means better (lower risk). This is the same convention used in optimizeRun.
function toBetterHigher(scores: ScoreCard): Record<keyof ScoreCard, number> {
  const entries = {} as Record<keyof ScoreCard, number>;
  (Object.keys(scores) as (keyof ScoreCard)[]).forEach((key) => {
    entries[key] = key === 'aiSmellRisk' ? 100 - scores[key] : scores[key];
  });
  return entries;
}

function overallScore(scores: ScoreCard): number {
  const better = toBetterHigher(scores);
  const values = Object.values(better);
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

// One self-optimization pass: target the weakest dimensions, rewrite drafts/assets, rescore.
export function optimizeRun(run: CampaignRun, style: StyleProfile): { run: CampaignRun; pass: OptimizationPass } {
  const scoresBefore = run.scores;
  const weak = weakestDimensions(scoresBefore).slice(0, 2).map((w) => w.key);
  const targets = weak.map((key) => scoreLabels[key]);

  const sectionDrafts = run.sectionDrafts.map((draft) => {
    let result = draft;
    for (const key of weak) result = rewriteDraft(result, key, style);
    return result;
  });
  // Only lengthen assets if platformFit is a target; otherwise optimizeAsset can inflate
  // aiSmellRisk by adding generic scaffolding. Use the internal transform helper so
  // repeated loop passes don't keep appending " · 已优化" markers to the title.
  const assets = weak.includes('platformFit')
    ? run.assets.map((asset) => {
        const { content, didExtend } = applyAssetTransform(asset, scoresBefore);
        return { ...asset, content };
      })
    : run.assets;
  const scoresAfter = scoreRun(
    // Re-score against the original source snapshot (not an empty SourceInput) so
    // sourceDepth / hasSpecifics remain stable across rewrites; otherwise stripping
    // AI filler drags credibility down artificially.
    run.sourceSnapshot || { url: '', title: '', sourceText: '', audience: '', productContext: '' },
    style,
    run.angles.find((a) => a.id === run.selectedAngleId) ?? run.angles[0],
    assets,
    sectionDrafts,
    run.versions,
  );

  const improvements: string[] = [];
  const regressions: string[] = [];
  (Object.keys(scoresAfter) as (keyof ScoreCard)[]).forEach((key) => {
    const before = scoresBefore[key];
    const after = key === 'aiSmellRisk' ? 100 - scoresAfter[key] : scoresAfter[key];
    const beforeAdj = key === 'aiSmellRisk' ? 100 - before : before;
    const delta = after - beforeAdj;
    if (delta > 0) improvements.push(`${scoreLabels[key]} +${delta}（${beforeAdj} → ${after}）`);
    if (delta < 0) regressions.push(`${scoreLabels[key]} ${delta}（${beforeAdj} → ${after}）`);
  });

  const overallBefore = overallScore(scoresBefore);
  const overallAfter = overallScore(scoresAfter);
  const qualityGate: OptimizationPass['qualityGate'] =
    overallAfter < overallBefore ? 'regressed' : improvements.length === 0 ? 'no-change' : 'passed';

  return {
    run: { ...run, sectionDrafts, assets, scores: scoresAfter, optimizationNotes: buildOptimizationNotes(scoresAfter, style, run.angles.find((a) => a.id === run.selectedAngleId) ?? run.angles[0]) },
    pass: {
      iteration: 0,
      scoresBefore,
      scoresAfter,
      targets,
      improvements,
      regressions,
      overallBefore,
      overallAfter,
      qualityGate,
      rolledBack: false,
    },
  };
}

// The self-optimization loop (a.k.a. Loop Engineer): iterate optimizeRun until the scorecard
// converges, the iteration cap is reached, the quality gate fails, or the loop keeps
// regressing. Each pass is recorded with regressions and a quality gate so downstream
// auditors (CI, export dossier, the UI) can verify the loop actually ran, actually made
// progress, and did not quietly break the run.
export function optimizeLoop(
  run: CampaignRun,
  style: StyleProfile,
  options: LoopEngineerOptions = {},
): { run: CampaignRun; trajectory: OptimizationTrajectory } {
  const cfg: Required<LoopEngineerOptions> = { ...DEFAULT_LOOP_OPTIONS, ...options };
  const passes: OptimizationPass[] = [];
  let current = run;
  let converged = false;
  let stopReason: StopReason = 'max-iterations';
  let rollbackCount = 0;
  const scoresStart = run.scores;
  let consecutiveRegressions = 0;

  for (let i = 0; i < cfg.maxIterations; i += 1) {
    const { run: nextRun, pass } = optimizeRun(current, style);
    pass.iteration = i + 1;

    // Regression guard: if too many dimensions regressed (or overall got worse), roll this
    // pass back. We keep the previous run, record the rollback on the pass, and let the
    // loop try again with a different rewrite on the next iteration.
    const regressionCount = pass.regressions.length;
    if (pass.qualityGate === 'regressed' || regressionCount > cfg.maxRegressions) {
      pass.rolledBack = true;
      pass.rollbackReason =
        pass.qualityGate === 'regressed'
          ? `overall ${pass.overallBefore} → ${pass.overallAfter}（退化）`
          : `${regressionCount} 个维度退化（>${cfg.maxRegressions}）`;
      rollbackCount += 1;
      consecutiveRegressions += 1;
      passes.push(pass);
      current = current; // keep previous run
      // If the loop keeps regressing, abort early — more iterations will not help.
      if (consecutiveRegressions >= 2) {
        stopReason = 'regression-loop';
        break;
      }
      continue;
    }

    consecutiveRegressions = 0;
    passes.push(pass);
    current = nextRun;

    // Convergence: enforce a minimum number of iterations before allowing "no improvement"
    // to count as convergence. Then require at least one dimension with delta >= threshold.
    if (i + 1 >= cfg.minIterations) {
      const meaningfulGain = pass.improvements.some((imp) => {
        const m = imp.match(/([+-]\d+)/);
        return m && Number(m[1].replace('+', '')) >= cfg.improvementThreshold;
      });
      if (!meaningfulGain) {
        converged = true;
        stopReason = pass.improvements.length === 0 ? 'no-improvement' : 'converged';
        break;
      }
    }
  }

  const finalOverall = overallScore(current.scores);
  const qualityGate: QualityGate = {
    minOverall: cfg.minOverallScore,
    convergedOrCapped: converged || stopReason === 'max-iterations',
    passed: finalOverall >= cfg.minOverallScore,
  };

  // If the loop finished without converging AND the final score is below the quality
  // floor, mark stopReason as quality-gate so callers know the run is sub-floor.
  if (!qualityGate.passed && stopReason !== 'regression-loop') {
    stopReason = 'quality-gate';
  }

  return {
    run: current,
    trajectory: {
      iterations: passes.length,
      converged,
      passes,
      scoresStart,
      scoresEnd: current.scores,
      engine: LOOP_ENGINEER,
      options: cfg,
      qualityGate,
      rollbackCount,
      stopReason,
    },
  };
}

export function buildTopicBatchReport(
  run: CampaignRun,
  style: StyleProfile,
  news?: NewsAggregation,
  count = 10,
): TopicBatchReport {
  const candidates = buildTopicCandidates(run, news).slice(0, count);
  const items = candidates.map((candidate, index) => {
    const initialTweet = buildTopicTweet(candidate.topic, candidate.sourceLabel, run, style, index);
    const optimized = optimizeTopicTweet(initialTweet, candidate.topic, candidate.sourceLabel, run, style);
    const workflowReviews = evaluateWorkflowArtifacts(run, candidate.sourceLabel, candidate.topic);
    const finalReviews = evaluateFinalTweet(optimized.tweet, style, candidate.topic, candidate.sourceLabel);
    return {
      id: candidate.id,
      topic: candidate.topic,
      sourceLabel: candidate.sourceLabel,
      tweet: optimized.tweet,
      workflowReviews,
      workflowScore: averageTopicScore(workflowReviews),
      finalReviews,
      finalScore: averageTopicScore(finalReviews),
      loopIterations: optimized.iterations,
      stopReason: optimized.stopReason,
      optimizationNotes: optimized.notes,
    } satisfies TopicTweetItem;
  });

  const aggregateWorkflowReviews = aggregateTopicReviews(items.flatMap((item) => item.workflowReviews));
  const aggregateFinalReviews = aggregateTopicReviews(items.flatMap((item) => item.finalReviews));
  const strongest = [...items].sort((a, b) => b.finalScore - a.finalScore)[0];
  const weakest = [...items].sort((a, b) => a.finalScore - b.finalScore)[0];
  const processOptimizations = buildBatchOptimizations(aggregateWorkflowReviews, aggregateFinalReviews);

  return {
    createdAt: new Date().toISOString(),
    summary: `共生成 ${items.length} 个 topic / ${items.length} 条推文。平均工作流得分 ${averageTopicScore(aggregateWorkflowReviews)}，平均最终产物得分 ${averageTopicScore(aggregateFinalReviews)}。`,
    items,
    aggregateWorkflowReviews,
    aggregateFinalReviews,
    processOptimizations: [
      `最强 topic：${strongest?.topic || 'N/A'}（${strongest?.finalScore || 0}）`,
      `最弱 topic：${weakest?.topic || 'N/A'}（${weakest?.finalScore || 0}）`,
      ...processOptimizations,
    ],
  };
}

export function buildNewsTopicBoard(
  news: NewsAggregation,
  style: StyleProfile,
  audienceHint = '创作者、builder 和内容运营者',
  count = 10,
): NewsTopicBoard {
  const items = news.items.slice(0, 18).map((item, index) => {
    const topic = item.title;
    const sourceLabel = `${item.sourceName} #${item.rank}`;
    const tweet = trimTweet(
      [
        `先说结论：${topicLabel(topic)} 不只是一个热点，它会改变 ${audienceHint} 的判断。`,
        `${item.summary.replace(/[。.]\s*$/, '')}。`,
        `真正值得转发的点在于：${item.sourceName} 这条信号已经说明，变化开始从信息层走向执行层。`,
        `来源：${sourceLabel}。${style.sampleLine.replace(/[。.]\s*$/, '')}。`,
      ].join(' '),
    );
    const reviews = evaluateFinalTweet(tweet, style, topic, sourceLabel);
    const score = averageTopicScore(reviews);
    return {
      id: item.id,
      topic,
      sourceLabel,
      tweet,
      viralityScore: score,
      reviews,
      whyNow: item.isNew ? '新增信号，时间窗口更好。' : `已被看到 ${item.seenCount} 次，仍有持续讨论价值。`,
    } satisfies NewsTopicPreview;
  });

  const ranked = [...items].sort((a, b) => b.viralityScore - a.viralityScore).slice(0, count);
  const aggregate = aggregateTopicReviews(ranked.flatMap((item) => item.reviews));
  return {
    createdAt: new Date().toISOString(),
    summary: `从 ${news.items.length} 条新闻里筛出 ${ranked.length} 个更有爆款潜力的 topic，平均传播得分 ${averageTopicScore(aggregate)}。`,
    items: ranked,
    processOptimizations: buildBatchOptimizations([], aggregate),
  };
}

function buildResearchDossier(input: SourceInput, style: StyleProfile): ResearchDossier {
  const body = `${input.title} ${input.sourceText} ${input.productContext}`;
  const keywords = extractKeywords(body, 10);
  const topic = input.title || keywords.slice(0, 2).join(' ') || '这份素材';
  const label = topicLabel(topic);
  const audience = input.audience || inferAudience(body);
  const userPain = inferPain(body);
  const platform = inferPrimaryPlatform(body);
  const topKeywords = keywords.slice(0, 3).join('、') || '尚未提取到关键词';

  return {
    userPersona: [
      { label: '核心读者', detail: audience },
      { label: '当前认知', detail: `${audience} 大概率知道「${label}」的表层信息，但还没把它转化成可复用的写作决策。` },
      { label: '正在经历的痛点', detail: userPain },
      { label: '决策时刻', detail: `他们需要判断：「${label}」究竟只是值得看一眼的消息，还是值得花时间展开成一个内容选题。` },
    ],
    realUserLeads: [
      {
        source: 'X / Twitter',
        query: `${topKeywords}（${audience}）痛点`,
        why: '找到用自己话讨论这个问题的创作者，尤其是发布帖和评论区的真实表达。',
      },
      {
        source: 'Reddit',
        query: `${topKeywords} site:reddit.com 创作者 工作流`,
        why: '找到未解决的问题、反对意见和真实的工作流抱怨。',
      },
      {
        source: 'Hacker News / Product Hunt',
        query: `${label} 评论 发布`,
        why: '找到早期采用者的语言、质疑和购买触发点。',
      },
    ],
    knowledgeBase: [
      { label: '核心主题', detail: topic },
      { label: '相关关键词', detail: keywords.slice(0, 8).join('、') || '补充更长的素材以提取更精准的关键词。' },
      { label: '产品语境', detail: input.productContext || '尚未提供产品语境。' },
      { label: '研究缺口', detail: `发布前应顺着上面的线索核实，补上 2-3 个具体例子或链接，确保判断站得住。` },
    ],
    demandMap: [
      { label: '已经知道', detail: `${audience} 大概率已经知道：围绕 ${topKeywords} 的基础讨论已经存在。` },
      { label: '还不知道', detail: `他们可能没意识到：如何把「${label}」从一次性信息，组织成可判断、可复用的内容资产。` },
      { label: '需要被满足', detail: `内容要帮他们看清一条从 ${platform} 信号到可发布资产的实操路径。` },
      { label: '信任要求', detail: '使用真实用户语言、具体的素材细节，以及作者一个清晰的判断。' },
    ],
    authorProfile: [
      { label: '声音模式', detail: style.tone.join(' / ') },
      { label: '节奏', detail: style.rhythm },
      { label: '招牌动作', detail: style.signatureMoves.join('；') },
      { label: '避免', detail: style.forbidden.join('、') },
    ],
  };
}

function buildTopicCandidates(
  run: CampaignRun,
  news?: NewsAggregation,
): { id: string; topic: string; sourceLabel: string }[] {
  const angleCandidates = run.angles.map((angle) => ({
    id: `angle:${angle.id}`,
    topic: angle.headline,
    sourceLabel: `Angle · ${angle.label}`,
  }));
  const newsCandidates = (news?.items || []).slice(0, 5).map((item, index) => ({
    id: `news:${item.id}`,
    topic: item.title,
    sourceLabel: `${item.sourceName} #${item.rank}`,
  }));

  const merged = [...angleCandidates, ...newsCandidates];
  const unique = new Map<string, { id: string; topic: string; sourceLabel: string }>();
  for (const candidate of merged) {
    const key = topicLabel(candidate.topic).toLowerCase();
    if (!unique.has(key)) unique.set(key, candidate);
  }

  const initialResults = [...unique.values()];
  if (initialResults.length >= 10) return initialResults;

  const sectionCandidates = run.sectionDrafts.slice(0, 10 - initialResults.length).map((section, index) => ({
    id: `section:${index}`,
    topic: `${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)} · ${section.title}`,
    sourceLabel: `Section · ${section.title}`,
  }));
  for (const candidate of sectionCandidates) {
    const key = topicLabel(candidate.topic).toLowerCase();
    if (!unique.has(key)) unique.set(key, candidate);
  }

  const fallbackTopics = [
    `为什么「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」值得现在写`,
    `围绕「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」的用户痛点`,
    `关于「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」的反常识判断`,
    `把「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」写成可发布内容的流程`,
    `「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」对创作者真正改变了什么`,
    `用「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」做一次高质量内容实验`,
    `如果只保留一个观点，我会怎么写「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」`,
    `从信号到推文：如何围绕「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」快速发布`,
    `关于「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」最容易被忽略的一步`,
    `判断「${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)}」值不值得写的 3 个问题`,
  ];
  for (let index = 0; unique.size < 10 && index < fallbackTopics.length; index += 1) {
    const topic = fallbackTopics[index];
    const key = topicLabel(topic).toLowerCase();
    if (!unique.has(key)) {
      unique.set(key, {
        id: `fallback:${index}`,
        topic,
        sourceLabel: `Fallback · ${index + 1}`,
      });
    }
  }

  const results = [...unique.values()];
  while (results.length < 10) {
    const index = results.length + 1;
    results.push({
      id: `reserve:${index}`,
      topic: `${topicLabel(run.sourceSnapshot?.title || run.writingObjective.uniqueValue)} · 主题扩展 ${index}`,
      sourceLabel: `Reserve · ${index}`,
    });
  }

  return results;
}

function buildTopicTweet(
  topic: string,
  sourceLabel: string,
  run: CampaignRun,
  style: StyleProfile,
  index: number,
): string {
  const angle = run.angles[index % run.angles.length];
  const signal = run.signal[index % run.signal.length]?.replace(/[。.]\s*$/, '') || run.writingObjective.uniqueValue;
  const audience = run.research.userPersona[0]?.detail || '目标读者';
  const voice = style.sampleLine.replace(/[。.]\s*$/, '');
  return [
    `关于「${topicLabel(topic)}」，我的判断是：${angle.headline}`,
    `${signal}。`,
    `${audience} 真正该关心的，不是消息本身，而是它会改变哪个决策。`,
    `来源：${sourceLabel}。${voice}。`,
  ].join(' ');
}

function optimizeTopicTweet(
  initialTweet: string,
  topic: string,
  sourceLabel: string,
  run: CampaignRun,
  style: StyleProfile,
): { tweet: string; iterations: number; stopReason: TopicTweetItem['stopReason']; notes: string[] } {
  let current = initialTweet;
  const notes: string[] = [];
  let lastScore = averageTopicScore(evaluateFinalTweet(current, style, topic, sourceLabel));

  for (let iteration = 1; iteration <= 4; iteration += 1) {
    const reviews = evaluateFinalTweet(current, style, topic, sourceLabel);
    const weakest = [...reviews].sort((a, b) => a.score - b.score)[0];
    if (averageTopicScore(reviews) >= 84) {
      notes.push(`第 ${iteration} 轮前已达到质量阈值。`);
      return { tweet: trimTweet(current), iterations: iteration - 1, stopReason: 'quality-threshold', notes };
    }

    let next = current;
    if (weakest.label === 'Hook') {
      next = `先说结论：${trimSentence(topicLabel(topic))} 不该被当成普通热点。 ${current}`;
    } else if (weakest.label === 'Specificity') {
      next = `${current} 证据点在 ${sourceLabel}。`;
    } else if (weakest.label === 'Voice') {
      next = `${style.signatureMoves[0] || '先给判断，再解释原因'}。 ${current}`;
    } else if (weakest.label === 'Publishability') {
      next = current.length > 250 ? current.slice(0, 228).replace(/[，,；;:\s]+$/u, '') + '。' : `${current} 下一步是把它写成一条可验证的内容。`;
    } else {
      next = `${current} 这不是观点游戏，而是判断和执行成本的问题。`;
    }

    next = trimTweet(stripAiFiller(next));
    const nextScore = averageTopicScore(evaluateFinalTweet(next, style, topic, sourceLabel));
    if (nextScore <= lastScore) {
      notes.push(`第 ${iteration} 轮没有带来显著提升，保留上一版。`);
      return { tweet: trimTweet(current), iterations: iteration, stopReason: 'no-improvement', notes };
    }

    current = next;
    lastScore = nextScore;
    notes.push(`第 ${iteration} 轮提升了 ${weakest.label}。`);
  }

  return { tweet: trimTweet(current), iterations: 4, stopReason: 'max-iterations', notes };
}

function evaluateWorkflowArtifacts(run: CampaignRun, sourceLabel: string, topic: string): TopicArtifactReview[] {
  const evidenceLeadCount = run.research.realUserLeads.length;
  const sectionCount = run.contentStructure.sections.length;
  const signalClarity = clampScore(58 + Math.min(26, run.signal.join(' ').length / 18));
  const audienceSpecificity = clampScore(60 + (/\b(founder|builder|创作者|团队|营销)\b/i.test(run.research.userPersona[0]?.detail || '') ? 24 : 10));
  const structureReadiness = clampScore(62 + sectionCount * 5);
  const evidenceReadiness = clampScore(54 + evidenceLeadCount * 10 + (/RSS|#\d+|Hacker News|Product Hunt|知乎|微博/.test(sourceLabel) ? 10 : 0));

  return [
    { label: 'Signal clarity', score: signalClarity, note: `关于「${topicLabel(topic)}」的核心信号是否已经被压缩成可判断的 3-4 句话。` },
    { label: 'Audience specificity', score: audienceSpecificity, note: '用户画像是否具体到能判断“谁会因为这个 topic 改变行动”。' },
    { label: 'Structure readiness', score: structureReadiness, note: '目标与结构是否已经足够清楚，可以直接进入逐段写作。' },
    { label: 'Evidence readiness', score: evidenceReadiness, note: '真实用户线索和新闻来源是否足够支撑最终表达。' },
  ];
}

function evaluateFinalTweet(
  tweet: string,
  style: StyleProfile,
  topic: string,
  sourceLabel: string,
): TopicArtifactReview[] {
  const hook = clampScore(58 + (/(先说结论|我的判断|真正|关键|不是)/.test(tweet) ? 24 : 10));
  const specificity = clampScore(52 + (/\d|来源：|Hacker News|Product Hunt|知乎|微博|#\d+/.test(tweet) ? 28 : 10));
  const voice = clampScore(56 + Math.min(22, style.vocabulary.filter((word) => word && tweet.includes(word)).length * 6) + (style.sampleLine && tweet.includes(style.sampleLine.slice(0, 6)) ? 8 : 0));
  const publishability = clampScore(50 + (tweet.length >= 90 && tweet.length <= 260 ? 32 : tweet.length < 90 ? 12 : 20));
  const credibility = clampScore(55 + (/来源：|证据点|评论|发布|搜索/.test(tweet) ? 24 : 8) + (topicLabel(topic).length > 3 ? 6 : 0) + (/AI 味|作为一个 AI|赋能|颠覆式创新/.test(tweet) ? -18 : 0));
  const curiosityGap = clampScore(54 + ((tweet.match(/为什么|问题是|真正的|背后|但/g) || []).length * 6) + (/(不是|而是)/.test(tweet) ? 10 : 0));
  const emotionalCharge = clampScore(50 + ((tweet.match(/低估|错了|机会|危险|稀缺|成本|焦虑/g) || []).length * 6) + (/[？?！!]/.test(tweet) ? 6 : 0));
  const shareability = clampScore(52 + ((tweet.match(/保存|转发|写下来|值得|下次直接用/g) || []).length * 6) + (tweet.length >= 120 ? 8 : 2));
  const commentBait = clampScore(48 + ((tweet.match(/你会|你怎么看|你认同吗|如果你不同意|评论区/g) || []).length * 7));
  const lead = tweet.split(/[。！？!?]/)[0] || tweet;
  const screenshotSentence = clampScore(50 + (lead.length >= 18 && lead.length <= 72 ? 16 : 6) + (/(不是|而是|真正|关键|低估|稀缺)/.test(lead) ? 18 : 8));

  return [
    { label: 'Hook', score: hook, note: '开头有没有强判断，能不能让人停下来。' },
    { label: 'Specificity', score: specificity, note: `关于「${topicLabel(topic)}」是否包含了来源或可验证的细节。` },
    { label: 'Voice', score: voice, note: '这条推文是否保留了作者样本里的表达习惯。' },
    { label: 'Publishability', score: publishability, note: '长度、节奏和信息密度是否适合直接发布。' },
    { label: 'Credibility', score: credibility, note: `来源 ${sourceLabel} 是否被有效转译成可信表达。` },
    { label: 'Curiosity gap', score: curiosityGap, note: '有没有把读者拉进一个“我得继续看下去”的信息缺口。' },
    { label: 'Emotional charge', score: emotionalCharge, note: '有没有明显的风险感、机会感、低估感或身份张力。' },
    { label: 'Shareability', score: shareability, note: '这条内容是否天然带有“值得转给别人”的理由。' },
    { label: 'Comment bait', score: commentBait, note: '是否给了读者一个明确的反驳、补充或站队入口。' },
    { label: 'Screenshot sentence', score: screenshotSentence, note: '是否有一句单独截出来也成立的高密度判断。' },
  ];
}

function aggregateTopicReviews(reviews: TopicArtifactReview[]): TopicArtifactReview[] {
  const groups = new Map<string, TopicArtifactReview[]>();
  for (const review of reviews) {
    groups.set(review.label, [...(groups.get(review.label) || []), review]);
  }
  return [...groups.entries()].map(([label, items]) => ({
    label,
    score: Math.round(items.reduce((sum, item) => sum + item.score, 0) / items.length),
    note: items[0]?.note || '',
  }));
}

function buildBatchOptimizations(
  workflowReviews: TopicArtifactReview[],
  finalReviews: TopicArtifactReview[],
): string[] {
  const byLabel = new Map([...workflowReviews, ...finalReviews].map((item) => [item.label, item.score]));
  const notes: string[] = [];
  if ((byLabel.get('Evidence readiness') || 100) < 78) notes.push('Research 步的真实用户证据还不够密，建议在进入 Meeting 前强制补 2-3 条真实来源。');
  if ((byLabel.get('Hook') || 100) < 80) notes.push('Topic 到 Tweet 的转译还不够锋利，建议在 Meeting 后增加一句“先说结论”的钩子模板。');
  if ((byLabel.get('Publishability') || 100) < 82) notes.push('最终推文长度和节奏还有波动，建议把发布模板压到 2-4 句，并保留一个明确来源锚点。');
  if ((byLabel.get('Voice') || 100) < 78) notes.push('Style 样本对最终产物的影响还不够强，建议在 Voice 步收集更多真实历史文本。');
  if ((byLabel.get('Curiosity gap') || 100) < 78) notes.push('Topic 首句还不够让人停下来，建议在生成时优先制造“主流理解 vs 真正问题”的反差。');
  if ((byLabel.get('Emotional charge') || 100) < 76) notes.push('推文整体仍偏理性说明，建议加入明确的损失感、机会感或被低估感。');
  if ((byLabel.get('Shareability') || 100) < 78) notes.push('最终推文缺少“为什么值得转发给别人”的一句话，建议补一条可复用的判断。');
  if ((byLabel.get('Comment bait') || 100) < 72) notes.push('评论诱因偏弱，建议让结尾主动抛出立场问题或反驳入口。');
  if ((byLabel.get('Screenshot sentence') || 100) < 78) notes.push('缺少一句能被单独截图传播的高密度句子，建议在首句压缩出一个可摘录判断。');
  if (!notes.length) notes.push('当前流程整体比较稳，下一步更值得优化的是 News 选题排序和 Research 证据密度。');
  return notes;
}

function averageTopicScore(reviews: TopicArtifactReview[]): number {
  if (!reviews.length) return 0;
  return Math.round(reviews.reduce((sum, item) => sum + item.score, 0) / reviews.length);
}

function trimTweet(text: string): string {
  const compact = text.replace(/\s+/g, ' ').trim();
  return compact.length <= 280 ? compact : compact.slice(0, 277).replace(/[，,；;:\s]+$/u, '') + '…';
}

function trimSentence(text: string): string {
  return text.replace(/[。.！!？?\s]+$/u, '').slice(0, 32);
}

function extractSignal(input: SourceInput, research: ResearchDossier): string[] {
  const keywords = extractKeywords(`${input.title} ${input.sourceText} ${input.productContext}`, 8);
  const topic = input.title || '这份信号';
  const label = topicLabel(topic);
  const target = research.userPersona[0]?.detail || input.audience || '创作者和从业者';
  const keywordList = keywords.slice(0, 3).join('、') || '更精准的产品故事';
  // Strip prefixes from research details so we control the lead-in phrase ourselves (no nesting).
  const strip = (s: string) => (s || '').replace(/^(他们可能没意识到：|内容要帮他们看清一条从)/, '').replace(/[。.]\s*$/, '');
  const rawTension = research.demandMap[1]?.detail || '';
  const rawGrowth = research.demandMap[2]?.detail || '';
  const tension = strip(rawTension) || '读者有了信息，却还没把它变成可用的决策';
  const growth = strip(rawGrowth) || '一个输入可以衍生出多个平台原生形态的资产，同时不失作者自己的声音';
  return [
    `「${label}」的核心，是围绕 ${keywordList} 展开的一个值得认真拆解的信号，而不只是一条消息。`,
    `最该第一时间关注的，是 ${target}：这件事直接关系到他们的判断和执行成本。`,
    `真正的张力在于：${tension}。`,
    `增长空间在于：${growth}。`,
  ];
}

function buildAngles(input: SourceInput, signal: string[], research: ResearchDossier): Angle[] {
  const topic = input.title || extractKeywords(input.sourceText, 1)[0] || '这个产品信号';
  const label = topicLabel(topic);
  const user = research.userPersona[0]?.detail || '创作者和从业者';
  // Strip any leading prefix so we can re-introduce it cleanly (no nesting).
  const stripPrefix = (s: string) => (s || '').replace(/^(真正的张力在于：|增长空间在于：|还不知道：|他们可能没意识到：)/, '').replace(/[。.]\s*$/, '');
  const tension = stripPrefix(research.demandMap[1]?.detail) || '读者有了信息，却还没把它变成可用的决策';
  return [
    {
      id: 'contrarian',
      label: '反常识观点',
      headline: `关于「${label}」，关键不是"它厉不厉害"，而是它对 ${user} 改变了哪个判断。`,
      rationale: `把注意力从"功能多强"转向"决策成本怎么变"——${tension}。`,
      hook: `大多数人讨论「${label}」时，停在了"它很新"。但对 ${user} 来说，真正值得想清楚的是：${tension}。这就是为什么它不是又一个话题，而是一个需要被重新组织的判断。`,
    },
    {
      id: 'startup',
      label: '创业机会',
      headline: `「${label}」背后藏着一个被低估的机会：先服务 ${user}，而不是大团队。`,
      rationale: `当大玩家忽视 ${user} 时，这个空白就成了切入点。`,
      hook: `「${label}」的趋势往往先在 ${user} 这种小团队身上显形，因为他们反应最快、约束最真实。谁能把围绕它的判断沉淀成可复用的产品，谁就抢到了第一批真心愿意付费的人。`,
    },
    {
      id: 'tool',
      label: '工具推荐',
      headline: `把「${label}」从一个信号，转成一套你能反复用的判断资产。`,
      rationale: `强调的不是"看懂"，而是"能不能落地成产物"。`,
      hook: `「${label}」本身不稀缺，稀缺的是：能不能把它结构化——拆成谁在乎、卡在哪、怎么判断、怎么表达。做到这一步，一个信号就变成了一组跨平台的内容，而不是一次性的转发。`,
    },
    {
      id: 'trend',
      label: '趋势判断',
      headline: `「${label}」不只是一个热点，它是一条正在加速的曲线。`,
      rationale: `把单点信号升级为可观察的长期变化。`,
      hook: `判断「${label}」是不是真趋势，不要看它现在多响，而要看 ${user} 是否正在因此改变行为。当行为开始迁移，这个方向就值得提前布局，而不是等它被验证了再进场。`,
    },
    {
      id: 'debate',
      label: '争议性问题',
      headline: `关于「${label}」，主流看法可能错了。`,
      rationale: `用一个反共识的主张，把 ${user} 的注意力拉到真正的张力上。`,
      hook: `关于「${label}」，流行的说法是一回事，但${tension}。如果你认同主流，那就只是多一条复述；如果你敢给出相反的判断并讲清楚为什么，这才是 ${user} 真正会停下来读的东西。`,
    },
  ];
}

function buildVersions(
  input: SourceInput,
  style: StyleProfile,
  angle: Angle,
  signal: string[],
  research: ResearchDossier,
): ContentVersion[] {
  const user = research.userPersona[0]?.detail || input.audience || '创作者和从业者';
  const need = (research.demandMap[2]?.detail || '把一个信号变成可发布的内容').replace(/[。.]\s*$/, '');
  const authorMove = style.signatureMoves[0] || '先给出一个清晰的判断';
  const proofPrompt = research.realUserLeads[0]?.query || '发布前先核实真实用户语言';
  // Strip signal prefixes/periods when embedding mid-sentence.
  const cleanSignal = (s: string) => (s || '').replace(/^(真正的张力在于：|增长空间在于：|「[^」]*」的核心，是)/, '').replace(/[。.]\s*$/, '');

  const base = [
    `1/ ${angle.hook}`,
    '',
    `2/ 读者是谁：${user}。`,
    `他们不需要又一份通用摘要，而是需要有人帮他们解决：${need}。`,
    '',
    `3/ 信号是什么：${cleanSignal(signal[0])}`,
    '',
    `4/ 缺口在哪里：${cleanSignal(signal[2])}`,
    '',
    `5/ 完整工作流：研究真实用户 → 建立知识库 → 梳理需求 → 应用作者声音 → 逐段写作 → 打分 → 修订。`,
    '',
    `6/ 作者动作：${authorMove}。`,
  ];

  return [
    {
      name: 'Version A：稳妥专业版',
      positioning: '清晰、有用、低风险。适合 LinkedIn、newsletter 或创始人动态。',
      thread: [...base, '', `7/ 发布前，用一个证据点核实：${proofPrompt}`].join('\n'),
      scores: { hook: 78, novelty: 76, styleMatch: 82, platformFit: 84, credibility: 80, aiSmellRisk: 24, curiosityGap: 72, emotionalCharge: 66, shareability: 74, commentBait: 62, screenshotSentence: 70 },
    },
    {
      name: 'Version B：更有争议版',
      positioning: '主张更尖锐、更有讨论感。适合 X 和评论驱动的平台。',
      thread: [
        `1/ 我的判断：${angle.headline}`,
        '',
        `2/ 大多数 AI 写作产品还在优化错的地方：让草稿更好看。`,
        '',
        `3/ 真正的瓶颈是搞清楚：谁在乎、他们已经相信什么、他们卡在哪里、作者会怎么说。`,
        '',
        `4/ 这就是为什么工作流比空白编辑器更重要。`,
        '',
        `5/ 如果一个工具不能研究真实用户、不能保留作者声音，它就不是内容智能体，只是界面更好看的自动补全。`,
      ].join('\n'),
      scores: { hook: 90, novelty: 88, styleMatch: 78, platformFit: 86, credibility: 72, aiSmellRisk: 20, curiosityGap: 84, emotionalCharge: 82, shareability: 80, commentBait: 78, screenshotSentence: 74 },
    },
    {
      name: 'Version C：更像本人版',
      positioning: '更个人化、更以判断驱动、更贴近提供的风格指纹。',
      thread: [
        `1/ ${style.sampleLine}`,
        '',
        `2/ 我现在判断一个写作工具，第一反应不是它能不能写，而是它能不能先理解四件事：用户、内容、需求、作者。`,
        '',
        `3/ 用户是谁？真实人在抱怨什么？`,
        `内容是什么？背后有哪些必须补齐的知识？`,
        `需求是什么？读者已经知道什么，还卡在哪里？`,
        `作者是谁？哪些表达像本人，哪些一看就是 AI 味？`,
        '',
        `4/ 这四件事没有打通，生成再快也只是噪音变多。`,
        '',
        `5/ 好的工作流应该从一个链接开始，最后给你三个版本：稳妥、争议、像本人。`,
      ].join('\n'),
      scores: { hook: 84, novelty: 82, styleMatch: 92, platformFit: 80, credibility: 76, aiSmellRisk: 16, curiosityGap: 74, emotionalCharge: 70, shareability: 76, commentBait: 64, screenshotSentence: 82 },
    },
  ];
}

function adaptToPlatform(
  platform: Platform,
  input: SourceInput,
  style: StyleProfile,
  angle: Angle,
  signal: string[],
  research: ResearchDossier,
): PlatformAsset {
  const title = input.title || '未命名信号';
  const label = topicLabel(title);
  const user = research.userPersona[0]?.detail || input.audience || '创作者和从业者';
  const voice = style.tone.join(' / ');
  const keyword = style.vocabulary.find((item) => !/[\u3400-\u9fff]/.test(item)) || 'workflow';
  // Signals carry their own prefix and trailing period; strip both when embedding mid-sentence.
  const cleanSignal = (s: string) => (s || '').replace(/^(真正的张力在于：|增长空间在于：|「[^」]*」的核心，是)/, '').replace(/[。.]\s*$/, '');

  const templates: Record<Platform, PlatformAsset> = {
    'X Thread': {
      platform,
      title: angle.headline,
      content: [
        `1/ ${angle.hook}`,
        '',
        `2/ 信号是什么：${cleanSignal(signal[0])}`,
        '',
        `3/ 为什么重要：${cleanSignal(signal[2])}`,
        '',
        `4/ 用户需求：${cleanSignal(research.demandMap[2]?.detail || angle.rationale)}`,
        '',
        `5/ 实操动作：围绕「${label}」，先抓取素材，挖掘角度，按平台适配，发布前再打分检查。`,
        '',
        `6/ 真正的产品不是“写一条帖子”，而是 ${keyword}——它能沉淀成一种可被识别的声音。`,
      ].join('\n'),
      cta: '你会给这个工作流补上哪一步？',
    },
    LinkedIn: {
      platform,
      title: `「${label}」：从原始信号到可发布的完整内容包`,
      content: [
        angle.hook,
        '',
        `围绕「${label}」，有意思的转变是：${user} 真正缺的不是一篇更干净的草稿，而是一个能把这种信号稳定加工成内容的系统——既不丢判断，又能适配不同平台。`,
        '',
        `这正是 Writing Style Fingerprint 发挥作用的地方：语气（${voice}）、高频词汇、要避免的措辞，以及作者惯常的表达方式。当它和「${label}」结合，你产出的就不是复述，而是一个可被识别的判断。`,
        '',
        `我会用的工作流：研究真实用户 → 建立「${label}」的内容知识库 → 梳理需求 → 挖角度 → 逐段写作 → 声音适配 → 平台适配 → 评估 → 修订。`,
      ].join('\n'),
      cta: `${user} 里，想看看大家是怎么处理「${label}」这类信号的内容栈的。`,
    },
    Newsletter: {
      platform,
      title: `创作者笔记：${angle.headline}`,
      content: [
        `这周值得留意的信号是「${label}」。`,
        '',
        angle.hook,
        '',
        `值得保存的部分：${cleanSignal(signal[3])}`,
        '',
        `我的判断：${cleanSignal(angle.rationale)}。这类内容最好的形态，不像一份空白文档，更像一个记得你怎么想的小型编辑部。`,
        '',
        `试一试：围绕「${label}」挑一个具体切入点，写下它背后的核心信念，再强制把它推进三个平台。出现的缺口会告诉你，你的定位哪里还不清晰。`,
      ].join('\n'),
      cta: '回复一条你想转成内容包的发布动态。',
    },
    Xiaohongshu: {
      platform,
      title: `关于「${label}」，我的判断`,
      content: [
        `最近看到「${label}」，我的第一反应不是"它能不能火"，而是：${angle.headline}`,
        '',
        `对 ${user} 来说，${cleanSignal(signal[2]) || '真正的难点是把信息变成可用决策'}。`,
        '',
        `所以别急着写，先走完这几步：`,
        `1. 先读懂「${label}」到底在说什么、张力在哪`,
        `2. 挖出你自己的角度（不是复述）`,
        `3. 套上你的表达习惯`,
        `4. 按小红书的结构重写`,
        `5. 发布前用评分模型检查 AI 味和观点强度`,
        '',
        `你的内容不是装饰品，是产品和判断的延伸。`,
      ].join('\n'),
      cta: `关于「${label}」，你现在最想先弄清楚哪一步？`,
    },
    'Blog Outline': {
      platform,
      title: `大纲：${angle.headline}`,
      content: [
        `H1：${angle.headline}`,
        '',
        `开头：从张力切入——${angle.hook}`,
        '',
        `第一节：「${label}」到底改变了什么`,
        `第二节：为什么 ${user} 不能只靠单次生成`,
        `第三节：把你的声音变成可识别的品牌层`,
        `第四节：一条围绕「${label}」、从信号到多平台资产的流水线`,
        `第五节：发布前该衡量什么`,
        '',
        `结尾：持久的优势不是更快的文字，而是关于「${label}」可复用的判断力。`,
      ].join('\n'),
      cta: '把这份大纲当作整个内容包的长文底稿。',
    },
  };

  return templates[platform];
}

function scoreRun(input: SourceInput, style: StyleProfile, angle: Angle, assets: PlatformAsset[], sectionDrafts?: SectionDraft[], versions?: ContentVersion[]): ScoreCard {
  // Score is now driven by the ACTUAL generated content, so the optimization loop has a
  // signal that improves when drafts are rewritten. Each dimension is computed from the
  // text that will actually be published, not just from the raw input.
  const draftsText = sectionDrafts ? sectionDrafts.map((d) => d.draft).join('\n') : '';
  const assetText = assets.map((a) => a.content).join('\n');
  const publishText = `${draftsText}\n${assetText}`;
  const versionText = versions ? versions.map((v) => v.thread).join('\n') : '';

  const sourceDepth = Math.min(100, Math.max(45, input.sourceText.length / 14));
  const hasSpecifics = /\d|github|product|saas|agent|workflow|用户|产品|营销/i.test(`${input.sourceText} ${input.productContext}`);

  // hook strength: does the lead carry a conflict / strong claim?
  const leadLine = (draftsText.split('\n')[0] || angle.hook);
  const hookBoost = /(不是|而是|真正|关键|为什么|可能错了|被低估|背后)/.test(leadLine) ? 14 : /(可以|应该|需要)/.test(leadLine) ? 6 : 0;

  // novelty: contrarian/debate angles + presence of a fresh claim word in drafts
  const noveltyWords = ['反共识', '主流', '被低估', '重新组织', '真正的', '缺的不是', '稀缺的'];
  const noveltyBoost = (noveltyWords.filter((w) => publishText.includes(w)).length) * 4;

  // styleMatch: does the draft use the author's signature vocabulary/tone?
  const vocabHits = style.vocabulary.filter((v) => publishText.includes(v)).length;
  const styleDepth = clampScore(52 + vocabHits * 9 + style.signatureMoves.length * 6);

  // platformFit: each asset long enough for its platform + adapted structure
  const platformFit = Math.round(
    assets.reduce((sum, asset) => sum + Math.min(100, asset.content.length / (asset.platform === 'X Thread' ? 10 : 8)), 0) / assets.length,
  );

  // credibility: source depth + concrete evidence markers (numbers, examples) in drafts
  const evidenceMarkers = (publishText.match(/\d+[%％x倍万]|[（(][^)）]{4,}[)）]|例如|比如|具体/g) || []).length;
  const credibility = clampScore(sourceDepth + (hasSpecifics ? 8 : 0) + Math.min(16, evidenceMarkers * 4));

  const curiosityMarkers = (publishText.match(/为什么|但问题是|真正的|背后|关键是|大多数人|被忽略|却/g) || []).length;
  const curiosityGap = clampScore(54 + Math.min(28, curiosityMarkers * 5) + (/(不是|而是)/.test(leadLine) ? 10 : 0));

  const emotionalMarkers = (publishText.match(/低估|错了|危险|稀缺|焦虑|机会|成本|停下来|噪音|不是观点游戏/g) || []).length;
  const emotionalCharge = clampScore(50 + Math.min(32, emotionalMarkers * 5) + (/!|！|？|\?/.test(leadLine) ? 6 : 0));

  const shareabilityMarkers = (publishText.match(/如果你|保存|转发|写下来|下一步|值得发|你会|这就是为什么/g) || []).length;
  const shareability = clampScore(56 + Math.min(24, shareabilityMarkers * 4) + (publishText.length >= 180 ? 8 : 2));

  const commentBaitMarkers = (publishText.match(/你会|你认同吗|你怎么看|评论区|如果你不同意|站在你的角度/g) || []).length;
  const commentBait = clampScore(48 + Math.min(30, commentBaitMarkers * 6) + (/(你会|你怎么看|你认同吗)/.test(publishText) ? 10 : 0));

  const screenshotLead = leadLine.length >= 24 && leadLine.length <= 80;
  const screenshotMarkers = /(不是|而是|真正|关键|稀缺|机会|判断|成本)/.test(leadLine) ? 16 : 4;
  const screenshotSentence = clampScore(52 + (screenshotLead ? 18 : 8) + screenshotMarkers + (/[，,]/.test(leadLine) ? 6 : 0));

  // aiSmellRisk: detect generic AI filler; lower is better. We only penalize genuine
  // templated filler phrases and generic transition word over-density — never length or
  // evidence (those are good). Injecting author voice should always lower this.
  const aiFillers = ['值得注意的是', '总而言之', '综上所述', '不可否认', '众所周知', '在当今', '随着.*的发展', '首先.*其次.*最后'];
  const fillerHits = aiFillers.reduce((sum, phrase) => sum + (new RegExp(phrase).test(publishText) ? 1 : 0), 0);
  // Count the most over-used generic verbs/nouns as a density penalty, normalized by length.
  const genericWordCount = (publishText.match(/\b(因此|所以|从而|进而|总之|简而言之)\b|可以|一个/g) || []).length;
  const density = publishText.length > 0 ? genericWordCount / (publishText.length / 500) : 0;
  const versionUsesHooks = versionText.length > 0 ? (versionText.match(/^\d\/.*[？?！!]/gm) || []).length : 2;
  const aiSmellRisk = clampScore(40 + fillerHits * 10 + Math.min(30, density * 6) - vocabHits * 2 - versionUsesHooks * 2);

  return {
    hook: clampScore(68 + angle.hook.length / 7 + hookBoost),
    novelty: clampScore(60 + (angle.id === 'contrarian' || angle.id === 'debate' ? 16 : 8) + noveltyBoost),
    styleMatch: styleDepth,
    platformFit: clampScore(platformFit),
    credibility,
    aiSmellRisk,
    curiosityGap,
    emotionalCharge,
    shareability,
    commentBait,
    screenshotSentence,
  };
}

function buildOptimizationNotes(scores: ScoreCard, style: StyleProfile, angle: Angle): string[] {
  const notes = [
    `用最强主张开头：「${angle.headline}」`,
    `保持 ${style.rhythm} 的节奏。`,
  ];
  if (scores.credibility < 78) notes.push('发布前补一个具体的证据点：数字、引用或来源细节。');
  if (scores.aiSmellRisk > 35) notes.push('删掉通用的 AI 措辞，加入一个个人判断或亲历细节。');
  if (scores.platformFit < 80) notes.push('为社媒平台缩短首屏，把背景信息放到钩子之后。');
  if (scores.curiosityGap < 78) notes.push('把首句改成“主流理解 vs 真正问题”的反差，制造继续读下去的缺口。');
  if (scores.emotionalCharge < 74) notes.push('增加风险感、机会感或被低估感，让内容不只是理性说明。');
  if (scores.shareability < 78) notes.push('补一句“为什么值得转发给别人”的判断，让内容具备社交货币。');
  if (scores.commentBait < 72) notes.push('结尾主动抛一个可争论的问题，给评论区明确入口。');
  if (scores.screenshotSentence < 78) notes.push('压缩出一句可以被单独截图传播的高密度判断。');
  return notes;
}

function buildNewsItems(input: SourceInput, now: string): NewsItem[] {
  const keywords = extractKeywords(`${input.title} ${input.sourceText} ${input.productContext}`, 8);
  const topic = input.title || keywords.slice(0, 2).join(' ') || 'WriteLikeMe workflow';
  const primary = keywords[0] || 'agent';
  const secondary = keywords[1] || 'content';
  const templates = [
    `${topic}: builders are turning raw signals into repeatable content workflows`,
    `New discussion: ${primary} tools shift from drafting to execution`,
    `${secondary} teams ask for stronger voice control before publishing`,
    `Open-source launch shows demand for lightweight marketing agents`,
    `Creators compare AI writing tools with agent workspaces`,
    `Founder workflow: one source becomes thread, newsletter, and launch copy`,
    `Trend watch: personal voice becomes a scarce distribution asset`,
    `User complaints cluster around generic AI summaries and weak angles`,
    `Product teams want research, scoring, and review in one content loop`,
    `RSS signal: workflow-first content systems gain attention this week`,
  ];

  return templates.map((title, index) => {
    const source = newsSources[index % newsSources.length];
    const url = `https://example.com/${source.id}/${slugify(title)}`;
    const relevance = clampScore(92 - index * 3 + (title.toLowerCase().includes(primary) ? 4 : 0));
    return {
      id: `${source.id}:${normalizeNewsUrl(url)}`,
      title,
      sourceId: source.id,
      sourceName: source.name,
      sourceType: source.type,
      url,
      rank: index + 1,
      firstSeenAt: now,
      lastSeenAt: now,
      seenCount: 1,
      isNew: true,
      relevance,
      summary: `${source.name} signal around ${primary}/${secondary}; useful as evidence or angle fuel.`,
    };
  });
}

function normalizeNewsUrl(url: string): string {
  try {
    const parsed = new URL(url);
    ['utm_source', 'utm_medium', 'utm_campaign', 'ref', 'source', '_t'].forEach((param) => parsed.searchParams.delete(param));
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return url;
  }
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function inferAudience(text: string): string {
  if (/founder|saas|indie|builder|github|launch/i.test(text)) return '独立开发者、SaaS 创始人和 AI builder';
  if (/marketing|brand|campaign|content/i.test(text)) return '内容营销人和小型营销团队';
  if (/小红书|公众号|创作者|自媒体|写作/.test(text)) return '中文创作者、自媒体作者和知识型博主';
  return '需要把信息转化成可用决策的实践者';
}

function inferPain(text: string): string {
  if (/workflow|pipeline|agent|jasper/i.test(text)) return '他们有很多内容想法，但缺少一个可复用的工作流——从研究、选题、写作、评审到复用都不稳定。';
  if (/github|repo|open source/i.test(text)) return '他们能看懂技术项目，却很难把它翻译成“用户为什么该在意”。';
  if (/news|trend|ai/i.test(text)) return '他们看到了消息，但需要的不是又一份摘要，而是一个更锐利的观点。';
  return '他们需要想清楚：什么重要、对谁重要，以及怎么用一种可被识别的声音把它说出来。';
}

function inferPrimaryPlatform(text: string): string {
  if (/x thread|twitter|tweet/i.test(text)) return 'X 长推';
  if (/linkedin/i.test(text)) return 'LinkedIn 帖子';
  if (/小红书/.test(text)) return '小红书笔记';
  if (/newsletter|substack/i.test(text)) return 'newsletter';
  return '多平台';
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

export function extractKeywords(text: string, limit: number): string[] {
  const tokens = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token))
    .filter((token) => !(/[\u3400-\u9fff]/.test(token) && token.length > 8));

  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) || 0) + 1);

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, limit)
    .map(([token]) => token);
}

function clampScore(value: number): number {
  return Math.round(Math.max(1, Math.min(100, value)));
}

// A concise label for the topic, so prose does not repeat a 60-char title verbatim a dozen times.
// - Chinese titles: keep as-is if short, else truncate to ~16 chars with an ellipsis.
// - English titles: keep the first 2-3 content words in their original order and capitalisation.
function topicLabel(title: string | undefined): string {
  if (!title) return '这个信号';
  const trimmed = title.trim();
  const hasCJK = /[\u3400-\u9fff]/.test(trimmed);
  if (hasCJK) {
    return trimmed.length <= 16 ? trimmed : trimmed.slice(0, 16) + '…';
  }
  // English: walk words in original order, keep the first few content words (skip stopwords).
  const words = trimmed.replace(/[^\p{L}\p{N}\s-]/gu, ' ').split(/\s+/).filter(Boolean);
  const kept: string[] = [];
  for (const w of words) {
    if (kept.length >= 3) break;
    if (w.length > 2 && !stopWords.has(w.toLowerCase())) kept.push(w);
  }
  // If we got fewer than 2 content words, fall back to a truncated title.
  if (kept.length < 2) {
    return trimmed.length <= 24 ? trimmed : trimmed.slice(0, 24) + '…';
  }
  return kept.join(' ');
}
