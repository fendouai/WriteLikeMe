import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const port = process.env.E2E_PORT || '5173';
const baseUrl = `http://127.0.0.1:${port}`;
const downloadsDir = join(root, '.tmp-e2e-downloads');
const events = [];

function assert(condition, message, detail) {
  if (!condition) {
    throw new Error(`${message}${detail ? ` :: ${JSON.stringify(detail)}` : ''}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20_000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      await wait(250);
    }
  }
  throw new Error(`Dev server did not become ready at ${url}`);
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev', '--', '--host', '127.0.0.1', '--port', port], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' },
  });

  child.stdout.on('data', (data) => {
    if (process.env.E2E_VERBOSE) process.stdout.write(data);
  });
  child.stderr.on('data', (data) => {
    if (process.env.E2E_VERBOSE) process.stderr.write(data);
  });

  return child;
}

async function run() {
  rmSync(downloadsDir, { recursive: true, force: true });
  mkdirSync(downloadsDir, { recursive: true });

  const server = startDevServer();
  let browser;

  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    const context = await browser.newContext({ acceptDownloads: true });
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseUrl });
    const page = await context.newPage();
    const runtimeIssues = [];

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        runtimeIssues.push(`${message.type()}: ${message.text()}`);
      }
    });
    page.on('pageerror', (error) => runtimeIssues.push(`pageerror: ${error.message}`));

    const readTitle = async () => (await page.locator('.flow-card h2').first().textContent())?.trim();

    await page.goto(baseUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.flow-card');

    const steps = await page.locator('[aria-label="Writing workflow steps"] button').evaluateAll((nodes) =>
      nodes.map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    );
    assert(steps.length === 10, 'Workflow should expose 10 steps', steps);
    assert(steps[0].includes('News') && steps[1].includes('Start'), 'Workflow should begin with News then Start', steps.slice(0, 2));
    assert((await readTitle()) === '先浏览新闻池，再决定写什么', 'E2E must start at News', await readTitle());
    assert((await page.locator('.news-title-button').count()) >= 8, 'News should render selectable material items');
    events.push('News pool loaded');

    await page.getByRole('button', { name: /Incremental refresh/i }).click();
    await page.waitForTimeout(150);
    const refreshText = await page.locator('.news-toolbar span').first().textContent();
    assert(/刷新 2 次/.test(refreshText || ''), 'News refresh should be incremental', refreshText);
    events.push('News refreshed incrementally');

    await page.locator('.news-title-button').nth(1).click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '确认新闻素材，或手动输入 URL / 文本', 'Selecting news should enter Start', await readTitle());
    const inputs = page.locator('.input-flow-grid input');
    const url = await inputs.nth(0).inputValue();
    const title = await inputs.nth(1).inputValue();
    const sourceNotes = await page.locator('textarea.tall').inputValue();
    assert(url.startsWith('https://example.com/'), 'Selected news should populate URL', url);
    assert(title.length > 20, 'Selected news should populate working title', title);
    assert(sourceNotes.includes('Source:') && sourceNotes.includes('Relevance:'), 'Selected news should populate source notes', sourceNotes);
    events.push('News item selected as material');

    await inputs.nth(2).fill('AI builders, indie hackers, and content operators');
    await page.locator('.input-flow-grid textarea').nth(0).fill('E2E product context: turn one selected news item into an engineered article, platform assets, and final dossier.');
    await page.locator('textarea.tall').fill(`${sourceNotes}\n\nE2E addition: the final output must include objective, structure, section drafts, assets, scores, and export.`);
    await page.getByRole('button', { name: /Build insight/i }).click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '提取核心信息和传播信号', 'Start should build Insight', await readTitle());
    assert((await page.locator('.signal-item').count()) === 4, 'Insight should include four signal items');
    events.push('Insight generated');

    await page.getByRole('button', { name: /Confirm insight/i }).click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '确认用户、内容知识库和需求地图', 'Insight should continue to Research', await readTitle());
    assert((await page.locator('.research-column').count()) === 4, 'Research should include four dossier columns');
    assert((await page.locator('.lead-card').count()) === 3, 'Research should include three search leads');
    events.push('Research dossier generated');

    await page.getByRole('button', { name: /Confirm research/i }).click();
    await page.waitForTimeout(150);
    assert((await readTitle()) === '定义文章的读者价值目标', 'Research should continue to Goal', await readTitle());
    assert((await page.locator('.goal-card').count()) === 3, 'Goal should include three reader-value objectives');
    assert((await page.locator('.objective-summary').textContent()).includes('Cognitive gap'), 'Goal should include cognitive gap');
    events.push('Writing goal generated');

    await page.getByRole('button', { name: /Design structure/i }).click();
    await page.waitForTimeout(150);
    assert((await readTitle()) === '选择适合目标的写作结构', 'Goal should continue to Structure', await readTitle());
    assert((await page.locator('.structure-card').count()) === 5, 'Structure should include five classic templates');
    assert((await page.locator('.structure-card.selected').count()) === 1, 'Structure should select one template');
    assert((await page.locator('.section-plan-item').count()) >= 4, 'Structure should produce section plan');
    events.push('Content structure selected');

    await page.getByRole('button', { name: /Send to topic meeting/i }).click();
    await page.waitForTimeout(150);
    assert((await readTitle()) === '选题会：判断选题和结构值不值得写', 'Structure should continue to Meeting', await readTitle());
    assert((await page.locator('.angle-card').count()) === 5, 'Meeting should include five topic angles');
    await page.locator('.angle-card').nth(2).click();
    await page.waitForTimeout(150);
    assert((await page.locator('.angle-card.selected').count()) === 1, 'Meeting should preserve selected angle');
    assert((await page.locator('.topic-score-card').count()) === 10, 'Meeting should include ten score dimensions');
    assert(Number(await page.locator('.meeting-score span').textContent()) > 0, 'Meeting should compute overall score');
    events.push('Topic meeting scored');

    await page.getByRole('button', { name: /Approve topic and structure/i }).click();
    await page.waitForTimeout(150);
    assert((await readTitle()) === '确认 Write Like Me 风格指纹', 'Meeting should continue to Voice', await readTitle());
    await page.locator('textarea.style-box').fill('我喜欢先给判断，再把复杂问题拆成步骤。文章要像真实的人在做决策，而不是模型在填空。');
    assert((await page.locator('.metric').count()) === 4, 'Voice should display four style metrics');
    events.push('Voice applied');

    await page.getByRole('button', { name: /Apply voice/i }).click();
    await page.waitForTimeout(250);
    assert((await readTitle()) === '按结构完成每一个部分的写作', 'Voice should continue to Write', await readTitle());
    assert((await page.locator('.section-draft-card').count()) >= 4, 'Write should generate section drafts');
    assert((await page.locator('.version-card').count()) === 3, 'Write should generate three X thread versions');
    assert((await page.locator('.tabs button').count()) === 5, 'Write should generate five platform assets');
    for (let index = 0; index < 5; index += 1) {
      await page.locator('.tabs button').nth(index).click();
      await page.waitForTimeout(50);
      const assetTitle = await page.locator('.asset-output h3').textContent();
      const assetContent = await page.locator('.asset-output pre').textContent();
      assert((assetTitle || '').length > 8 && (assetContent || '').length > 80, 'Each platform asset should be substantial', {
        index,
        assetTitle,
        contentLength: assetContent?.length,
      });
    }
    events.push('Section drafts and platform assets generated');

    await page.locator('.tabs button').first().click();
    const beforeOptimize = await page.locator('.asset-output h3').textContent();
    await page.getByRole('button', { name: /Optimize/i }).click();
    await page.waitForTimeout(150);
    const afterOptimize = await page.locator('.asset-output h3').textContent();
    assert(afterOptimize.includes('Optimized') && afterOptimize !== beforeOptimize, 'Optimize should update active asset');
    await page.locator('.asset-output .icon-button').click();
    await page.waitForTimeout(150);
    assert((await page.locator('.copy-toast').count()) === 1, 'Copy should show toast');
    events.push('Asset optimized and copied');

    await page.getByRole('button', { name: /Review score/i }).click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '评分、优化建议和导出', 'Write should continue to Review', await readTitle());
    assert((await page.locator('.score-row').count()) === 6, 'Review should include six score rows');
    assert((await page.locator('.notes p').count()) >= 2, 'Review should include optimization notes');
    events.push('Review generated');

    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.getByRole('button', { name: /Export campaign/i }).last().click();
    const download = await downloadPromise;
    const downloadPath = join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const markdown = readFileSync(downloadPath, 'utf8');
    for (const heading of ['## Writing Objective', '## Content Structure', '## Section Drafts', '## X Thread Versions', '## Scores', '## Assets']) {
      assert(markdown.includes(heading), 'Exported markdown should include final dossier section', heading);
    }
    events.push(`Exported ${download.suggestedFilename()}`);

    const runCount = await page.evaluate(() => {
      const raw = localStorage.getItem('wlm.runs');
      return raw ? JSON.parse(raw).length : 0;
    });
    assert(runCount >= 1, 'Final generation should save run history', runCount);
    assert((await page.locator('.history-list button').count()) >= 1, 'Run History should show saved result');
    events.push('Run history persisted');

    await page.getByRole('button', { name: /Start over/i }).click();
    await page.waitForTimeout(100);
    assert((await readTitle()) === '先浏览新闻池，再决定写什么', 'Start over should return to News');
    events.push('Returned to News');

    assert(runtimeIssues.length === 0, 'No console warnings/errors should occur', runtimeIssues);

    for (const event of events) console.log(`PASS ${event}`);
    console.log('PASS News-to-final E2E completed');
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
