const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Luo-fe的本地提示词管理器 v1.1',
    icon: path.join(__dirname, 'icon.ico'),
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: true,
      backgroundThrottling: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

function handleMinimize() { if (mainWindow) mainWindow.minimize(); }

function handleMaximize() {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
}

function handleClose() { if (mainWindow) mainWindow.close(); }

app.whenReady().then(createWindow);

app.on('window-all-closed', () => app.quit());

app.on('activate', () => { if (!mainWindow) createWindow(); });

ipcMain.on('window-minimize', handleMinimize);
ipcMain.on('window-maximize', handleMaximize);
ipcMain.on('window-close', handleClose);
