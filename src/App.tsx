import {
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clipboard,
  Download,
  Gauge,
  History,
  Layers3,
  Library,
  MessageSquareText,
  Newspaper,
  PenLine,
  RefreshCw,
  Search,
  Settings2,
  Rocket,
  Sparkles,
  Target,
  Users,
  Wand2,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import {
  analyzeStyle,
  evaluateTopic,
  optimizeAsset,
  refreshNewsAggregation,
  runCampaign,
  type Angle,
  type CampaignRun,
  type NewsAggregation,
  type PlatformAsset,
  type SourceInput,
} from './agentEngine';
import {
  exportMarkdown,
  loadNewsAggregation,
  loadRuntimeConfig,
  loadRuns,
  loadSource,
  loadStyleSamples,
  saveNewsAggregation,
  saveRuntimeConfig,
  saveRuns,
  saveSource,
  saveStyleSamples,
  type LlmProviderKey,
  type RuntimeConfig,
  type SearchProviderKey,
} from './storage';

const agents = [
  { name: 'News Radar Agent', detail: '多源聚合新闻，按 URL 和来源去重并支持增量刷新。', icon: Newspaper },
  { name: 'User Research Agent', detail: '建立用户画像，并给出真实用户搜索线索。', icon: Users },
  { name: 'Knowledge Agent', detail: '把链接或文本扩展成写作知识库。', icon: BookOpen },
  { name: 'Demand Agent', detail: '判断读者已知、未知、卡点和内容需求。', icon: Target },
  { name: 'Signal Agent', detail: '抓取输入中的产品、新闻、用户和传播价值。', icon: BrainCircuit },
  { name: 'Angle Agent', detail: '生成反常识、创业机会、趋势、工具和争议角度。', icon: Sparkles },
  { name: 'Style Fingerprint', detail: '从历史样本文案中提取语气、节奏和禁用表达。', icon: PenLine },
  { name: 'Platform Adapter', detail: '把同一主题改写为不同平台的内容资产。', icon: Layers3 },
  { name: 'Evaluator', detail: '评估 hook、观点、风格、可信度和 AI 味风险。', icon: Gauge },
];

const scoreLabels: Record<string, string> = {
  hook: 'Hook',
  novelty: 'Novelty',
  styleMatch: 'Style Match',
  platformFit: 'Platform Fit',
  credibility: 'Credibility',
  aiSmellRisk: 'AI Smell Risk',
};

const workflowSteps = [
  { id: 'input', title: 'Start', description: '输入 URL 或文本' },
  { id: 'news', title: 'News', description: '聚合新闻并增量刷新' },
  { id: 'insight', title: 'Insight', description: '提取核心信息' },
  { id: 'research', title: 'Research', description: '确认用户和知识库' },
  { id: 'angles', title: 'Angles', description: '选择选题角度' },
  { id: 'meeting', title: 'Meeting', description: '选题会评分' },
  { id: 'style', title: 'Voice', description: '确认作者风格' },
  { id: 'draft', title: 'Draft', description: '查看三版 X thread' },
  { id: 'assets', title: 'Assets', description: '适配多平台内容' },
  { id: 'score', title: 'Review', description: '评分、优化、导出' },
] as const;

type WorkflowStepId = (typeof workflowSteps)[number]['id'];

const llmProviders: { key: LlmProviderKey; name: string; hint: string }[] = [
  { key: 'openai', name: 'OpenAI', hint: 'GPT-4.1 / GPT-4o / o-series' },
  { key: 'anthropic', name: 'Anthropic', hint: 'Claude Sonnet / Opus' },
  { key: 'gemini', name: 'Google Gemini', hint: 'Gemini 1.5 / 2.x' },
  { key: 'deepseek', name: 'DeepSeek', hint: 'DeepSeek Chat / Reasoner' },
  { key: 'openrouter', name: 'OpenRouter', hint: 'Multi-model routing' },
  { key: 'xai', name: 'xAI', hint: 'Grok models' },
  { key: 'qwen', name: 'Alibaba Qwen', hint: 'Qwen / DashScope' },
  { key: 'kimi', name: 'Moonshot Kimi', hint: 'Kimi / Moonshot' },
];

const searchProviders: { key: SearchProviderKey; name: string; hint: string }[] = [
  { key: 'tavily', name: 'Tavily', hint: 'AI search and crawl' },
  { key: 'serper', name: 'Serper', hint: 'Google SERP API' },
  { key: 'brave', name: 'Brave Search', hint: 'Web search API' },
  { key: 'exa', name: 'Exa', hint: 'Neural web search' },
  { key: 'bing', name: 'Bing Search', hint: 'Microsoft search API' },
  { key: 'googleCse', name: 'Google CSE', hint: 'Programmable Search' },
];

export function App() {
  const [source, setSource] = useState<SourceInput>(() => loadSource());
  const [newsAggregation, setNewsAggregation] = useState<NewsAggregation>(() => loadNewsAggregation() ?? refreshNewsAggregation(loadSource()));
  const [styleSamples, setStyleSamples] = useState(() => loadStyleSamples());
  const [runs, setRuns] = useState<CampaignRun[]>(() => loadRuns());
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(() => loadRuntimeConfig());
  const [selectedAngleId, setSelectedAngleId] = useState<string | undefined>(runs[0]?.selectedAngleId);
  const [activePlatform, setActivePlatform] = useState(0);
  const [activeStep, setActiveStep] = useState<WorkflowStepId>('input');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const styleProfile = useMemo(() => analyzeStyle(styleSamples), [styleSamples]);
  const fallbackRun = useMemo(() => runCampaign(source, styleProfile, selectedAngleId), [source, styleProfile, selectedAngleId]);
  const currentRun = runs[0]?.research && runs[0]?.versions ? runs[0] : fallbackRun;
  const selectedAngle = currentRun.angles.find((angle) => angle.id === currentRun.selectedAngleId) ?? currentRun.angles[0];
  const activeAsset = currentRun.assets[activePlatform] ?? currentRun.assets[0];
  const topicEvaluation = useMemo(() => evaluateTopic(selectedAngle, source, newsAggregation), [selectedAngle, source, newsAggregation]);
  const llmKeyCount = Object.values(runtimeConfig.llmKeys).filter(Boolean).length;
  const searchKeyCount = Object.values(runtimeConfig.searchKeys).filter(Boolean).length;
  const desktopInfo = typeof window !== 'undefined' ? window.writeLikeMeDesktop : undefined;

  function updateSource(key: keyof SourceInput, value: string) {
    const next = { ...source, [key]: value };
    setSource(next);
    saveSource(next);
  }

  function refreshNews() {
    const next = refreshNewsAggregation(source, newsAggregation);
    setNewsAggregation(next);
    saveNewsAggregation(next);
  }

  function refreshCurrentStep() {
    if (activeStep === 'news') {
      refreshNews();
      return;
    }
    generateAndGo(activeStep);
  }

  function updateStyleSamples(value: string) {
    setStyleSamples(value);
    saveStyleSamples(value);
  }

  function updateRuntimeConfig<K extends keyof RuntimeConfig>(key: K, value: RuntimeConfig[K]) {
    const next = { ...runtimeConfig, [key]: value };
    setRuntimeConfig(next);
    saveRuntimeConfig(next);
  }

  function updateLlmKey(provider: LlmProviderKey, value: string) {
    updateRuntimeConfig('llmKeys', { ...runtimeConfig.llmKeys, [provider]: value });
  }

  function updateSearchKey(provider: SearchProviderKey, value: string) {
    updateRuntimeConfig('searchKeys', { ...runtimeConfig.searchKeys, [provider]: value });
  }

  function generate(angleId = selectedAngleId) {
    const nextRun = runCampaign(source, styleProfile, angleId);
    const nextRuns = [nextRun, ...runs].slice(0, 8);
    setRuns(nextRuns);
    setSelectedAngleId(nextRun.selectedAngleId);
    setActivePlatform(0);
    saveRuns(nextRuns);
  }

  function generateAndGo(nextStep: WorkflowStepId, angleId = selectedAngleId) {
    generate(angleId);
    setActiveStep(nextStep);
    window.setTimeout(() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  function selectAngle(angle: Angle) {
    setSelectedAngleId(angle.id);
    generate(angle.id);
  }

  function optimizeCurrentAsset() {
    const updatedAsset = optimizeAsset(activeAsset, currentRun.scores);
    const updatedRun = {
      ...currentRun,
      assets: currentRun.assets.map((asset) => (asset.platform === activeAsset.platform ? updatedAsset : asset)),
      optimizationNotes: ['Optimized active asset with sharper hook and proof prompts.', ...currentRun.optimizationNotes],
    };
    const nextRuns = [updatedRun, ...runs.slice(1)].slice(0, 8);
    setRuns(nextRuns);
    saveRuns(nextRuns);
  }

  async function copyAsset(asset: PlatformAsset) {
    await navigator.clipboard.writeText(`${asset.title}\n\n${asset.content}\n\n${asset.cta}`);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  function downloadRun() {
    const markdown = exportMarkdown(currentRun, styleProfile, newsAggregation, topicEvaluation);
    const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `writelikeme-${new Date().toISOString().slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Workspace navigation">
        <div className="brand-block">
          <div className="brand-mark">
            <Rocket size={22} />
          </div>
          <div>
            <strong>WriteLikeMe</strong>
            <span>Builder Content Agents</span>
          </div>
        </div>

        <nav className="nav-list">
          <a href="#workspace">
            <Wand2 size={17} />
            Workspace
          </a>
          <a href="#agents">
            <Library size={17} />
            Agent Library
          </a>
          <a href="#style">
            <PenLine size={17} />
            Style IQ
          </a>
          <a href="#history">
            <History size={17} />
            Runs
          </a>
          <a href="#settings" onClick={() => setSettingsOpen((open) => !open)}>
            <Settings2 size={17} />
            Settings
          </a>
        </nav>

        <div className="sidebar-note">
          <span>Pipeline</span>
          <strong>{'Signal -> Angle -> Voice -> Platforms -> Score -> Optimize'}</strong>
        </div>
      </aside>

      <section className="workspace" id="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">AI-native marketing execution for builders</p>
            <h1>Start with one URL or text. Move through the writing workflow step by step.</h1>
            {desktopInfo && <p className="desktop-badge">Desktop app · Electron {desktopInfo.version} · {desktopInfo.platform}</p>}
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={downloadRun} title="Export campaign">
              <Download size={18} />
            </button>
            <button className="primary-button" onClick={() => setActiveStep('news')}>
              <Sparkles size={18} />
              Start Flow
            </button>
          </div>
        </header>

        <div className="hero-band flow-hero">
          <div className="signal-map" aria-hidden="true">
            <div className="map-node large">Source</div>
            <div className="map-line" />
            <div className="map-node">Agents</div>
            <div className="map-line" />
            <div className="map-node">Assets</div>
            <div className="map-line" />
            <div className="map-node accent">Scores</div>
          </div>
          <div className="hero-copy">
            <strong>Waterfall mode</strong>
            <span>每一步先给结果，再让你确认、选择或修改，然后进入下一步。</span>
          </div>
        </div>

        {settingsOpen && (
          <section className="settings-panel" id="settings">
            <div className="section-title">
              <Settings2 size={18} />
              <h2>Settings</h2>
            </div>
            <p className="settings-note">配置是全局项，不占用写作流程。这里只需要填各平台 API key，后续接入真实联网检索和模型生成时直接读取。</p>
            <div className="config-banner">
              <strong>{llmKeyCount || searchKeyCount ? 'API keys configured' : 'Local rules only'}</strong>
              <span>
                {llmKeyCount || searchKeyCount
                  ? `${llmKeyCount} 个 LLM key，${searchKeyCount} 个 Search key 已保存到本地浏览器。`
                  : '当前不会调用外部模型或搜索。Research Dossier 是本地推断，Real User Leads 是建议搜索 query。'}
              </span>
            </div>
            <div className="provider-section">
              <div className="provider-heading">
                <h3>Mainstream LLM APIs</h3>
                <span>只填 key，模型和 endpoint 使用默认适配。</span>
              </div>
              <div className="settings-grid provider-grid">
                {llmProviders.map((provider) => (
                  <label className="provider-key-card" key={provider.key}>
                    <span>{provider.name}</span>
                    <small>{provider.hint}</small>
                    <input
                      type="password"
                      placeholder={`${provider.name} API key`}
                      value={runtimeConfig.llmKeys[provider.key]}
                      onChange={(event) => updateLlmKey(provider.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
            <div className="provider-section">
              <div className="provider-heading">
                <h3>Mainstream Search APIs</h3>
                <span>用于真实用户搜索、网页检索和资料补充。</span>
              </div>
              <div className="settings-grid provider-grid">
                {searchProviders.map((provider) => (
                  <label className="provider-key-card" key={provider.key}>
                    <span>{provider.name}</span>
                    <small>{provider.hint}</small>
                    <input
                      type="password"
                      placeholder={`${provider.name} API key`}
                      value={runtimeConfig.searchKeys[provider.key]}
                      onChange={(event) => updateSearchKey(provider.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
          </section>
        )}

        <div className="flow-layout" id="workflow">
          <nav className="flow-steps" aria-label="Writing workflow steps">
            {workflowSteps.map((step, index) => {
              const isActive = step.id === activeStep;
              const activeIndex = workflowSteps.findIndex((item) => item.id === activeStep);
              const isDone = index < activeIndex;
              return (
                <button className={`${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`} key={step.id} onClick={() => setActiveStep(step.id)}>
                  <span>{isDone ? <CheckCircle2 size={16} /> : index + 1}</span>
                  <strong>{step.title}</strong>
                  <small>{step.description}</small>
                </button>
              );
            })}
          </nav>

          <section className="flow-stage">
            {activeStep === 'input' && (
              <FlowCard
                icon={<BookOpen size={19} />}
                kicker="Step 1"
                title="从一个 URL 或一段文本开始"
                description="你可以只填 URL 或 source notes。其他字段可以留空，后续 workflow 会给出推断结果。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('news')}>
                    Aggregate news
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="input-flow-grid">
                  <label>
                    URL or source
                    <input value={source.url} onChange={(event) => updateSource('url', event.target.value)} />
                  </label>
                  <label>
                    Working title
                    <input value={source.title} onChange={(event) => updateSource('title', event.target.value)} />
                  </label>
                  <label>
                    Audience
                    <input value={source.audience} onChange={(event) => updateSource('audience', event.target.value)} />
                  </label>
                  <label>
                    Product context
                    <textarea value={source.productContext} onChange={(event) => updateSource('productContext', event.target.value)} />
                  </label>
                  <label className="span-2">
                    Source notes or pasted text
                    <textarea className="tall" value={source.sourceText} onChange={(event) => updateSource('sourceText', event.target.value)} />
                  </label>
                </div>
              </FlowCard>
            )}

            {activeStep === 'news' && (
              <FlowCard
                icon={<Newspaper size={19} />}
                kicker="Step 2"
                title="新闻聚合和增量刷新"
                description="参考 TrendRadar 的思路：多源热榜/RSS、URL+来源去重、记录首次出现、最后出现、刷新次数和新增数量。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('insight')}>
                    Use news signals
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="news-toolbar">
                  <div>
                    <strong>{newsAggregation.items.length} items</strong>
                    <span>
                      新增 {newsAggregation.newCount} · 更新 {newsAggregation.updatedCount} · 刷新 {newsAggregation.refreshCount} 次 ·{' '}
                      {new Date(newsAggregation.refreshedAt).toLocaleString()}
                    </span>
                  </div>
                  <button className="secondary-button" onClick={refreshNews}>
                    <RefreshCw size={17} />
                    Incremental refresh
                  </button>
                </div>
                <div className="source-strip">
                  {newsAggregation.sources.map((sourceItem) => (
                    <span key={sourceItem.id}>{sourceItem.name}</span>
                  ))}
                </div>
                <div className="news-list">
                  {newsAggregation.items.map((item) => (
                    <article className={item.isNew ? 'news-card is-new' : 'news-card'} key={item.id}>
                      <div className="news-meta">
                        <span>{item.sourceName}</span>
                        <strong>#{item.rank}</strong>
                      </div>
                      <h3>{item.title}</h3>
                      <p>{item.summary}</p>
                      <div className="news-footer">
                        <small>{item.isNew ? 'New' : `Seen ${item.seenCount}x`}</small>
                        <small>Relevance {item.relevance}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'insight' && (
              <FlowCard
                icon={<BrainCircuit size={19} />}
                kicker="Step 3"
                title="提取核心信息和传播信号"
                description="先把来源、新闻和产品上下文压缩成可讨论的核心判断，再进入用户与需求研究。"
                action={
                  <button className="primary-button" onClick={() => generateAndGo('research')}>
                    Confirm insight
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="signal-list flow-block">
                  {currentRun.signal.map((item) => (
                    <div className="signal-item" key={item}>
                      <CheckCircle2 size={17} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'research' && (
              <FlowCard
                icon={<Search size={19} />}
                kicker="Step 4"
                title="确认用户、内容知识库和需求地图"
                description="这里像研究瀑布的第一层：先判断给谁写、他们知道什么、还缺什么，以及下一步应该去哪里找真实用户证据。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('angles')}>
                    Confirm research
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="signal-list flow-block">
                  {currentRun.signal.map((item) => (
                    <div className="signal-item" key={item}>
                      <CheckCircle2 size={17} />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
                <div className="research-grid">
                  <ResearchColumn title="User Persona" items={currentRun.research.userPersona} />
                  <ResearchColumn title="Knowledge Base" items={currentRun.research.knowledgeBase} />
                  <ResearchColumn title="Demand Map" items={currentRun.research.demandMap} />
                  <ResearchColumn title="Author Profile" items={currentRun.research.authorProfile} />
                </div>
                <div className="search-leads">
                  {currentRun.research.realUserLeads.map((lead) => (
                    <div className="lead-card" key={`${lead.source}-${lead.query}`}>
                      <span>{lead.source}</span>
                      <strong>{lead.query}</strong>
                      <small>{lead.why}</small>
                    </div>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'angles' && (
              <FlowCard
                icon={<Sparkles size={19} />}
                kicker="Step 5"
                title="选择一个选题角度"
                description="每个角度会触发一次重新生成。你可以点卡片切换，然后进入选题会评分。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('meeting')}>
                    Send to topic meeting
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="angle-grid">
                  {currentRun.angles.map((angle) => (
                    <button
                      className={`angle-card ${angle.id === selectedAngle.id ? 'selected' : ''}`}
                      key={angle.id}
                      onClick={() => selectAngle(angle)}
                    >
                      <span>{angle.label}</span>
                      <strong>{angle.headline}</strong>
                      <small>{angle.rationale}</small>
                    </button>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'meeting' && (
              <FlowCard
                icon={<Target size={19} />}
                kicker="Step 6"
                title="选题会：判断这个选题值不值得写"
                description="用 10 个百分制维度评估选题价值。通过后再进入作者风格和正式写作。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('style')}>
                    Approve topic
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="meeting-summary">
                  <div className="meeting-score">
                    <span>{topicEvaluation.overall}</span>
                    <strong>{topicEvaluation.verdict}</strong>
                  </div>
                  <p>{topicEvaluation.recommendation}</p>
                </div>
                <div className="topic-score-grid">
                  {topicEvaluation.dimensions.map((dimension) => (
                    <div className="topic-score-card" key={dimension.label}>
                      <div>
                        <span>{dimension.label}</span>
                        <strong>{dimension.score}</strong>
                      </div>
                      <div className="score-track">
                        <div style={{ width: `${dimension.score}%` }} />
                      </div>
                      <p>{dimension.rationale}</p>
                    </div>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'style' && (
              <FlowCard
                icon={<PenLine size={19} />}
                kicker="Step 7"
                title="确认 Write Like Me 风格指纹"
                description="补充过往文本会影响后续版本。确认后，workflow 会把选定角度改写成三种 X thread。"
                action={
                  <button className="primary-button" onClick={() => generateAndGo('draft', selectedAngle.id)}>
                    Apply voice
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <label>
                  Past writing samples, tags, or author profile
                  <textarea className="style-box" value={styleSamples} onChange={(event) => updateStyleSamples(event.target.value)} />
                </label>
                <div className="fingerprint-grid">
                  <Metric label="Tone" value={styleProfile.tone.join(' / ')} />
                  <Metric label="Rhythm" value={styleProfile.rhythm} />
                  <Metric label="Vocabulary" value={styleProfile.vocabulary.slice(0, 5).join(', ') || 'Add more samples'} />
                  <Metric label="Forbidden" value={styleProfile.forbidden.slice(0, 3).join(', ')} />
                </div>
              </FlowCard>
            )}

            {activeStep === 'draft' && (
              <FlowCard
                icon={<MessageSquareText size={19} />}
                kicker="Step 8"
                title="查看三版 X thread"
                description="A 稳妥专业，B 更有争议，C 更像本人。确认后进入多平台资产适配。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('assets')}>
                    Adapt to platforms
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="version-grid">
                  {currentRun.versions.map((version) => (
                    <article className="version-card" key={version.name}>
                      <span>{version.name}</span>
                      <strong>{version.positioning}</strong>
                      <pre>{version.thread}</pre>
                      <div className="mini-scores">
                        <small>Hook {version.scores.hook}</small>
                        <small>Style {version.scores.styleMatch}</small>
                        <small>AI Risk {version.scores.aiSmellRisk}</small>
                      </div>
                    </article>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'assets' && (
              <FlowCard
                icon={<Layers3 size={19} />}
                kicker="Step 9"
                title="多平台内容资产"
                description="切换平台查看不同结构。可以先优化当前平台稿件，再进入评分复盘。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('score')}>
                    Review score
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="tabs" role="tablist" aria-label="Generated platform assets">
                  {currentRun.assets.map((asset, index) => (
                    <button className={activePlatform === index ? 'active' : ''} key={asset.platform} onClick={() => setActivePlatform(index)}>
                      {asset.platform}
                    </button>
                  ))}
                </div>
                <article className="asset-output flow-asset">
                  <h3>{activeAsset.title}</h3>
                  <pre>{activeAsset.content}</pre>
                  <div className="cta-row">
                    <span>{activeAsset.cta}</span>
                    <div>
                      <button className="icon-button" onClick={() => copyAsset(activeAsset)} title="Copy asset">
                        <Clipboard size={17} />
                      </button>
                      <button className="secondary-button" onClick={optimizeCurrentAsset}>
                        <Wand2 size={17} />
                        Optimize
                      </button>
                    </div>
                  </div>
                  {copied && <p className="copy-toast">Copied to clipboard</p>}
                </article>
              </FlowCard>
            )}

            {activeStep === 'score' && (
              <FlowCard
                icon={<Gauge size={19} />}
                kicker="Step 10"
                title="评分、优化建议和导出"
                description="这里是最终复盘：判断 hook、风格匹配、可信度和 AI 味风险。"
                action={
                  <button className="primary-button" onClick={downloadRun}>
                    Export campaign
                    <Download size={18} />
                  </button>
                }
              >
                <div className="review-grid">
                  <div className="scores">
                    {Object.entries(currentRun.scores).map(([key, value]) => (
                      <div className="score-row" key={key}>
                        <span>{scoreLabels[key]}</span>
                        <div className="score-track">
                          <div style={{ width: `${value}%` }} />
                        </div>
                        <strong>{value}</strong>
                      </div>
                    ))}
                  </div>
                  <div className="notes">
                    {currentRun.optimizationNotes.map((note) => (
                      <p key={note}>{note}</p>
                    ))}
                  </div>
                </div>
              </FlowCard>
            )}

            <div className="flow-footer">
              <button className="secondary-button" onClick={() => setActiveStep('input')}>
                Start over
              </button>
              <button className="secondary-button" onClick={refreshCurrentStep}>
                Refresh this step
              </button>
            </div>
          </section>
        </div>

        <div className="main-grid supporting-grid">

          <section className="panel wide" id="agents">
            <div className="section-title">
              <Library size={18} />
              <h2>Agent Library</h2>
            </div>
            <div className="agent-list">
              {agents.map((agent) => {
                const Icon = agent.icon;
                return (
                  <div className="agent-card" key={agent.name}>
                    <Icon size={20} />
                    <strong>{agent.name}</strong>
                    <span>{agent.detail}</span>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="panel wide" id="history">
            <div className="section-title">
              <History size={18} />
              <h2>Run History</h2>
            </div>
            <div className="history-list">
              {runs.length === 0 && <p>No saved runs yet. Run the pipeline once to create the first campaign.</p>}
              {runs.map((run) => (
                <button
                  key={run.id}
                  onClick={() => {
                    setRuns([run, ...runs.filter((item) => item.id !== run.id)]);
                    setSelectedAngleId(run.selectedAngleId);
                    setActivePlatform(0);
                  }}
                >
                  <span>{new Date(run.createdAt).toLocaleString()}</span>
                  <strong>{run.angles?.find((angle) => angle.id === run.selectedAngleId)?.headline || 'Legacy run'}</strong>
                </button>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

function ResearchColumn({ title, items }: { title: string; items: { label: string; detail: string }[] }) {
  return (
    <div className="research-column">
      <h3>{title}</h3>
      {items.map((item) => (
        <div className="research-item" key={`${title}-${item.label}`}>
          <span>{item.label}</span>
          <strong>{item.detail}</strong>
        </div>
      ))}
    </div>
  );
}

function FlowCard({
  icon,
  kicker,
  title,
  description,
  action,
  children,
}: {
  icon: ReactNode;
  kicker: string;
  title: string;
  description: string;
  action: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flow-card">
      <header className="flow-card-header">
        <div className="flow-title-block">
          <div className="flow-icon">{icon}</div>
          <div>
            <span>{kicker}</span>
            <h2>{title}</h2>
            <p>{description}</p>
          </div>
        </div>
        <div className="flow-action">{action}</div>
      </header>
      <div className="flow-card-body">{children}</div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
