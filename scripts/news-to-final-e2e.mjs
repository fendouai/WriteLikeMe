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

    // The browser runs without the Electron main process, so the browser service issues
    // real network calls (CORS proxy, search/LLM APIs). Fulfill external requests with a
    // quick empty payload so the service falls back to local rules deterministically and
    // fast, without the retry backoff delay. Scenario B later installs an overriding
    // route that returns real RSS XML and takes precedence over this one.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(baseUrl) || url.includes('localhost') || url.includes('127.0.0.1')) {
        return route.fallback();
      }
      return route.fulfill({ status: 200, contentType: 'application/xml', body: '<rss><channel></channel></rss>' });
    });

    await page.goto(baseUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.flow-card');

    const steps = await page.locator('[aria-label="Writing workflow steps"] button').evaluateAll((nodes) =>
      nodes.map((node) => node.textContent.replace(/\s+/g, ' ').trim()),
    );
    assert(steps.length === 10, 'Workflow should expose 10 steps', steps);
    assert(steps[0].includes('News') && steps[1].includes('Topic'), 'Workflow should begin with News then Topic', steps.slice(0, 2));
    assert((await readTitle()) === '先浏览新闻池，再决定写什么', 'E2E must start at News', await readTitle());
    assert((await page.locator('.news-title-button').count()) >= 8, 'News should render selectable material items');
    events.push('News pool loaded');

    const refreshCount = (text) => Number((text.match(/刷新 (\d+) 次/) || [])[1] || 0);
    const countBefore = refreshCount(await page.locator('.news-toolbar span').first().textContent());
    await page.getByRole('button', { name: /Incremental refresh/i }).click();
    await page.waitForTimeout(400);
    const refreshText = await page.locator('.news-toolbar span').first().textContent();
    const countAfter = refreshCount(refreshText);
    assert(countAfter === countBefore + 1, 'News refresh should be incremental (count increments by 1)', { countBefore, countAfter, refreshText });
    events.push('News refreshed incrementally');

    await page.locator('.news-card').nth(1).click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '确认新闻素材，或手动输入 URL / 文本', 'Selecting news should enter Topic', await readTitle());
    const inputs = page.locator('.input-flow-grid input');
    const url = await inputs.nth(0).inputValue();
    const title = await inputs.nth(1).inputValue();
    const audience = await inputs.nth(2).inputValue();
    const productContext = await page.locator('.input-flow-grid textarea').nth(0).inputValue();
    const sourceNotes = await page.locator('textarea.tall').inputValue();
    assert(url.startsWith('https://example.com/'), 'Selected news should populate URL', url);
    assert(title.length > 20, 'Selected news should populate working title', title);
    assert(audience === '', 'Fields missing from News (audience) should be empty', audience);
    assert(productContext === '', 'Fields missing from News (productContext) should be empty', productContext);
    assert(
      sourceNotes.includes('Source:') && sourceNotes.includes('Relevance:') && sourceNotes.includes('Summary:') && sourceNotes.includes('Rank:'),
      'Selected news should populate all available News fields into source notes',
      sourceNotes,
    );
    events.push('News card body click fills Topic with all News fields');

    await page.locator('[aria-label="Writing workflow steps"] button').first().click();
    await page.waitForTimeout(150);
    await page.locator('.news-card').first().click();
    await page.waitForTimeout(200);
    const secondUrl = await inputs.nth(0).inputValue();
    assert(secondUrl.startsWith('https://example.com/'), 'Clicking a different card should re-fill Topic inputs', secondUrl);
    events.push('Whole news card is clickable');

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
    assert(/Optimized|已优化/.test(afterOptimize) && afterOptimize !== beforeOptimize, 'Optimize should update active asset');
    await page.locator('.asset-output .icon-button').click();
    await page.waitForTimeout(150);
    assert((await page.locator('.copy-toast').count()) === 1, 'Copy should show toast');
    events.push('Asset optimized and copied');

    await page.getByRole('button', { name: /Review score/i }).click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '评分、优化建议和导出', 'Write should continue to Review', await readTitle());
    assert((await page.locator('.score-row').count()) === 11, 'Review should include eleven score rows');
    assert((await page.locator('.notes p').count()) >= 2, 'Review should include optimization notes');
    await page.getByRole('button', { name: /Generate 10 topics/i }).click();
    await page.waitForTimeout(250);
    assert((await page.locator('.topic-batch-card').count()) === 10, 'Review should generate 10 topic batch cards');
    const topicTweets = await page.locator('.topic-batch-card pre').evaluateAll((nodes) => nodes.map((node) => node.textContent || ''));
    assert(topicTweets.every((tweet) => tweet.trim().length >= 80), 'Every batch tweet should contain substantial content', topicTweets.map((tweet) => tweet.length));
    assert((await page.locator('.topic-batch-column').count()) === 2, 'Topic batch analysis should render workflow and final output columns');
    events.push('Review generated');

    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.getByRole('button', { name: /Export campaign/i }).last().click();
    const download = await downloadPromise;
    const downloadPath = join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    const markdown = readFileSync(downloadPath, 'utf8');
    for (const heading of ['## Writing Objective', '## Content Structure', '## Section Drafts', '## X Thread Versions', '## Topic Batch Report', '## Scores', '## Assets']) {
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

    // --- Scenario A2: ONE-CLICK auto-run drives Topic -> Review without manual clicks ---
    await page.locator('.news-card').first().click();
    await page.waitForTimeout(200);
    assert((await readTitle()) === '确认新闻素材，或手动输入 URL / 文本', 'Selecting news should enter Topic for auto-run', await readTitle());
    // The single auto-run button should exist and be enabled.
    const autoRunButton = page.getByRole('button', { name: /Auto-run all/i });
    assert(await autoRunButton.isEnabled(), 'Auto-run button should be enabled on Topic step');
    await autoRunButton.click();
    // The pipeline animates through 8 stages with ~700ms each; wait generously for it to land on Review.
    await page.waitForFunction(() => /评分/.test(document.querySelector('.flow-card h2')?.textContent || ''), null, { timeout: 15_000 });
    assert(/评分/.test((await readTitle()) || ''), 'One-click auto-run should land on the Review step', await readTitle());
    // Banner disappears when auto-run finishes (after the final stage's animation delay).
    await page.waitForTimeout(1500);
    assert((await page.locator('.auto-run-banner').count()) === 0, 'Auto-run banner should disappear when complete');
    // The draft step data was produced (sections + assets) without any further manual clicks.
    await page.locator('[aria-label="Writing workflow steps"] button').nth(8).click(); // Write step
    await page.waitForTimeout(150);
    const autoDrafts = await page.locator('.section-draft-card pre').count();
    assert(autoDrafts >= 4, 'Auto-run should have produced full section drafts', autoDrafts);
    events.push('One-click auto-run reached Review with full output');

    await page.getByRole('button', { name: /Start over/i }).click();
    await page.waitForTimeout(100);
    events.push('Returned to News after auto-run');

    // --- Scenario B: the browser service loads REAL RSS via fetch (mocked), no example.com ---
    const mockedRss = `<?xml version="1.0"?><rss><channel>
      <item><title><![CDATA[WordStar: A Writer's Word Processor]]></title><link>https://www.sfwriter.com/wordstar.htm</link><description>Classic word processor.</description></item>
      <item><title><![CDATA[Show HN: open-source marketing agent]]></title><link>https://github.com/example/agent</link><description>Content workflow agent.</description></item>
    </channel></rss>`;
    await page.route((url) => url.toString().includes('allorigins'), (route) => route.fulfill({ status: 200, contentType: 'application/xml', body: mockedRss }));
    await page.getByRole('button', { name: /Incremental refresh/i }).click();
    await page.waitForTimeout(600);
    const firstCardTitle = await page.locator('.news-card h3').first().textContent();
    assert(
      firstCardTitle.includes('WordStar') || (firstCardTitle || '').includes('marketing agent'),
      'Mocked RSS should surface real titles',
      firstCardTitle,
    );
    events.push('Browser service fetches real RSS (mocked)');

    // Selecting the real-RSS card should fill the Topic URL with a real (non-example.com) link.
    await page.locator('.news-card').first().click();
    await page.waitForTimeout(200);
    const realTopicUrl = await page.locator('.input-flow-grid input').nth(0).inputValue();
    assert(!realTopicUrl.includes('example.com') && realTopicUrl.startsWith('https://'), 'Topic URL should be the real source from RSS', realTopicUrl);
    events.push('Real RSS URL flows into Topic');
    // The mocked-RSS route stays registered; subsequent scenarios do not refresh news
    // and do not touch external RSS, so it is harmless to leave in place.

    // --- Scenario C: every workflow step button responds (no dead buttons) ---
    await page.getByRole('button', { name: /Start over/i }).click();
    await page.waitForTimeout(100);
    const stepButtons = page.locator('[aria-label="Writing workflow steps"] button');
    const stepCount = await stepButtons.count();
    for (let i = 0; i < stepCount; i += 1) {
      const titleBefore = await readTitle();
      await stepButtons.nth(i).click();
      await page.waitForTimeout(80);
      const stepLabel = (await stepButtons.nth(i).textContent()).replace(/\s+/g, ' ').trim();
      assert((await readTitle()) !== titleBefore || i === 0, `Step button "${stepLabel}" should change the active step`, { stepLabel });
    }
    events.push('All workflow step buttons respond');

    // --- Scenario D: Settings panel accepts and persists API keys ---
    await page.locator('a[href="#settings"]').click();
    await page.waitForTimeout(150);
    assert((await page.locator('.settings-panel').count()) === 1, 'Settings panel should open');
    const llmInput = page.locator('.provider-grid input').first();
    await llmInput.fill('sk-e2e-openai-key');
    await page.waitForTimeout(150);
    const savedLlmKey = await page.evaluate(() => {
      const raw = localStorage.getItem('wlm.runtimeConfig');
      return raw ? JSON.parse(raw).llmKeys.openai : '';
    });
    assert(savedLlmKey === 'sk-e2e-openai-key', 'LLM key should persist to browser storage', savedLlmKey);
    const bannerText = await page.locator('.config-banner strong').textContent();
    assert(/Production services configured/.test(bannerText || ''), 'Settings banner should reflect configured state', bannerText);
    events.push('Settings key entry persists to storage');

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
