const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  notifyReady: () => ipcRenderer.send('main-window-ready'),
  saveBgImage: (base64Data) => ipcRenderer.invoke('save-bg-image', base64Data),
  readBgImage: () => ipcRenderer.invoke('read-bg-image'),
  deleteBgImage: () => ipcRenderer.invoke('delete-bg-image'),
  cacheRead: (key) => ipcRenderer.invoke('cache-read', key),
  cacheWrite: (key, data) => ipcRenderer.invoke('cache-write', key, data),
  cacheDelete: (key) => ipcRenderer.invoke('cache-delete', key),
  cacheClear: () => ipcRenderer.invoke('cache-clear'),
  cacheInfo: () => ipcRenderer.invoke('cache-info'),
  saveExportFile: (defaultName, content) => ipcRenderer.invoke('save-export-file', defaultName, content),
  savePromptImage: (filename, base64Data) => ipcRenderer.invoke('save-prompt-image', filename, base64Data),
  deletePromptImage: (filename) => ipcRenderer.invoke('delete-prompt-image', filename),
  readPromptImage: (filename) => ipcRenderer.invoke('read-prompt-image', filename),
  renamePromptImage: (oldFilename, newFilename) => ipcRenderer.invoke('rename-prompt-image', oldFilename, newFilename),
  deleteCategoryImages: (categoryId) => ipcRenderer.invoke('delete-category-images', categoryId),
  openPromptImagesFolder: () => ipcRenderer.invoke('open-prompt-images-folder'),
  // 数据目录管理
  getDataDirectory: () => ipcRenderer.invoke('get-data-directory'),
  chooseDataDirectory: () => ipcRenderer.invoke('choose-data-directory'),
  setDataDirectory: (newPath) => ipcRenderer.invoke('set-data-directory', newPath),
  resetDataDirectory: () => ipcRenderer.invoke('reset-data-directory'),
  relaunchApp: () => ipcRenderer.invoke('relaunch-app'),
  setDataDirectoryPrompted: () => ipcRenderer.invoke('set-data-directory-prompted'),
  openDataDirectory: () => ipcRenderer.invoke('open-data-directory')
});
