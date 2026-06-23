const { app, BrowserWindow, shell } = require('electron');
const path = require('node:path');

const isDev = Boolean(process.env.VITE_DEV_SERVER_URL);
const isSmokeTest = process.env.ELECTRON_SMOKE_TEST === '1';

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
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
