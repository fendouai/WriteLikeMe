const { app, BrowserWindow, ipcMain, shell } = require('electron');
const http = require('node:http');
const path = require('node:path');
const services = require('./services.cjs');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const isSmokeTest = process.env.ELECTRON_SMOKE_TEST === '1';
const isServiceTest = process.env.ELECTRON_SERVICE_TEST === '1';

function registerIpcHandlers() {
  ipcMain.handle('wlm:secrets:status', () => services.getSecretStatus());
  ipcMain.handle('wlm:secrets:save', (_event, payload) => services.saveSecret(payload.kind, payload.provider, payload.value));
  ipcMain.handle('wlm:news:refresh', (_event, payload) => services.refreshNews(payload.input, payload.previous));
  ipcMain.handle('wlm:search:query', (_event, payload) => services.searchWeb(payload.query, payload.provider));
  ipcMain.handle('wlm:llm:generate', (_event, payload) => services.callLlm(payload.prompt, payload.provider));
  ipcMain.handle('wlm:campaign:enhance', (_event, payload) => services.generateCampaignEnhancement(payload));
  ipcMain.handle('wlm:ops:logs', (_event, payload) => services.getLogs(payload?.limit));
  ipcMain.handle('wlm:ops:usage', () => services.getUsage());
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 960,
    minHeight: 680,
    title: 'WriteLikeMe',
    backgroundColor: '#f4f1ec',
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    trafficLightPosition: { x: 18, y: 18 },
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) {
      shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  if (isDev) {
    window.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    window.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  if (isSmokeTest) {
    window.webContents.once('did-finish-load', () => {
      const title = window.webContents.getTitle();
      if (!title.includes('WriteLikeMe')) {
        console.error(`Unexpected window title: ${title}`);
        app.exit(1);
        return;
      }
      app.exit(0);
    });
    window.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
      console.error(`Electron failed to load: ${errorCode} ${errorDescription}`);
      app.exit(1);
    });
  }
}

