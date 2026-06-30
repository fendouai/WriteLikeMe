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
import { useEffect, useMemo, useState } from 'react';
import {
  analyzeStyle,
  buildTopicBatchReport,
  evaluateTopic,
  optimizeAsset,
  optimizeLoop,
  refreshNewsAggregation,
  runCampaign,
  type Angle,
  type CampaignRun,
  type NewsAggregation,
  type OptimizationTrajectory,
  type PlatformAsset,
  type SourceInput,
} from './agentEngine';
import { createBrowserService } from './browserServices';
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
  { name: 'Objective Architect', detail: '定义读者认知基础、文章独特价值和三维写作目标。', icon: Target },
  { name: 'Structure Architect', detail: '从经典结构中选择最适合目标的文章结构。', icon: Layers3 },
  { name: 'Section Writer', detail: '按结构完成每个部分的写作，并提示证据补充点。', icon: MessageSquareText },
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
  curiosityGap: 'Curiosity Gap',
  emotionalCharge: 'Emotional Charge',
  shareability: 'Shareability',
  commentBait: 'Comment Bait',
  screenshotSentence: 'Screenshot Sentence',
};

const workflowSteps = [
  { id: 'news', title: 'News', description: '浏览新闻池并选择素材' },
  { id: 'input', title: 'Topic', description: '确认 URL 或文本' },
  { id: 'insight', title: 'Insight', description: '提取核心信息' },
  { id: 'research', title: 'Research', description: '确认用户和知识库' },
  { id: 'goal', title: 'Goal', description: '定义写作目标' },
  { id: 'structure', title: 'Structure', description: '选择文章结构' },
  { id: 'meeting', title: 'Meeting', description: '选题和结构评分' },
  { id: 'style', title: 'Voice', description: '确认作者风格' },
  { id: 'draft', title: 'Write', description: '逐段写作并适配平台' },
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
  // Created once; reused across renders. Only built when running in a browser
  // (not the Electron renderer), where it supplies RSS/Search/LLM via direct fetch.
  const browserService = useMemo(() => (typeof window !== 'undefined' && !window.writeLikeMeDesktop?.api ? createBrowserService() : undefined), []);
  const [source, setSource] = useState<SourceInput>(() => loadSource());
  const [newsAggregation, setNewsAggregation] = useState<NewsAggregation>(() => loadNewsAggregation() ?? refreshNewsAggregation(loadSource()));
  const [styleSamples, setStyleSamples] = useState(() => loadStyleSamples());
  const [runs, setRuns] = useState<CampaignRun[]>(() => loadRuns());
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>(() => loadRuntimeConfig());
  const [selectedAngleId, setSelectedAngleId] = useState<string | undefined>(runs[0]?.selectedAngleId);
  const [activePlatform, setActivePlatform] = useState(0);
  const [activeStep, setActiveStep] = useState<WorkflowStepId>('news');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [autoRunning, setAutoRunning] = useState(false);
  const [autoRunStep, setAutoRunStep] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [batchGenerating, setBatchGenerating] = useState(false);
  const [optimizationTrajectory, setOptimizationTrajectory] = useState<OptimizationTrajectory | undefined>(undefined);
  const [serviceStatus, setServiceStatus] = useState<{ encryptionAvailable: boolean; llm: Record<string, boolean>; search: Record<string, boolean> }>();
  const [usage, setUsage] = useState<{ calls?: number; inputTokens?: number; outputTokens?: number; estimatedCostUsd?: number; monthlyBudgetUsd?: number }>();
  const [serviceLogs, setServiceLogs] = useState<unknown[]>([]);
  const [serviceNotice, setServiceNotice] = useState('');

  const styleProfile = useMemo(() => analyzeStyle(styleSamples), [styleSamples]);
  const fallbackRun = useMemo(() => runCampaign(source, styleProfile, selectedAngleId), [source, styleProfile, selectedAngleId]);
  const currentRun =
    runs[0]?.research && runs[0]?.versions && runs[0]?.writingObjective && runs[0]?.contentStructure && runs[0]?.sectionDrafts ? runs[0] : fallbackRun;
  const selectedAngle = currentRun.angles.find((angle) => angle.id === currentRun.selectedAngleId) ?? currentRun.angles[0];
  const activeAsset = currentRun.assets[activePlatform] ?? currentRun.assets[0];
  const topicEvaluation = useMemo(() => evaluateTopic(selectedAngle, source, newsAggregation), [selectedAngle, source, newsAggregation]);
  const llmKeyCount = Object.values(runtimeConfig.llmKeys).filter(Boolean).length;
  const searchKeyCount = Object.values(runtimeConfig.searchKeys).filter(Boolean).length;
  const desktopInfo = typeof window !== 'undefined' ? window.writeLikeMeDesktop : undefined;
  // Unified service surface: prefer the Electron main-process bridge; otherwise the
  // browser adapter gives the same RSS/Search/LLM capabilities via direct fetch.
  const serviceApi = desktopInfo?.api ?? (typeof window !== 'undefined' ? browserService : undefined);
  const isDesktopMode = Boolean(desktopInfo?.api);
  const secureLlmKeyCount = serviceStatus ? Object.values(serviceStatus.llm).filter(Boolean).length : llmKeyCount;
  const secureSearchKeyCount = serviceStatus ? Object.values(serviceStatus.search).filter(Boolean).length : searchKeyCount;

  useEffect(() => {
    refreshServiceStatus();
    // Replace the local placeholder news with a real RSS aggregation on startup,
    // so cards show real source URLs instead of example.com placeholder data.
    if (serviceApi) {
      refreshNews();
    }
  }, []);

  async function refreshServiceStatus() {
    if (!serviceApi) return;
    try {
      const [nextStatus, nextUsage, nextLogs] = await Promise.all([
        serviceApi.getSecretStatus(),
        serviceApi.getUsage(),
        serviceApi.getLogs({ limit: 8 }),
      ]);
      setServiceStatus(nextStatus as { encryptionAvailable: boolean; llm: Record<string, boolean>; search: Record<string, boolean> });
      setUsage(nextUsage as typeof usage);
      setServiceLogs(nextLogs);
    } catch (error) {
      setServiceNotice(`Service status unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function updateSource(key: keyof SourceInput, value: string) {
    const next = { ...source, [key]: value };
    setSource(next);
    saveSource(next);
  }

  async function refreshNews() {
    let next: NewsAggregation;
    try {
      next = serviceApi
        ? ((await serviceApi.refreshNews({ input: source, previous: newsAggregation })) as NewsAggregation)
        : refreshNewsAggregation(source, newsAggregation);
      setServiceNotice(serviceApi ? 'Real news aggregation refreshed.' : 'Local rules news refreshed.');
    } catch (error) {
      next = refreshNewsAggregation(source, newsAggregation);
      setServiceNotice(`Real news failed, local fallback used: ${error instanceof Error ? error.message : String(error)}`);
    }
    setNewsAggregation(next);
    saveNewsAggregation(next);
    await refreshServiceStatus();
  }

  function selectNewsItem(item: NewsAggregation['items'][number]) {
    const sourceNotes = [
      `Title: ${item.title}`,
      `Summary: ${item.summary}`,
      `Source: ${item.sourceName} (${item.sourceType})`,
      `Rank: #${item.rank}`,
      `Relevance: ${item.relevance}`,
      item.isNew ? `Status: new` : `Status: seen ${item.seenCount}x`,
      `First seen: ${new Date(item.firstSeenAt).toLocaleString()}`,
      `Last seen: ${new Date(item.lastSeenAt).toLocaleString()}`,
    ].join('\n');
    const nextSource: SourceInput = {
      url: item.url,
      title: item.title,
      sourceText: sourceNotes,
      audience: '',
      productContext: '',
    };
    setSource(nextSource);
    saveSource(nextSource);
    setActiveStep('input');
    window.setTimeout(() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  async function refreshCurrentStep() {
    if (activeStep === 'news') {
      await refreshNews();
      return;
    }
    await generateAndGo(activeStep);
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

  async function updateLlmKey(provider: LlmProviderKey, value: string) {
    const nextKeys = { ...runtimeConfig.llmKeys, [provider]: value };
    setRuntimeConfig({ ...runtimeConfig, llmKeys: nextKeys });
    saveRuntimeConfig({ ...runtimeConfig, llmKeys: nextKeys });
    if (serviceApi) {
      const nextStatus = (await serviceApi.saveSecret({ kind: 'llm', provider, value })) as { encryptionAvailable: boolean; llm: Record<string, boolean>; search: Record<string, boolean> };
      setServiceStatus(nextStatus);
      setServiceNotice(`${provider} LLM key saved ${isDesktopMode ? 'to secure desktop storage' : 'to browser storage'}.`);
      await refreshServiceStatus();
    }
  }

  async function updateSearchKey(provider: SearchProviderKey, value: string) {
    const nextKeys = { ...runtimeConfig.searchKeys, [provider]: value };
    setRuntimeConfig({ ...runtimeConfig, searchKeys: nextKeys });
    saveRuntimeConfig({ ...runtimeConfig, searchKeys: nextKeys });
    if (serviceApi) {
      const nextStatus = (await serviceApi.saveSecret({ kind: 'search', provider, value })) as { encryptionAvailable: boolean; llm: Record<string, boolean>; search: Record<string, boolean> };
      setServiceStatus(nextStatus);
      setServiceNotice(`${provider} Search key saved ${isDesktopMode ? 'to secure desktop storage' : 'to browser storage'}.`);
      await refreshServiceStatus();
    }
  }

  async function generate(angleId = selectedAngleId) {
    // 1. Compute locally and render IMMEDIATELY so the UI never blocks on the network.
    const nextRun = runCampaign(source, styleProfile, angleId);
    const nextRuns = [nextRun, ...runs].slice(0, 8);
    setRuns(nextRuns);
    setSelectedAngleId(nextRun.selectedAngleId);
    setActivePlatform(0);
    saveRuns(nextRuns);
    setServiceNotice('');

    // 2. Kick off LLM/Search enhancement in the background. When it resolves it
    //    silently upgrades the run; if it fails we keep the local result. Either way
    //    the user already has a responsive result in front of them.
    void enhanceInBackground(nextRun, angleId, nextRuns);

    // 3. Refresh service status without awaiting the network-bound enhancement.
    void refreshServiceStatus();
    return nextRun;
  }

  // Background enhancement: takes a locally-computed run, asks the LLM/Search service
  // for a richer version, and patches the top run in place when it arrives. Failures are
  // surfaced as a non-blocking notice; the local run is always retained.
  async function enhanceInBackground(baseRun: CampaignRun, angleId: string | undefined, baseRuns: CampaignRun[]) {
    if (!serviceApi) return;
    try {
      const enhancement = (await serviceApi.enhanceCampaign({ input: source, style: styleProfile, selectedAngleId: angleId })) as {
        signal?: string[];
        sectionDrafts?: CampaignRun['sectionDrafts'];
        optimizationNotes?: string[];
        providerMeta?: { llm?: string; model?: string; usage?: { estimatedCostUsd?: number } };
      };
      const enhancedRun: CampaignRun = {
        ...baseRun,
        signal: enhancement.signal?.length ? enhancement.signal.slice(0, 4) : baseRun.signal,
        sectionDrafts: enhancement.sectionDrafts?.length ? enhancement.sectionDrafts : baseRun.sectionDrafts,
        optimizationNotes: [
          enhancement.providerMeta?.llm
            ? `Generated with ${enhancement.providerMeta.llm}${enhancement.providerMeta.model ? ` / ${enhancement.providerMeta.model}` : ''}. Estimated cost $${(enhancement.providerMeta.usage?.estimatedCostUsd || 0).toFixed(6)}.`
            : 'Generated with local fallback.',
          ...(enhancement.optimizationNotes?.length ? enhancement.optimizationNotes : baseRun.optimizationNotes),
        ],
      };
      // Patch only if this run is still the latest, so we never overwrite a newer manual run.
      setRuns((prevRuns) => {
        if (prevRuns[0]?.id !== baseRun.id) return prevRuns;
        const updated = [enhancedRun, ...prevRuns.slice(1)].slice(0, 8);
        saveRuns(updated);
        return updated;
      });
      setServiceNotice('LLM/Search enhancement completed.');
    } catch (error) {
      setServiceNotice(`LLM/Search enhancement unavailable — showing local result: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Self-optimization loop (Loop Engineer): iteratively rewrite the weakest dimensions,
  // rescore, and repeat until convergence. Replaces the top run in place, records the
  // trajectory on the run itself (so it ships into the export dossier), and surfaces a
  // stop reason + quality gate status in the UI.
  function runOptimizationLoop() {
    if (optimizing || runs.length === 0) return;
    setOptimizing(true);
    setOptimizationTrajectory(undefined);
    const baseRun = runs[0];
    const { run: optimized, trajectory } = optimizeLoop(baseRun, styleProfile);
    const runWithTrajectory = { ...optimized, trajectory };
    const updatedRuns = [runWithTrajectory, ...runs.slice(1)].slice(0, 8);
    setRuns(updatedRuns);
    saveRuns(updatedRuns);
    setOptimizationTrajectory(trajectory);
    const gateNote = trajectory.qualityGate.passed ? '质量门槛已通过' : '质量门槛未通过';
    setServiceNotice(
      `Loop Engineer 完成：${trajectory.iterations} 轮 ${trajectory.stopReason} · ${gateNote} · ${trajectory.rollbackCount} 次回滚。`,
    );
    setOptimizing(false);
  }

  function generateTopicBatch() {
    if (batchGenerating || runs.length === 0) return;
    setBatchGenerating(true);
    const baseRun = runs[0];
    const topicBatch = buildTopicBatchReport(baseRun, styleProfile, newsAggregation, 10);
    const updatedRun = { ...baseRun, topicBatch };
    const updatedRuns = [updatedRun, ...runs.slice(1)].slice(0, 8);
    setRuns(updatedRuns);
    saveRuns(updatedRuns);
    setServiceNotice(`已生成 ${topicBatch.items.length} 个 topic 与 ${topicBatch.items.length} 条推文，并完成流程分析。`);
    setBatchGenerating(false);
  }

  async function generateAndGo(nextStep: WorkflowStepId, angleId = selectedAngleId) {
    await generate(angleId);
    setActiveStep(nextStep);
    window.setTimeout(() => document.getElementById('workflow')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }

  // One-click full pipeline: drive Topic -> ... -> Review automatically, recomputing at
  // every real transition and animating through each step so the progress is visible.
  async function runFullPipeline(startFrom: WorkflowStepId = 'insight') {
    if (autoRunning) return;
    if (!source.title.trim() && !source.sourceText.trim() && !source.url.trim()) {
      setServiceNotice('Pick a news item or fill in a source first, then run the full pipeline.');
      return;
    }
    setAutoRunning(true);
    const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
    // The ordered chain of transitions the manual buttons would perform. Each entry pairs a
    // human-readable label (shown in the progress indicator) with the work to do at that stage.
    const chain: { label: string; step: WorkflowStepId; recompute: boolean }[] = [
      { label: 'Building insight', step: 'insight', recompute: true },
      { label: 'Confirming research', step: 'research', recompute: false },
      { label: 'Defining goal', step: 'goal', recompute: false },
      { label: 'Designing structure', step: 'structure', recompute: false },
      { label: 'Running topic meeting', step: 'meeting', recompute: false },
      { label: 'Applying voice', step: 'style', recompute: false },
      { label: 'Writing sections', step: 'draft', recompute: true },
      { label: 'Reviewing score', step: 'score', recompute: false },
    ];
    const startIndex = chain.findIndex((item) => item.step === startFrom);
    try {
      for (let i = Math.max(0, startIndex); i < chain.length; i += 1) {
        const { label, step, recompute } = chain[i];
        setAutoRunStep(label);
        if (recompute) {
          await generate(selectedAngleId);
        }
        setActiveStep(step);
        window.scrollTo({ top: 0, behavior: 'smooth' });
        // Give each stage a beat so the user sees the work happening step by step.
        await wait(700);
      }
      setServiceNotice('Full pipeline complete — review the scores and export your campaign.');
    } catch (error) {
      setServiceNotice(`Auto-run stopped: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAutoRunning(false);
      setAutoRunStep('');
    }
  }

  async function selectAngle(angle: Angle) {
    setSelectedAngleId(angle.id);
    await generate(angle.id);
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
    const markdown = exportMarkdown(currentRun, styleProfile, newsAggregation, topicEvaluation, currentRun.trajectory);
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
          <strong>{'Signal -> Research -> Goal -> Structure -> Write -> Review'}</strong>
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
              Browse News
            </button>
          </div>
        </header>

        <div className="hero-band flow-hero">
          <div className="signal-map" aria-hidden="true">
            <div className="map-node large">News</div>
            <div className="map-line" />
            <div className="map-node">Topic</div>
            <div className="map-line" />
            <div className="map-node">Write</div>
            <div className="map-line" />
            <div className="map-node accent">Review</div>
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
            <p className="settings-note">配置是全局项，不占用写作流程。桌面版通过 Electron 主进程执行真实联网检索和模型生成，key 存安全存储；浏览器版直接调用各 API，key 存浏览器 localStorage。</p>
            <div className="config-banner">
              <strong>{secureLlmKeyCount || secureSearchKeyCount ? 'Production services configured' : 'Local rules only'}</strong>
              <span>
                {serviceApi
                  ? `${secureLlmKeyCount} 个 LLM key，${secureSearchKeyCount} 个 Search key。${isDesktopMode ? `安全存储：${serviceStatus?.encryptionAvailable ? '可用' : '不可用，使用系统降级存储'}。` : '已保存到浏览器 localStorage。'}`
                  : '未配置服务能力，使用本地规则降级。'}
              </span>
            </div>
            {serviceNotice && <p className="service-notice">{serviceNotice}</p>}
            <div className="ops-grid">
              <Metric label="Service mode" value={isDesktopMode ? 'Electron main process' : serviceApi ? 'Browser direct fetch' : 'Local rules only'} />
              <Metric label="Calls" value={`${usage?.calls || 0}`} />
              <Metric label="Tokens" value={`${usage?.inputTokens || 0} in / ${usage?.outputTokens || 0} out`} />
              <Metric label="Estimated cost" value={`$${(usage?.estimatedCostUsd || 0).toFixed(6)} / $${usage?.monthlyBudgetUsd || 10}`} />
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
                      placeholder={serviceStatus?.llm[provider.key] ? 'Saved securely' : `${provider.name} API key`}
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
                      placeholder={serviceStatus?.search[provider.key] ? 'Saved securely' : `${provider.name} API key`}
                      value={runtimeConfig.searchKeys[provider.key]}
                      onChange={(event) => updateSearchKey(provider.key, event.target.value)}
                    />
                  </label>
                ))}
              </div>
            </div>
            {serviceLogs.length > 0 && (
              <div className="provider-section">
                <div className="provider-heading">
                  <h3>Production logs</h3>
                  <span>最近的调用、重试、失败和降级记录。</span>
                </div>
                <div className="service-log-list">
                  {serviceLogs.map((item, index) => (
                    <pre key={index}>{JSON.stringify(item, null, 2)}</pre>
                  ))}
                </div>
              </div>
            )}
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
            {autoRunning && (
              <div className="auto-run-banner" role="status" aria-live="polite">
                <RefreshCw size={17} className="spin" />
                <strong>Auto-running full pipeline</strong>
                <span>{autoRunStep}…</span>
              </div>
            )}
            {activeStep === 'input' && (
              <FlowCard
                icon={<BookOpen size={19} />}
                kicker="Step 2"
                title="确认新闻素材，或手动输入 URL / 文本"
                description="点击任意一条新闻即可自动填入。也可以自己填 URL、标题、目标读者、产品上下文和 source notes。确认后进入信号提取。"
                action={
                  <div className="flow-action-group">
                    <button className="secondary-button auto-run-button" onClick={() => runFullPipeline()} disabled={autoRunning}>
                      <Sparkles size={18} />
                      {autoRunning ? 'Running…' : 'Auto-run all'}
                    </button>
                    <button className="primary-button" onClick={() => generateAndGo('insight')} disabled={autoRunning}>
                      Build insight
                      <ArrowRight size={18} />
                    </button>
                  </div>
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
                kicker="Step 1"
                title="先浏览新闻池，再决定写什么"
                description="参考 TrendRadar 的思路：多源热榜/RSS、URL+来源去重、记录首次出现、最后出现、刷新次数和新增数量。看到值得写的新闻，点击卡片即可进入 Topic。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('input')}>
                    Use my own source
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
                    <article
                      className={item.isNew ? 'news-card is-new' : 'news-card'}
                      key={item.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Select news: ${item.title}`}
                      onClick={() => selectNewsItem(item)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          selectNewsItem(item);
                        }
                      }}
                    >
                      <div className="news-meta">
                        <span>{item.sourceName}</span>
                        <strong>#{item.rank}</strong>
                      </div>
                      <h3 className="news-title-button">{item.title}</h3>
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
                  <button className="primary-button" onClick={() => setActiveStep('goal')}>
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

            {activeStep === 'goal' && (
              <FlowCard
                icon={<Target size={19} />}
                kicker="Step 5"
                title="定义文章的读者价值目标"
                description="写作目标不是主题，而是读者在原有认知上获得什么。这里使用 Reader Value Objective：知识判断、方法过程、态度决策。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('structure')}>
                    Design structure
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="objective-summary">
                  <div>
                    <span>Current cognition</span>
                    <strong>{currentRun.writingObjective.currentCognition}</strong>
                  </div>
                  <div>
                    <span>Unique value</span>
                    <strong>{currentRun.writingObjective.uniqueValue}</strong>
                  </div>
                  <div className="span-2">
                    <span>Cognitive gap</span>
                    <strong>{currentRun.writingObjective.cognitionGap}</strong>
                  </div>
                </div>
                <div className="goal-grid">
                  {currentRun.writingObjective.dimensions.map((dimension) => (
                    <article className="goal-card" key={dimension.label}>
                      <span>{dimension.label}</span>
                      <h3>{dimension.target}</h3>
                      <p>{dimension.readerGain}</p>
                      <small>{dimension.successMetric}</small>
                    </article>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'structure' && (
              <FlowCard
                icon={<Layers3 size={19} />}
                kicker="Step 6"
                title="选择适合目标的写作结构"
                description="结构服务写作目标。工作台会准备几种经典结构，并选出最适合当前材料的一种，后续逐段写作会按它推进。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('meeting')}>
                    Send to topic meeting
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="structure-grid">
                  {currentRun.contentStructure.templates.map((template) => (
                    <article
                      className={`structure-card ${template.id === currentRun.contentStructure.selectedTemplateId ? 'selected' : ''}`}
                      key={template.id}
                    >
                      <span>{template.bestFor}</span>
                      <h3>{template.name}</h3>
                      <p>{template.rationale}</p>
                    </article>
                  ))}
                </div>
                <div className="section-plan">
                  {currentRun.contentStructure.sections.map((section, index) => (
                    <div className="section-plan-item" key={section.title}>
                      <span>{index + 1}</span>
                      <div>
                        <strong>{section.title}</strong>
                        <p>{section.job}</p>
                        <small>{section.readerGain}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </FlowCard>
            )}

            {activeStep === 'meeting' && (
              <FlowCard
                icon={<Target size={19} />}
                kicker="Step 7"
                title="选题会：判断选题和结构值不值得写"
                description="先选择角度，再用 10 个百分制维度评估选题价值。通过后进入作者风格和正式写作。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('style')}>
                    Approve topic and structure
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="angle-grid flow-block">
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
                kicker="Step 8"
                title="确认 Write Like Me 风格指纹"
                description="补充过往文本会影响后续版本。确认后，workflow 会按结构逐段写作，并生成平台资产。"
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
                kicker="Step 9"
                title="按结构完成每一个部分的写作"
                description="每一段都有 section job、reader gain 和 evidence prompt。下方同时生成三版 X thread 和多平台资产。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('score')}>
                    Review score
                    <ArrowRight size={18} />
                  </button>
                }
              >
                <div className="section-draft-list">
                  {currentRun.sectionDrafts.map((section) => (
                    <article className="section-draft-card" key={section.title}>
                      <div>
                        <span>{section.title}</span>
                        <strong>{section.objective}</strong>
                      </div>
                      <p>{section.readerGain}</p>
                      <pre>{section.draft}</pre>
                      <small>{section.evidencePrompt}</small>
                    </article>
                  ))}
                </div>
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
                description="这里是最终复盘：同时判断质量和传播性。点击 Auto-optimize 让 Loop Engineer 自动迭代重写最弱维度并重评分，直到收敛。"
                action={
                  <div className="flow-action-group">
                    <button className="secondary-button auto-run-button" onClick={generateTopicBatch} disabled={batchGenerating || runs.length === 0}>
                      <Sparkles size={18} />
                      {batchGenerating ? 'Generating…' : 'Generate 10 topics'}
                    </button>
                    <button className="secondary-button auto-run-button" onClick={runOptimizationLoop} disabled={optimizing || runs.length === 0}>
                      <RefreshCw size={18} className={optimizing ? 'spin' : ''} />
                      {optimizing ? 'Optimizing…' : 'Auto-optimize'}
                    </button>
                    <button className="primary-button" onClick={downloadRun}>
                      Export campaign
                      <Download size={18} />
                    </button>
                  </div>
                }
              >
                {optimizationTrajectory && (
                  <div className="loop-trajectory">
                    <strong>
                      Loop Engineer · {optimizationTrajectory.engine.name} {optimizationTrajectory.engine.version} ·{' '}
                      {optimizationTrajectory.iterations} 轮 ·{' '}
                      {optimizationTrajectory.stopReason}
                    </strong>
                    <div className="loop-meta">
                      <span className={`loop-badge ${optimizationTrajectory.qualityGate.passed ? 'ok' : 'fail'}`}>
                        质量门槛 {optimizationTrajectory.qualityGate.passed ? '已通过' : '未通过'}（floor {optimizationTrajectory.qualityGate.minOverall}）
                      </span>
                      {optimizationTrajectory.rollbackCount > 0 && (
                        <span className="loop-badge warn">{optimizationTrajectory.rollbackCount} 次回滚</span>
                      )}
                      <span className="loop-badge neutral">
                        最小迭代 {optimizationTrajectory.options.minIterations} · 提升阈值 {optimizationTrajectory.options.improvementThreshold}
                      </span>
                    </div>
                    <div className="loop-passes">
                      {optimizationTrajectory.passes.map((pass) => (
                        <div className={`loop-pass ${pass.rolledBack ? 'rolled-back' : ''}`} key={pass.iteration}>
                          <span className="loop-pass-label">
                            第 {pass.iteration} 轮 · 总体 {pass.overallBefore} → {pass.overallAfter}
                            {pass.rolledBack && ' · 已回滚'}
                          </span>
                          <span className="loop-pass-targets">目标：{pass.targets.join('、')}</span>
                          <span className="loop-pass-gains">
                            {pass.improvements.length ? `提升：${pass.improvements.join('；')}` : '无显著提升'}
                          </span>
                          {pass.regressions.length > 0 && (
                            <span className="loop-pass-regressions">退化：{pass.regressions.join('；')}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                {currentRun.topicBatch && (
                  <div className="topic-batch-report">
                    <div className="topic-batch-summary">
                      <strong>Topic Batch Report</strong>
                      <p>{currentRun.topicBatch.summary}</p>
                    </div>
                    <div className="topic-batch-grid">
                      <div className="topic-batch-column">
                        <h3>Workflow artifacts</h3>
                        {currentRun.topicBatch.aggregateWorkflowReviews.map((review) => (
                          <div className="batch-score-row" key={`workflow-${review.label}`}>
                            <span>{review.label}</span>
                            <strong>{review.score}</strong>
                            <small>{review.note}</small>
                          </div>
                        ))}
                      </div>
                      <div className="topic-batch-column">
                        <h3>Final outputs</h3>
                        {currentRun.topicBatch.aggregateFinalReviews.map((review) => (
                          <div className="batch-score-row" key={`final-${review.label}`}>
                            <span>{review.label}</span>
                            <strong>{review.score}</strong>
                            <small>{review.note}</small>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="topic-batch-actions">
                      {currentRun.topicBatch.processOptimizations.map((note) => (
                        <p key={note}>{note}</p>
                      ))}
                    </div>
                    <div className="topic-batch-list">
                      {currentRun.topicBatch.items.map((item, index) => (
                        <article className="topic-batch-card" key={item.id}>
                          <div className="topic-batch-head">
                            <span>#{index + 1} · {item.sourceLabel}</span>
                            <strong>{item.topic}</strong>
                          </div>
                          <pre>{item.tweet}</pre>
                          <div className="topic-batch-metrics">
                            <small>Workflow {item.workflowScore}</small>
                            <small>Final {item.finalScore}</small>
                            <small>Loop {item.loopIterations}</small>
                          </div>
                          <div className="topic-batch-notes">
                            {item.optimizationNotes.map((note) => (
                              <p key={note}>{note}</p>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )}
              </FlowCard>
            )}

            <div className="flow-footer">
              <button className="secondary-button" onClick={() => setActiveStep('news')}>
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
