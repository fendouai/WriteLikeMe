import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const checks = [];

function check(name, condition) {
  checks.push({ name, ok: Boolean(condition) });
}

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const mainPath = join(root, 'electron', 'main.cjs');
const preloadPath = join(root, 'electron', 'preload.cjs');
const distIndexPath = join(root, 'dist', 'index.html');
const mainSource = readFileSync(mainPath, 'utf8');
const preloadSource = readFileSync(preloadPath, 'utf8');
const distIndex = readFileSync(distIndexPath, 'utf8');

check('package main points to Electron main process', pkg.main === 'electron/main.cjs');
check('Electron main process exists', existsSync(mainPath));
check('Electron preload exists', existsSync(preloadPath));
check('production dist index exists', existsSync(distIndexPath));
check('Electron uses BrowserWindow', mainSource.includes('BrowserWindow'));
check('Electron loads Vite dev server in development', mainSource.includes('VITE_DEV_SERVER_URL'));
check('Electron loads dist/index.html in production', mainSource.includes("loadFile(path.join(__dirname, '..', 'dist', 'index.html'))"));
check('context isolation is enabled', mainSource.includes('contextIsolation: true'));
check('node integration is disabled', mainSource.includes('nodeIntegration: false'));
check('preload exposes desktop bridge', preloadSource.includes('writeLikeMeDesktop'));
check('electron-builder appId configured', pkg.build?.appId === 'ai.fendou.writelikeme');
check('electron-builder includes dist', pkg.build?.files?.includes('dist/**/*'));
check('dist index references built assets', /assets\/index-.*\.js/.test(distIndex));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
}

if (failed.length) {
  process.exitCode = 1;
}
