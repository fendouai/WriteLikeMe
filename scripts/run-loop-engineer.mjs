#!/usr/bin/env node
/**
 * Loop Engineer live demo.
 *
 * 1. Build a CampaignRun from a hand-crafted source.
 * 2. Print the initial scorecard + section drafts.
 * 3. Run optimizeLoop with the production defaults.
 * 4. Print the full trajectory: every pass, improvements, regressions,
 *    quality-gate verdict, rollback count, stop reason.
 * 5. Compare start vs end scorecards side by side.
 * 6. Emit the dossier (with Loop Engineer section) to disk.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  analyzeStyle,
  runCampaign,
  optimizeLoop,
  optimizeRun,
  weakestDimensions,
} from '../src/agentEngine.ts';

import { exportMarkdown } from '../src/storage.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(__dirname, '..');

/** Same convention the engine uses: invert aiSmellRisk so higher = better, then mean. */
function overallScoreOf(scores) {
  const keys = Object.keys(scores);
  const values = keys.map((k) => (k === 'aiSmellRisk' ? 100 - scores[k] : scores[k]));
  return Math.round(values.reduce((sum, v) => sum + v, 0) / values.length);
}

// ---------------------------------------------------------------------------
// 1. Build the source material. This is the brief for the article.
// ---------------------------------------------------------------------------

const source = {
  url: 'https://news.example.com/2026/06/agent-loops-self-optimization',
  title: 'AI 写作工具的下一步是 Loop Engineer：让内容自己改自己',
  sourceText: [
    '过去一年，"AI 写作工具" 几乎成了红海。但只要你真的拿一个写长文，就会发现两件事：',
    '第一，AI 给的初稿常常在 hook 上很弱——开头像一份产品说明书，没有判断。',
    '第二，AI 给的"优化建议"是机械的："加个数据点"、"少用 AI 词"——它从来不告诉你改完之后能不能再打分，能不能量化验证。',
    '真正的下一步不是更大的模型，而是一个 Loop Engineer：拿到一篇文章，找到最弱维度，重写，再重打分，直到收敛或被质量门槛拦截。',
    '这套思路和软件工程里的 self-healing system 类似：把"修改建议"换成"修改 + 验证 + 反馈"的闭环。',
    '对一个 SaaS founder 来说，这意味着每天少改两小时稿子；对一个内容团队来说，这意味着 review 会议不再讨论"感觉哪里不对"，而是讨论"哪个维度掉分了"。',
  ].join('\n\n'),
  audience: 'SaaS founders, AI builders, content engineers',
  productContext:
    'WriteLikeMe 把"新闻信号 → 研究 → 目标 → 结构 → 写作 → Review → Loop Engineer 自优化 → 多平台导出"压成一条桌面端写作流水线，最后一轮 Review 用 6 维评分 + Loop Engineer 自动改稿直到收敛或被质量门槛拦截。',
};

const style = analyzeStyle(
  [
    '真正的下一步不是更大的模型，而是把"建议"换成"修改 + 验证 + 反馈"的闭环。',
    '普通人讨论 AI 写作工具停在"它写得快不快"——但工程师关心的是：评分维度是否真的被提升，退化有没有被拦下来。',
    '对 founder 来说，loop engineer 的价值不在花哨，而在把"感觉哪里不对"翻译成"哪个维度掉分了"。',
  ].join('\n'),
);

// ---------------------------------------------------------------------------
// 2. First-pass run.
// ---------------------------------------------------------------------------

console.log('═══ STEP 1 · 初次生成 ═══');
const initialRun = runCampaign(source, style);
const initialOverall = overallScoreOf(initialRun.scores);
console.log(`标题：${source.title}`);
console.log(`初始综合分：${initialOverall}`);
console.log(`初始 scorecard：`);
for (const [key, value] of Object.entries(initialRun.scores)) {
  console.log(`  ${key.padEnd(14)} ${String(value).padStart(3)}`);
}
console.log(`\n最弱 2 维（loop 第一轮要打的目标）：`);
for (const w of weakestDimensions(initialRun.scores).slice(0, 2)) {
  console.log(`  ${w.key.padEnd(14)} value=${w.value}`);
}

// ---------------------------------------------------------------------------
// 3. Run the Loop Engineer.
// ---------------------------------------------------------------------------

console.log('\n═══ STEP 2 · Loop Engineer 自优化 ═══');
const { run: optimizedRun, trajectory } = optimizeLoop(initialRun, style, {
  maxIterations: 6,
  minIterations: 2,
  improvementThreshold: 2,
  maxRegressions: 1,
  minOverallScore: 70,
});

console.log(`引擎：${trajectory.engine.name} ${trajectory.engine.version}`);
console.log(`停止原因：${trajectory.stopReason}`);
console.log(`已收敛：${trajectory.converged}`);
console.log(`总迭代：${trajectory.iterations}`);
console.log(`回滚次数：${trajectory.rollbackCount}`);
console.log(`质量门槛：${trajectory.qualityGate.passed ? '✅ passed' : '❌ failed'} (floor ${trajectory.qualityGate.minOverall})`);
console.log(`配置：${JSON.stringify(trajectory.options)}\n`);

