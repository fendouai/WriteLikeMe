/**
 * Business-flow E2E: verify the QUALITY of final output text, not just step transitions.
 *
 * Runs the full News -> ... -> Export pipeline, then deeply inspects the exported
 * markdown dossier: section drafts must be real prose (not placeholders), platform
 * assets must be substantial, and the chosen news title must thread through the output.
 */
import { mkdirSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const root = process.cwd();
const port = process.env.E2E_PORT || '5174';
const baseUrl = `http://127.0.0.1:${port}`;
const downloadsDir = join(root, '.tmp-business-downloads');
const checks = [];

function assert(name, condition, detail) {
  checks.push({ name, ok: Boolean(condition), detail });
  if (!condition) throw new Error(`${name}${detail ? ` :: ${JSON.stringify(detail)}` : ''}`);
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
  if (process.env.E2E_VERBOSE) {
    child.stdout.on('data', (d) => process.stdout.write(d));
    child.stderr.on('data', (d) => process.stderr.write(d));
  }
  return child;
}

async function run() {
  rmSync(downloadsDir, { recursive: true, force: true });
  mkdirSync(downloadsDir, { recursive: true });

  const server = startDevServer();
  let browser;
  let exportedMarkdown = '';
  let chosenNewsTitle = '';

  try {
    await waitForServer(baseUrl);
    browser = await chromium.launch();
    const context = await browser.newContext({ acceptDownloads: true });
    const page = await context.newPage();

    // External calls fall back to local rules fast.
    await page.route('**/*', (route) => {
      const url = route.request().url();
      if (url.startsWith(baseUrl) || url.includes('localhost') || url.includes('127.0.0.1')) return route.fallback();
      return route.fulfill({ status: 200, contentType: 'application/xml', body: '<rss><channel></channel></rss>' });
    });

    await page.goto(baseUrl);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('.flow-card');

    // 1. Pick a specific news item and capture its title.
    const secondCard = page.locator('.news-card').nth(1);
    chosenNewsTitle = (await secondCard.locator('h3').textContent()) || '';
    assert('News item captured with a real title', chosenNewsTitle.length > 15, chosenNewsTitle);
    await secondCard.click();
    await page.waitForTimeout(200);

    // 2. Confirm the news title propagated into Topic inputs.
    const topicTitle = await page.locator('.input-flow-grid input').nth(1).inputValue();
    assert('Selected news title flows into Topic working title', topicTitle === chosenNewsTitle, { chosenNewsTitle, topicTitle });

    // 3. Fill context and drive the pipeline to the final export.
    await page.locator('.input-flow-grid input').nth(2).fill('AI builders and indie hackers');
    await page.locator('.input-flow-grid textarea').nth(0).fill('Business-flow E2E: one news signal becomes a full multi-platform dossier.');
    await page.locator('textarea.tall').fill('Business-flow evidence: the final dossier must contain real section drafts, assets, and scores.');

    for (const [label, regex] of [
      ['Build insight', /Build insight/i],
      ['Confirm insight', /Confirm insight/i],
      ['Confirm research', /Confirm research/i],
      ['Design structure', /Design structure/i],
      ['Send to topic meeting', /Send to topic meeting/i],
      ['Approve topic and structure', /Approve topic and structure/i],
      ['Apply voice', /Apply voice/i],
      ['Review score', /Review score/i],
    ]) {
      await page.getByRole('button', { name: regex }).click();
      await page.waitForTimeout(220);
    }

    // 4. Inspect on-page Write output quality before export.
    await page.locator('[aria-label="Writing workflow steps"] button').nth(8).click(); // Write step
    await page.waitForTimeout(150);
    const sectionDrafts = await page.locator('.section-draft-card pre').evaluateAll((nodes) => nodes.map((n) => n.textContent || ''));
    assert('At least 4 section drafts produced', sectionDrafts.length >= 4, sectionDrafts.length);
    assert('Every section draft has substantial prose (>=120 chars)', sectionDrafts.every((d) => d.trim().length >= 120), sectionDrafts.map((d) => d.length));
    assert('Section drafts are not placeholder text', sectionDrafts.every((d) => !/^(todo|placeholder|lorem|tbd)/i.test(d.trim())), sectionDrafts.slice(0, 1));

    const assetContents = [];
    for (let i = 0; i < 5; i += 1) {
      await page.locator('.tabs button').nth(i).click();
      await page.waitForTimeout(50);
      assetContents.push({
        platform: (await page.locator('.tabs button').nth(i).textContent())?.trim(),
        title: (await page.locator('.asset-output h3').textContent())?.trim(),
        content: (await page.locator('.asset-output pre').textContent())?.trim(),
      });
    }
    assert('Five platform assets produced', assetContents.length === 5, assetContents.length);
    assert('Every asset has a title and substantial content', assetContents.every((a) => a.title.length > 8 && a.content.length >= 80), assetContents.map((a) => ({ p: a.platform, t: a.title.length, c: a.content.length })));

    // 5. Export and read the final dossier.
    const downloadPromise = page.waitForEvent('download', { timeout: 5000 });
    await page.getByRole('button', { name: /Export campaign/i }).last().click();
    const download = await downloadPromise;
    const downloadPath = join(downloadsDir, download.suggestedFilename());
    await download.saveAs(downloadPath);
    exportedMarkdown = readFileSync(downloadPath, 'utf8');
    assert('Exported markdown is non-trivial (>=1500 chars)', exportedMarkdown.length >= 1500, exportedMarkdown.length);

    // No CN-EN splicing in the dossier: a Chinese sentence ending in punctuation immediately
    // followed by an English scaffold clause. (Pure-English news headlines are fine.)
    assert(
      'No Chinese-English mid-sentence splicing in dossier',
      !/[，。]\s*(The |They |This |is mainly|It |My take: )/.test(exportedMarkdown),
      'found EN scaffolding spliced into CN prose',
    );
    assert('No doubled sentence-ending punctuation', !/。。/.test(exportedMarkdown), 'found doubled 。');

    // 6. Deep quality checks on the final text.
    const sectionMatches = exportedMarkdown.match(/###\s+[^\n]+\n[\s\S]*?(?=###|\n##|$)/g) || [];
    const draftBodies = sectionMatches.map((block) => block.replace(/^###.*$/m, '').trim()).filter((b) => b.length > 100);
    assert('Exported dossier includes multiple substantial section drafts', draftBodies.length >= 4, draftBodies.length);

    const requiredSections = [
      '## Style Fingerprint',
      '## Research Dossier',
      '## Signals',
      '## Writing Objective',
      '## Content Structure',
      '## Section Drafts',
      '## X Thread Versions',
      '## Scores',
      '## Assets',
    ];
    for (const section of requiredSections) {
      assert(`Exported dossier contains "${section}"`, exportedMarkdown.includes(section), section);
    }

    // Thread versions must each contain a multi-line thread body, not just a heading.
    // Split on a top-level "## " heading (line start, two hashes, space) so "###" sub-headings
    // inside the section are not mistaken for the next section.
    const sections = exportedMarkdown.split(/\n## /);
    const threadSection = sections.find((s) => s.startsWith('X Thread Versions')) || '';
    const versionHeadings = threadSection.match(/^###\s/gm) || [];
    assert('X Thread section has at least 3 versions', versionHeadings.length >= 3, versionHeadings.length);
    const threadProse = threadSection.replace(/^#{1,6}\s.*$/gm, '').replace(/Scores:.*$/gm, '').trim();
    assert('X Thread bodies are non-empty prose', threadProse.length >= 200, threadProse.length);

    // Scores must be numeric 1-100.
    const scoreBlock = sections.find((s) => s.startsWith('Scores')) || '';
    const scoreNumbers = (scoreBlock.match(/:\s*(\d+)/g) || []).map((m) => Number(m.replace(/:\s*/, '')));
    assert('Scores section lists 11 numeric scores', scoreNumbers.length === 11, scoreNumbers);
    assert('All scores are within 1-100', scoreNumbers.every((n) => n >= 1 && n <= 100), scoreNumbers);

    // Assets section lists every platform with content.
    const assetSection = sections.find((s) => s.startsWith('Assets')) || '';
    for (const platform of ['X Thread', 'LinkedIn', 'Newsletter', 'Xiaohongshu', 'Blog Outline']) {
      assert(`Assets section includes platform "${platform}"`, assetSection.includes(`### ${platform}`), platform);
    }
    assert('Assets section has real CTA lines', (assetSection.match(/CTA:/g) || []).length >= 5, (assetSection.match(/CTA:/g) || []).length);
  } finally {
    if (browser) await browser.close();
    server.kill('SIGTERM');
  }

  // Report.
  const failed = checks.filter((c) => !c.ok);
  for (const c of checks) console.log(`${c.ok ? 'PASS' : 'FAIL'} ${c.name}`);
  console.log(`\nChosen news: "${chosenNewsTitle}"`);
  console.log(`Exported dossier: ${exportedMarkdown.length} chars, ${exportedMarkdown.split('\n').length} lines`);
  if (failed.length) {
    process.exitCode = 1;
    console.log(`\n${failed.length} check(s) failed.`);
  } else {
    console.log('\nPASS Business-flow E2E completed — final output text verified.');
  }
}

run().catch((error) => {
  console.error(`FAIL ${error.message}`);
  process.exitCode = 1;
});
