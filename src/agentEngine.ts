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
};

export type CampaignRun = {
  id: string;
  createdAt: string;
  research: ResearchDossier;
  signal: string[];
  angles: Angle[];
  selectedAngleId: string;
  versions: ContentVersion[];
  assets: PlatformAsset[];
  scores: ScoreCard;
  optimizationNotes: string[];
};

const stopWords = new Set([
  'the',
  'and',
  'for',
  'that',
  'with',
  'this',
  'from',
  'you',
  'are',
  'but',
  'not',
  'have',
  'has',
  'into',
  'about',
  '一个',
  '不是',
  '可以',
  '以及',
  '他们',
  '我们',
  '这个',
  '如果',
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
  const angles = buildAngles(input, signal, research);
  const selectedAngle = angles.find((angle) => angle.id === selectedAngleId) ?? angles[0];
  const versions = buildVersions(input, style, selectedAngle, signal, research);
  const assets = platforms.map((platform) => adaptToPlatform(platform, input, style, selectedAngle, signal, research));
  const scores = scoreRun(input, style, selectedAngle, assets);
  const optimizationNotes = buildOptimizationNotes(scores, style, selectedAngle);

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    research,
    signal,
    angles,
    selectedAngleId: selectedAngle.id,
    versions,
    assets,
    scores,
    optimizationNotes,
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

export function optimizeAsset(asset: PlatformAsset, scores: ScoreCard): PlatformAsset {
  const urgency = scores.hook < 75 ? '更尖锐一点：' : '保留主判断：';
  const proof = scores.credibility < 78 ? '\n\n补一个可信支点：它影响的是团队每天重复发生的执行成本，而不是一个漂亮 demo。' : '';
  const cta = scores.aiSmellRisk > 40 ? '你会把它放进真实工作流吗？' : asset.cta;

  return {
    ...asset,
    title: `${asset.title} · Optimized`,
    content: `${urgency}${asset.content}${proof}`,
    cta,
  };
}

function buildResearchDossier(input: SourceInput, style: StyleProfile): ResearchDossier {
  const body = `${input.title} ${input.sourceText} ${input.productContext}`;
  const keywords = extractKeywords(body, 10);
  const topic = input.title || keywords.slice(0, 2).join(' ') || 'the source material';
  const audience = input.audience || inferAudience(body);
  const userPain = inferPain(body);
  const platform = inferPrimaryPlatform(body);

  return {
    userPersona: [
      { label: 'Primary user', detail: audience },
      { label: 'Current cognition', detail: `They likely understand the surface topic, but have not turned ${topic} into a repeatable publishing system.` },
      { label: 'Active problem', detail: userPain },
      { label: 'Decision moment', detail: `They need to decide whether this is merely interesting news or something worth turning into a content angle.` },
    ],
    realUserLeads: [
      {
        source: 'X / Twitter',
        query: `${keywords.slice(0, 3).join(' ')} (${audience}) pain point`,
        why: 'Find builders discussing the problem in their own words, especially launch threads and replies.',
      },
      {
        source: 'Reddit',
        query: `${keywords.slice(0, 3).join(' ')} site:reddit.com founder creator workflow`,
        why: 'Find unresolved questions, objections, and practical workflow complaints.',
      },
      {
        source: 'Hacker News / Product Hunt',
        query: `${topic} alternatives comments launch`,
        why: 'Find early adopter language, skepticism, and buying triggers around similar tools.',
      },
    ],
    knowledgeBase: [
      { label: 'Core topic', detail: topic },
      { label: 'Relevant keywords', detail: keywords.slice(0, 8).join(', ') || 'Add a longer source to extract sharper keywords.' },
      { label: 'Product context', detail: input.productContext || 'No product context supplied yet.' },
      { label: 'Research gap', detail: `Before publishing, verify claims by searching the leads above and adding 2-3 concrete examples or links.` },
    ],
    demandMap: [
      { label: 'Already knows', detail: `The audience probably knows AI can summarize or draft content.` },
      { label: 'Does not know yet', detail: `They may not see how user research, angle mining, style fingerprinting, and scoring form one workflow.` },
      { label: 'Need fulfilled', detail: `The content should help them see a practical path from ${platform} signal to publishable assets.` },
      { label: 'Trust requirement', detail: 'Use real user language, concrete source details, and one clear judgment from the author.' },
    ],
    authorProfile: [
      { label: 'Voice mode', detail: style.tone.join(' / ') },
      { label: 'Rhythm', detail: style.rhythm },
      { label: 'Signature moves', detail: style.signatureMoves.join('; ') },
      { label: 'Avoid', detail: style.forbidden.join(', ') },
    ],
  };
}

function extractSignal(input: SourceInput, research: ResearchDossier): string[] {
  const keywords = extractKeywords(`${input.title} ${input.sourceText} ${input.productContext}`, 8);
  const target = research.userPersona[0]?.detail || input.audience || 'builders and creators';
  return [
    `${input.title || 'This signal'} is mainly about ${keywords.slice(0, 3).join(', ') || 'a sharper product story'}.`,
    `The audience that should care first: ${target}.`,
    `The useful tension: ${research.demandMap[1]?.detail || 'the reader has information but not yet a usable decision.'}`,
    `The growth angle: ${research.demandMap[2]?.detail || "one input can become many channel-native assets without flattening the author's voice."}`,
  ];
}

function buildAngles(input: SourceInput, signal: string[], research: ResearchDossier): Angle[] {
  const topic = input.title || extractKeywords(input.sourceText, 1)[0] || 'this product signal';
  const user = research.userPersona[0]?.detail || 'builders';
  return [
    {
      id: 'contrarian',
      label: '反常识观点',
      headline: `${topic} is not a writing problem. It is a workflow problem.`,
      rationale: '把用户注意力从生成文案转向营销执行闭环。',
      hook: `Most teams do not need more drafts. They need a system that keeps every draft pointed at the same strategy.`,
    },
    {
      id: 'startup',
      label: '创业机会',
      headline: `The opening: a Jasper for ${user}, not enterprise marketing teams.`,
      rationale: '把大平台能力下沉到独立开发者和小团队。',
      hook: `Jasper is moving upmarket. That leaves a very useful gap for founders who still publish like a one-person media company.`,
    },
    {
      id: 'tool',
      label: '工具推荐',
      headline: `Use ${topic} as a source, then turn it into a launch pack.`,
      rationale: '强调直接可用的内容生产结果。',
      hook: `A good content tool should not ask for a better prompt. It should ask what you are launching and where it needs to travel.`,
    },
    {
      id: 'trend',
      label: '趋势判断',
      headline: `AI writing tools are becoming marketing operating systems.`,
      rationale: signal[2] || '把单点生成升级为流程化执行。',
      hook: `The next wave is not better autocomplete. It is agentic execution with memory, taste, and review loops.`,
    },
    {
      id: 'debate',
      label: '争议性问题',
      headline: `If everyone has the same model, voice becomes the scarce asset.`,
      rationale: '突出 Writing Style Fingerprint 的差异化价值。',
      hook: `The model is not the moat. Your angle, constraints, and accumulated taste are.`,
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
  const user = research.userPersona[0]?.detail || input.audience || 'builders';
  const need = research.demandMap[2]?.detail || 'turning a source into publishable content';
  const authorMove = style.signatureMoves[0] || 'state a clear judgment first';
  const proofPrompt = research.realUserLeads[0]?.query || 'search real user language before publishing';

  const base = [
    `1/ ${angle.hook}`,
    '',
    `2/ The reader: ${user}.`,
    `They do not need another generic summary. They need help with ${need.toLowerCase()}`,
    '',
    `3/ The signal: ${signal[0]}`,
    '',
    `4/ The gap: ${signal[2]}`,
    '',
    `5/ The workflow: research real users -> build a knowledge base -> map demand -> apply author voice -> draft -> score -> revise.`,
    '',
    `6/ Author move: ${authorMove}.`,
  ];

  return [
    {
      name: 'Version A: 稳妥专业版',
      positioning: 'Clear, useful, low-risk. Best for LinkedIn, newsletter, or founder updates.',
      thread: [...base, '', `7/ Before publishing, verify one proof point with: ${proofPrompt}`].join('\n'),
      scores: { hook: 78, novelty: 76, styleMatch: 82, platformFit: 84, credibility: 80, aiSmellRisk: 24 },
    },
    {
      name: 'Version B: 更有争议版',
      positioning: 'Sharper claim, stronger debate energy. Best for X and comment-driven platforms.',
      thread: [
        `1/ Hot take: ${angle.headline}`,
        '',
        `2/ Most AI writing products are still optimizing the wrong thing: prettier drafts.`,
        '',
        `3/ The real bottleneck is knowing who cares, what they already believe, what they are stuck on, and how the author would actually say it.`,
        '',
        `4/ That is why the workflow matters more than the blank editor.`,
        '',
        `5/ If the tool cannot research real users and preserve voice, it is not a content agent. It is autocomplete with a nicer UI.`,
      ].join('\n'),
      scores: { hook: 90, novelty: 88, styleMatch: 78, platformFit: 86, credibility: 72, aiSmellRisk: 20 },
    },
    {
      name: 'Version C: 更像本人版',
      positioning: 'More personal, more judgment-led, closer to the supplied style fingerprint.',
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
        `5/ 好的 workflow 应该从一个链接开始，最后给你三个版本：稳妥、争议、像本人。`,
      ].join('\n'),
      scores: { hook: 84, novelty: 82, styleMatch: 92, platformFit: 80, credibility: 76, aiSmellRisk: 16 },
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
  const title = input.title || 'Untitled signal';
  const voice = style.tone.join(' / ');
  const keyword = style.vocabulary.find((item) => !/[\u3400-\u9fff]/.test(item)) || 'workflow';

  const templates: Record<Platform, PlatformAsset> = {
    'X Thread': {
      platform,
      title: angle.headline,
      content: [
        `1/ ${angle.hook}`,
        '',
        `2/ The signal: ${signal[0]}`,
        '',
        `3/ Why it matters: ${signal[2]}`,
        '',
        `4/ User need: ${research.demandMap[2]?.detail || angle.rationale}`,
        '',
        `5/ The practical move: capture the source, mine the angle, adapt it by platform, then score it before publishing.`,
        '',
        `6/ The real product is not "write a post". It is ${keyword} that compounds into a recognizable voice.`,
      ].join('\n'),
      cta: 'What would you add to this workflow?',
    },
    LinkedIn: {
      platform,
      title: `${title}: from raw signal to publishable campaign`,
      content: [
        angle.hook,
        '',
        `The interesting shift is that content tools are becoming execution systems. A founder does not just need a cleaner draft. They need the same idea translated into a thread, a launch post, a newsletter section, and a product narrative without losing voice.`,
        '',
        `That is where a Writing Style Fingerprint matters: tone (${voice}), recurring vocabulary, forbidden phrases, and the author's usual way of making a point.`,
        '',
        `The workflow I would use: user research -> content knowledge base -> demand map -> angle -> draft -> voice adaptation -> platform adaptation -> evaluation -> revision.`,
      ].join('\n'),
      cta: 'Curious how other builders are handling this in their content stack.',
    },
    Newsletter: {
      platform,
      title: `Builder note: ${angle.headline}`,
      content: [
        `This week's useful signal is ${title}.`,
        '',
        angle.hook,
        '',
        `The part worth saving: ${signal[3]}`,
        '',
        `My take: ${angle.rationale} The best version of this product category will feel less like a blank document and more like a small editorial team that remembers how you think.`,
        '',
        `Try this: pick one product update, write the core belief behind it, then force it into three platforms. The gaps will show you where your positioning is still fuzzy.`,
      ].join('\n'),
      cta: 'Reply with one launch you want to turn into a content pack.',
    },
    Xiaohongshu: {
      platform,
      title: `不是写文案，是搭内容工作流`,
      content: [
        `最近我越来越觉得：${angle.headline}`,
        '',
        `普通 AI 写作的问题是，它能给你一篇稿子，但很难稳定像你。`,
        '',
        `更好的流程应该是：`,
        `1. 先读懂信号`,
        `2. 挖出传播角度`,
        `3. 套上自己的表达习惯`,
        `4. 按平台重写结构`,
        `5. 再用评分模型检查 AI 味和观点强度`,
        '',
        `这对独立开发者尤其重要，因为你的内容不是装饰品，是产品增长的一部分。`,
      ].join('\n'),
      cta: '你现在最想自动化哪一步？',
    },
    'Blog Outline': {
      platform,
      title: `Outline: ${angle.headline}`,
      content: [
        `H1: ${angle.headline}`,
        '',
        `Intro: Start with the tension that ${angle.hook.toLowerCase()}`,
        '',
        `Section 1: What changed in AI content tools`,
        `Section 2: Why single-shot generation is not enough`,
        `Section 3: How Writing Style Fingerprint becomes the brand layer for builders`,
        `Section 4: A practical pipeline from source signal to multi-platform assets`,
        `Section 5: What to measure before publishing`,
        '',
        `Conclusion: The durable advantage is not faster text. It is repeatable taste.`,
      ].join('\n'),
      cta: 'Use this outline as the long-form source for the rest of the campaign.',
    },
  };

  return templates[platform];
}

function scoreRun(input: SourceInput, style: StyleProfile, angle: Angle, assets: PlatformAsset[]): ScoreCard {
  const sourceDepth = Math.min(100, Math.max(45, input.sourceText.length / 14));
  const styleDepth = Math.min(100, Math.max(50, style.vocabulary.length * 8 + style.signatureMoves.length * 10));
  const hasSpecifics = /\d|github|product|saas|agent|workflow|jasper|用户|产品|营销/i.test(
    `${input.sourceText} ${input.productContext}`,
  );
  const platformFit = Math.round(
    assets.reduce((sum, asset) => sum + Math.min(100, asset.content.length / (asset.platform === 'X Thread' ? 10 : 8)), 0) /
      assets.length,
  );

  return {
    hook: clampScore(72 + angle.hook.length / 6),
    novelty: clampScore(68 + (angle.id === 'contrarian' || angle.id === 'debate' ? 18 : 10)),
    styleMatch: clampScore(styleDepth),
    platformFit: clampScore(platformFit),
    credibility: clampScore(sourceDepth + (hasSpecifics ? 12 : 0)),
    aiSmellRisk: clampScore(55 - style.vocabulary.length * 3 - (input.sourceText.length > 500 ? 10 : 0)),
  };
}

function buildOptimizationNotes(scores: ScoreCard, style: StyleProfile, angle: Angle): string[] {
  const notes = [
    `Lead with the strongest claim: "${angle.headline}"`,
    `Keep the rhythm ${style.rhythm.toLowerCase()}.`,
  ];
  if (scores.credibility < 78) notes.push('Add one concrete proof point, number, quote, or source detail before publishing.');
  if (scores.aiSmellRisk > 35) notes.push('Remove generic AI phrases and add one personal judgment or lived detail.');
  if (scores.platformFit < 80) notes.push('Shorten the first screen for social platforms and move context after the hook.');
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
  if (/founder|saas|indie|builder|github|launch/i.test(text)) return 'indie hackers, SaaS founders, and AI builders';
  if (/marketing|brand|campaign|content/i.test(text)) return 'content marketers and small marketing teams';
  if (/小红书|公众号|创作者|自媒体|写作/.test(text)) return '中文创作者、自媒体作者和知识型博主';
  return 'curious practitioners who need to turn information into a useful decision';
}

function inferPain(text: string): string {
  if (/workflow|pipeline|agent|jasper/i.test(text)) return 'They have many content ideas, but no repeatable workflow for research, angle selection, drafting, review, and reuse.';
  if (/github|repo|open source/i.test(text)) return 'They can understand the technical project, but struggle to translate it into why users should care.';
  if (/news|trend|ai/i.test(text)) return 'They see the news, but need a sharper point of view instead of another summary.';
  return 'They need clarity on what matters, who it matters to, and how to say it in a recognizable voice.';
}

function inferPrimaryPlatform(text: string): string {
  if (/x thread|twitter|tweet/i.test(text)) return 'X thread';
  if (/linkedin/i.test(text)) return 'LinkedIn post';
  if (/小红书/.test(text)) return '小红书笔记';
  if (/newsletter|substack/i.test(text)) return 'newsletter';
  return 'multi-platform';
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[。！？.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function extractKeywords(text: string, limit: number): string[] {
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
