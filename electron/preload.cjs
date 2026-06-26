const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('writeLikeMeDesktop', {
  platform: process.platform,
  version: process.versions.electron,
  api: {
    getSecretStatus: () => ipcRenderer.invoke('wlm:secrets:status'),
    saveSecret: (payload) => ipcRenderer.invoke('wlm:secrets:save', payload),
    refreshNews: (payload) => ipcRenderer.invoke('wlm:news:refresh', payload),
    search: (payload) => ipcRenderer.invoke('wlm:search:query', payload),
    generateText: (payload) => ipcRenderer.invoke('wlm:llm:generate', payload),
    enhanceCampaign: (payload) => ipcRenderer.invoke('wlm:campaign:enhance', payload),
    getLogs: (payload) => ipcRenderer.invoke('wlm:ops:logs', payload),
    getUsage: () => ipcRenderer.invoke('wlm:ops:usage'),
  },
});
