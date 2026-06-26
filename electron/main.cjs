const { app, BrowserWindow, ipcMain, shell } = require('electron');
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
    const usage = services.getUsage();
    const logs = services.getLogs(20);
    const status = services.getSecretStatus();
    if (!usage.calls) throw new Error('Usage accounting did not record calls');
    if (!logs.length) throw new Error('Operation logs were not recorded');
    console.log(`PASS service news items ${news.items.length}`);
    console.log(`PASS service usage calls ${usage.calls}`);
    console.log(`PASS service logs ${logs.length}`);
    console.log(`PASS secure storage status ${status.encryptionAvailable ? 'encrypted' : 'fallback'}`);
    app.exit(0);
  } catch (error) {
    console.error(`FAIL service smoke: ${error.message}`);
    app.exit(1);
  }
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
