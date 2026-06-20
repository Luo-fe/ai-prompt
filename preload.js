const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  saveBgImage: (base64Data) => ipcRenderer.invoke('save-bg-image', base64Data),
  readBgImage: () => ipcRenderer.invoke('read-bg-image'),
  deleteBgImage: () => ipcRenderer.invoke('delete-bg-image'),
  cacheRead: (key) => ipcRenderer.invoke('cache-read', key),
  cacheWrite: (key, data) => ipcRenderer.invoke('cache-write', key, data),
  cacheDelete: (key) => ipcRenderer.invoke('cache-delete', key),
  cacheClear: () => ipcRenderer.invoke('cache-clear'),
  cacheInfo: () => ipcRenderer.invoke('cache-info'),
  saveExportFile: (defaultName, content) => ipcRenderer.invoke('save-export-file', defaultName, content)
});
