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
  PenLine,
  Search,
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
  optimizeAsset,
  runCampaign,
  type Angle,
  type CampaignRun,
  type PlatformAsset,
  type SourceInput,
} from './agentEngine';
import { exportMarkdown, loadRuns, loadSource, loadStyleSamples, saveRuns, saveSource, saveStyleSamples } from './storage';

const agents = [
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
  { id: 'research', title: 'Research', description: '确认用户和知识库' },
  { id: 'angles', title: 'Angles', description: '选择选题角度' },
  { id: 'style', title: 'Voice', description: '确认作者风格' },
  { id: 'draft', title: 'Draft', description: '查看三版 X thread' },
  { id: 'assets', title: 'Assets', description: '适配多平台内容' },
  { id: 'score', title: 'Review', description: '评分、优化、导出' },
] as const;

type WorkflowStepId = (typeof workflowSteps)[number]['id'];

export function App() {
  const [source, setSource] = useState<SourceInput>(() => loadSource());
  const [styleSamples, setStyleSamples] = useState(() => loadStyleSamples());
  const [runs, setRuns] = useState<CampaignRun[]>(() => loadRuns());
  const [selectedAngleId, setSelectedAngleId] = useState<string | undefined>(runs[0]?.selectedAngleId);
  const [activePlatform, setActivePlatform] = useState(0);
  const [activeStep, setActiveStep] = useState<WorkflowStepId>('input');
  const [copied, setCopied] = useState(false);

  const styleProfile = useMemo(() => analyzeStyle(styleSamples), [styleSamples]);
  const fallbackRun = useMemo(() => runCampaign(source, styleProfile, selectedAngleId), [source, styleProfile, selectedAngleId]);
  const currentRun = runs[0]?.research && runs[0]?.versions ? runs[0] : fallbackRun;
  const selectedAngle = currentRun.angles.find((angle) => angle.id === currentRun.selectedAngleId) ?? currentRun.angles[0];
  const activeAsset = currentRun.assets[activePlatform] ?? currentRun.assets[0];

  function updateSource(key: keyof SourceInput, value: string) {
    const next = { ...source, [key]: value };
    setSource(next);
    saveSource(next);
  }

  function updateStyleSamples(value: string) {
    setStyleSamples(value);
    saveStyleSamples(value);
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
    const markdown = exportMarkdown(currentRun, styleProfile);
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
          </div>
          <div className="topbar-actions">
            <button className="icon-button" onClick={downloadRun} title="Export campaign">
              <Download size={18} />
            </button>
            <button className="primary-button" onClick={() => generateAndGo('research')}>
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
                  <button className="primary-button" onClick={() => generateAndGo('research')}>
                    Build research dossier
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

            {activeStep === 'research' && (
              <FlowCard
                icon={<Search size={19} />}
                kicker="Step 2"
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
                kicker="Step 3"
                title="选择一个选题角度"
                description="每个角度会触发一次重新生成。你可以点卡片切换，然后确认进入作者风格。"
                action={
                  <button className="primary-button" onClick={() => setActiveStep('style')}>
                    Use selected angle
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

            {activeStep === 'style' && (
              <FlowCard
                icon={<PenLine size={19} />}
                kicker="Step 4"
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
                kicker="Step 5"
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
                kicker="Step 6"
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
                kicker="Step 7"
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
              <button className="secondary-button" onClick={() => generateAndGo(activeStep)}>
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