app.whenReady().then(() => {
  app.setAppUserModelId('ai.fendou.writelikeme');
  registerIpcHandlers();
  if (isServiceTest) {
    runServiceSmokeTest();
    return;
  }
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

async function runServiceSmokeTest() {
  let mockServer;
  try {
    const news = await services.refreshNews(
      {
        title: 'AI agents and developer tools',
        sourceText: 'Production service smoke test for real RSS aggregation.',
        productContext: 'Verify real news, logging, and usage accounting.',
      },
      undefined,
    );
    if (!news.items?.length) throw new Error('No news items returned');
    if (news.items.some((item) => item.url.includes('example.com'))) throw new Error('News service returned fallback example.com URLs');
    mockServer = await startMockProviderServer();
    process.env.WLM_SEARCH_SERPER_URL = `${mockServer.url}/serper`;
    process.env.WLM_LLM_OPENAI_URL = `${mockServer.url}/openai`;
    const secretStatus = services.saveSecret('search', 'serper', 'test-serper-key');
    services.saveSecret('llm', 'openai', 'test-openai-key');
    if (!secretStatus.search.serper) throw new Error('Search secret was not saved');
    const search = await services.searchWeb('production writing workflow', 'serper');
    if (search.provider !== 'serper' || search.results.length !== 1) throw new Error('Mock search adapter did not return expected results');
    const llm = await services.callLlm('Return a production JSON object.', 'openai');
    if (llm.provider !== 'openai' || !llm.text.includes('sectionDrafts')) throw new Error('Mock LLM adapter did not return expected content');
    const enhancement = await services.generateCampaignEnhancement({
      input: {
        title: 'Mock production article',
        audience: 'builders',
        sourceText: 'A realistic source selected from news.',
        productContext: 'Verify LLM/Search enhancement path.',
      },
      style: { tone: ['direct'], rhythm: 'concise', vocabulary: ['workflow'], forbidden: [], signatureMoves: ['state a judgment'], sampleLine: 'Start with the decision.' },
      selectedAngleId: 'tool',
    });
    if (!enhancement.sectionDrafts?.length || enhancement.providerMeta?.llm !== 'openai') throw new Error('Campaign enhancement did not use LLM provider metadata');
    if (!enhancement.research?.userPersona?.length) throw new Error('Campaign enhancement did not return structured research');
    if (!enhancement.writingObjective?.dimensions?.length) throw new Error('Campaign enhancement did not return structured writing objective');
    if (!enhancement.contentStructure?.sections?.length) throw new Error('Campaign enhancement did not return structured content structure');
    const usage = services.getUsage();
    const logs = services.getLogs(20);
    const status = services.getSecretStatus();
    if (!usage.calls) throw new Error('Usage accounting did not record calls');
    if (!usage.estimatedCostUsd) throw new Error('Cost accounting did not record estimated LLM cost');
    if (!logs.length) throw new Error('Operation logs were not recorded');
    console.log(`PASS service news items ${news.items.length}`);
    console.log(`PASS service search provider ${search.provider}`);
    console.log(`PASS service llm provider ${llm.provider}`);
    console.log(`PASS service enhancement research ${enhancement.research.userPersona.length}`);
    console.log(`PASS service enhancement objective ${enhancement.writingObjective.dimensions.length}`);
    console.log(`PASS service enhancement structure ${enhancement.contentStructure.sections.length}`);
    console.log(`PASS service enhancement drafts ${enhancement.sectionDrafts.length}`);
    console.log(`PASS service usage calls ${usage.calls}`);
    console.log(`PASS service estimated cost ${usage.estimatedCostUsd}`);
    console.log(`PASS service logs ${logs.length}`);
    console.log(`PASS secure storage status ${status.encryptionAvailable ? 'encrypted' : 'fallback'}`);
    app.exit(0);
  } catch (error) {
    console.error(`FAIL service smoke: ${error.message}`);
    app.exit(1);
  } finally {
    if (mockServer) await mockServer.close();
  }
}

function startMockProviderServer() {
  const server = http.createServer(async (request, response) => {
    if (request.url?.startsWith('/serper')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ organic: [{ title: 'Mock search result', link: 'https://example.test/result', snippet: 'Evidence from the mock search provider.' }] }));
      return;
    }
    if (request.url?.startsWith('/openai')) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  signal: ['Mock signal 1', 'Mock signal 2', 'Mock signal 3', 'Mock signal 4'],
                  research: {
                    userPersona: [
                      { label: '核心读者', detail: 'Indie hackers testing whether this release changes product or workflow decisions.' },
                      { label: '读者现在知道了什么', detail: '1. 已知：这条消息来自一个具体发布。\\n2. 已知：摘要里已经明确提到了模型 rollout。\\n3. 已知：它来自公开来源。 ' },
                    ],
                    realUserLeads: [{ source: 'X', query: 'mock release workflow pain', why: 'Find real objections and switching triggers.' }],
                    knowledgeBase: [{ label: '可直接引用的事实', detail: '1. 已知：Base44 has started rolling out its own AI model.' }],
                    demandMap: [{ label: '还不知道', detail: '1. 还不知道：是体验升级还是能力跃迁。' }],
                    authorProfile: [{ label: '声音模式', detail: 'direct / structured' }],
                  },
                  writingObjective: {
                    framework: 'Reader Value Objective',
                    summary: 'Help the reader judge whether the release changes their workflow.',
                    currentCognition: 'They know the headline but not the implication.',
                    uniqueValue: 'Translate launch noise into a usable decision.',
                    cognitionGap: 'Move from “what happened” to “what changed”.',
                    dimensions: [
                      { label: '知识与判断', target: 'Decide what changed.', readerGain: 'A sharper point of view.', successMetric: 'Can restate the thesis.' },
                    ],
                  },
                  contentStructure: {
                    selectedTemplateId: 'signal-bet',
                    templates: [
                      {
                        id: 'signal-bet',
                        name: 'Signal, Meaning, Bet, Execution',
                        bestFor: 'news-driven analysis',
                        rationale: 'The source is a release signal and the user needs a strategic interpretation.',
                        sections: [{ title: 'Signal', job: 'State the signal.', readerGain: 'Know what happened.' }],
                      },
                    ],
                    sections: [{ title: 'Signal', job: 'State the signal.', readerGain: 'Know what happened.' }],
                  },
                  angles: [
                    { id: 'tool', label: '工具推荐', headline: 'Mock angle headline', rationale: 'Mock angle rationale', hook: 'Mock hook' },
                  ],
                  sectionDrafts: [
                    {
                      title: 'Mock Section',
                      objective: 'Prove the LLM adapter path works.',
                      readerGain: 'The user gets a verified generation path.',
                      evidencePrompt: 'Use mock evidence.',
                      draft: 'This draft came from the mock OpenAI-compatible adapter.',
                    },
                  ],
                  optimizationNotes: ['Mock optimization note'],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 120, completion_tokens: 80 },
        }),
      );
      return;
    }
    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });
  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolve({
        url: `http://127.0.0.1:${address.port}`,
        close: () => new Promise((closeResolve) => server.close(closeResolve)),
      });
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