for (const pass of trajectory.passes) {
  console.log(`── Pass ${pass.iteration} ──`);
  console.log(`  质量门：${pass.qualityGate}${pass.rolledBack ? ` [rolled back: ${pass.rollbackReason}]` : ''}`);
  console.log(`  综合分：${pass.overallBefore} → ${pass.overallAfter}`);
  console.log(`  目标：${pass.targets.join('、')}`);
  console.log(`  提升：${pass.improvements.length ? pass.improvements.join('；') : '—'}`);
  console.log(`  退化：${pass.regressions.length ? pass.regressions.join('；') : '—'}`);
}

// ---------------------------------------------------------------------------
// 4. Start vs end diff.
// ---------------------------------------------------------------------------

console.log('\n═══ STEP 3 · 起 / 终对比 ═══');
console.log('维度         初始 → 终态   Δ');
const deltaLines = [];
for (const key of Object.keys(trajectory.scoresEnd)) {
  const start = trajectory.scoresStart[key];
  const end = trajectory.scoresEnd[key];
  const delta = end - start;
  const arrow = delta > 0 ? '↑' : delta < 0 ? '↓' : '·';
  const line = `${key.padEnd(12)} ${String(start).padStart(3)} → ${String(end).padStart(3)}   ${delta > 0 ? '+' : ''}${delta} ${arrow}`;
  console.log(line);
  deltaLines.push(line);
}

const startOverall = overallScoreOf(trajectory.scoresStart);
const endOverall = overallScoreOf(trajectory.scoresEnd);
console.log(`\n综合分（aiSmellRisk 已反转为"越高越好"）：${startOverall} → ${endOverall}（${endOverall - startOverall > 0 ? '+' : ''}${endOverall - startOverall}）`);

// ---------------------------------------------------------------------------
// 5. Sanity-check: did anything actually change in section drafts?
// ---------------------------------------------------------------------------

console.log('\n═══ STEP 4 · 文本实际改动检查 ═══');
let changedSections = 0;
for (let i = 0; i < initialRun.sectionDrafts.length; i += 1) {
  const before = initialRun.sectionDrafts[i];
  const after = optimizedRun.sectionDrafts[i];
  if (before.draft !== after.draft) {
    changedSections += 1;
    console.log(`  § ${before.title} — ${before.draft.length} → ${after.draft.length} chars`);
  }
}
console.log(`共有 ${changedSections}/${initialRun.sectionDrafts.length} 个 section 被 loop engineer 改过`);

// ---------------------------------------------------------------------------
// 6. Export dossier to disk so the user can read it offline.
// ---------------------------------------------------------------------------

console.log('\n═══ STEP 5 · 导出 dossier ═══');
const dossierDir = resolve(workspaceRoot, '.loop-engineer-output');
mkdirSync(dossierDir, { recursive: true });
const dossierPath = resolve(dossierDir, 'dossier.md');
const dossierMd = exportMarkdown(optimizedRun, style, undefined, undefined, trajectory);
writeFileSync(dossierPath, dossierMd, 'utf8');
console.log(`已写入：${dossierPath}（${dossierMd.length} chars / ${dossierMd.split('\n').length} lines）`);

// Also write a compact summary that the agent can paste back to the user.
const summary = [
  `# Loop Engineer Live Run — ${source.title}`,
  '',
  `**引擎**：${trajectory.engine.name} ${trajectory.engine.version}`,
  `**停止原因**：\`${trajectory.stopReason}\``,
  `**总迭代**：${trajectory.iterations}`,
  `**回滚次数**：${trajectory.rollbackCount}`,
  `**质量门槛**：${trajectory.qualityGate.passed ? '✅ passed' : '❌ failed'}（floor ${trajectory.qualityGate.minOverall}）`,
  '',
  `## 起 / 终 scorecard 对比`,
  '',
  '| 维度 | 初始 | 终态 | Δ |',
  '|---|---:|---:|---:|',
  ...Object.keys(trajectory.scoresEnd).map((key) => {
    const s = trajectory.scoresStart[key];
    const e = trajectory.scoresEnd[key];
    const d = e - s;
    const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '·';
    return `| ${key} | ${s} | ${e} | ${d > 0 ? '+' : ''}${d} ${arrow} |`;
  }),
  `| **综合（aiRisk 反转）** | **${startOverall}** | **${endOverall}** | **${endOverall - startOverall > 0 ? '+' : ''}${endOverall - startOverall}** |`,
  '',
  `## Passes`,
  '',
  ...trajectory.passes.flatMap((pass) => [
    `### Pass ${pass.iteration}${pass.rolledBack ? ' · rolled back' : ''}`,
    `- 质量门：${pass.qualityGate}${pass.rolledBack ? ` (${pass.rollbackReason})` : ''}`,
    `- 综合分：${pass.overallBefore} → ${pass.overallAfter}`,
    `- 目标：${pass.targets.join('、')}`,
    `- 提升：${pass.improvements.length ? pass.improvements.join('；') : '—'}`,
    `- 退化：${pass.regressions.length ? pass.regressions.join('；') : '—'}`,
    '',
  ]),
  `## 文本改动`,
  '',
  `共有 ${changedSections}/${initialRun.sectionDrafts.length} 个 section 被 loop engineer 重写。`,
  '',
  `## 完整 dossier`,
  '',
  `见 \`${dossierPath}\`。`,
].join('\n');

const summaryPath = resolve(dossierDir, 'summary.md');
writeFileSync(summaryPath, summary, 'utf8');
console.log(`已写入：${summaryPath}`);

console.log('\n═══ 完成 ═══');