const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('writeLikeMeDesktop', {
  platform: process.platform,
  version: process.versions.electron,
});
