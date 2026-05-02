const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

app.setName('Luo-fe的本地提示词管理器');

let mainWindow;
let splashWindow;
let splashStartTime = 0;

const SPLASH_BG = '#1a1a2e';
const SPLASH_WIDTH = 420;
const SPLASH_HEIGHT = 280;
const MIN_SPLASH_MS = 800;

const SPLASH_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden;background:${SPLASH_BG}}body{display:flex;align-items:center;justify-content:center;font-family:'Microsoft YaHei','Segoe UI',sans-serif;color:#e0e0e0}.w{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)}.ic{width:72px;height:72px;border-radius:18px;margin-bottom:20px;background:linear-gradient(135deg,#4a90d9,#2d6cc0);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(74,144,217,.3)}.ic span{font-size:36px;color:#fff;line-height:1;text-shadow:0 2px 4px rgba(0,0,0,.2)}.n{font-size:20px;font-weight:600;letter-spacing:1px;margin-bottom:6px;color:#c8d8f0}.v{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:28px}.ld{width:120px;height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}.lb{width:0;height:100%;background:linear-gradient(90deg,#4a90d9,#a0c4ff);border-radius:2px;animation:l 1.4s ease-in-out infinite}@keyframes l{0%{width:0;margin-left:0}50%{width:50%;margin-left:25%}100%{width:0;margin-left:100%}}.t{margin-top:12px;font-size:11px;color:rgba(255,255,255,.3)}</style></head><body><div class="w"><div class="ic"><span>L</span></div><div class="n">Luo-fe 本地提示词管理器</div><div class="v">版本 1.2</div><div class="ld"><div class="lb"></div></div><div class="t">正在启动...</div></div></body></html>`;

function getAppDataDir() {
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
  const dataDir = path.join(exeDir, 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  return dataDir;
}

function getCacheDir() {
  const cacheDir = path.join(getAppDataDir(), 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

function computeHash(content) {
  return crypto.createHash('md5').update(content).digest('hex');
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        { label: '关于', click: () => { } },
        { type: 'separator' },
        { role: 'quit', label: '退出' }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function resolveIconPath() {
  const icoPath = path.join(__dirname, 'icon.ico');
  const pngPath = path.join(__dirname, 'icon.png');

  for (const p of [icoPath, pngPath]) {
    if (!fs.existsSync(p)) continue;
    try {
      fs.accessSync(p, fs.constants.R_OK);
      if (p.endsWith('.ico')) {
        const header = Buffer.alloc(6);
        const fd = fs.openSync(p, 'r');
        fs.readSync(fd, header, 0, 6, 0);
        fs.closeSync(fd);
        const type = header.readUInt16LE(2);
        if (type !== 1) {
          console.warn(`icon.ico has invalid type ${type} (expected 1), skipping`);
          continue;
        }
      }
      return p;
    } catch (e) {
      console.warn(`Icon file not accessible: ${p}`, e.message);
    }
  }
  return undefined;
}

function createSplashWindow() {
  splashStartTime = Date.now();

  splashWindow = new BrowserWindow({
    width: SPLASH_WIDTH,
    height: SPLASH_HEIGHT,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    show: true,
    backgroundColor: SPLASH_BG,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      offscreen: false
    }
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);

  splashWindow.on('closed', () => {
    splashWindow = null;
  });
}

function createWindow() {
  const dataDir = getAppDataDir();
  app.setPath('userData', dataDir);

  const iconPath = resolveIconPath();

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Luo-fe的本地提示词管理器 v1.2',
    icon: iconPath,
    frame: false,
    show: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      sandbox: true,
      backgroundThrottling: true
    }
  });

  if (process.platform === 'win32' && iconPath) {
    try {
      mainWindow.setIcon(iconPath);
    } catch (e) {
      console.warn('Failed to set window icon:', e.message);
    }
  }

  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; font-src https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; img-src 'self' data: blob:; connect-src https://api.mymemory.translated.net https://*;"]
      }
    });
  });

  createMenu();

  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashStartTime;
    const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
    }, delay);
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

ipcMain.on('window-minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window-close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('save-bg-image', async (event, base64Data) => {
  try {
    if (!base64Data || typeof base64Data !== 'string') {
      return { success: false, error: 'Invalid input' };
    }
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return { success: false, error: 'Invalid image data' };
    const allowedTypes = ['jpeg', 'jpg', 'png', 'bmp', 'webp', 'gif'];
    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    if (!allowedTypes.includes(ext)) return { success: false, error: 'Unsupported image type' };
    const buffer = Buffer.from(matches[2], 'base64');
    if (buffer.length > 10 * 1024 * 1024) return { success: false, error: 'Image too large (max 10MB)' };
    const bgDir = path.join(getAppDataDir(), 'backgrounds');
    if (!fs.existsSync(bgDir)) fs.mkdirSync(bgDir, { recursive: true });
    const files = fs.readdirSync(bgDir);
    files.forEach(f => fs.unlinkSync(path.join(bgDir, f)));
    const filename = `bg_${Date.now()}.${ext}`;
    const filepath = path.join(bgDir, filename);
    fs.writeFileSync(filepath, buffer);
    return { success: true, path: filepath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-bg-image', async () => {
  try {
    const bgDir = path.join(getAppDataDir(), 'backgrounds');
    if (!fs.existsSync(bgDir)) return { success: false };
    const files = fs.readdirSync(bgDir);
    if (files.length === 0) return { success: false };
    const filepath = path.join(bgDir, files[0]);
    const buffer = fs.readFileSync(filepath);
    const ext = path.extname(filepath).slice(1);
    const mime = ext === 'jpg' ? 'jpeg' : ext;
    const base64 = `data:image/${mime};base64,${buffer.toString('base64')}`;
    return { success: true, data: base64 };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-bg-image', async () => {
  try {
    const bgDir = path.join(getAppDataDir(), 'backgrounds');
    if (fs.existsSync(bgDir)) {
      const files = fs.readdirSync(bgDir);
      files.forEach(f => fs.unlinkSync(path.join(bgDir, f)));
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-read', async (event, key) => {
  try {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${key}.json`);
    if (!fs.existsSync(filePath)) return { success: false };
    const raw = fs.readFileSync(filePath, 'utf-8');
    const cached = JSON.parse(raw);
    if (cached.hash && cached.data) {
      const currentHash = computeHash(JSON.stringify(cached.data));
      if (currentHash !== cached.hash) {
        fs.unlinkSync(filePath);
        return { success: false, error: 'Integrity check failed' };
      }
    }
    return { success: true, data: cached.data, timestamp: cached.timestamp };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-write', async (event, key, data) => {
  try {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${key}.json`);
    const hash = computeHash(JSON.stringify(data));
    const cached = {
      key,
      data,
      hash,
      timestamp: Date.now(),
      version: 1
    };
    fs.writeFileSync(filePath, JSON.stringify(cached), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-delete', async (event, key) => {
  try {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${key}.json`);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-clear', async () => {
  try {
    const cacheDir = getCacheDir();
    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      files.forEach(f => {
        if (f.endsWith('.json')) fs.unlinkSync(path.join(cacheDir, f));
      });
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-info', async () => {
  try {
    const cacheDir = getCacheDir();
    const dataDir = getAppDataDir();
    const result = { cacheFiles: [], totalSize: 0, dataDirSize: 0 };

    if (fs.existsSync(cacheDir)) {
      const files = fs.readdirSync(cacheDir);
      for (const f of files) {
        if (f.endsWith('.json')) {
          const fp = path.join(cacheDir, f);
          const stat = fs.statSync(fp);
          result.cacheFiles.push({ name: f, size: stat.size, mtime: stat.mtimeMs });
          result.totalSize += stat.size;
        }
      }
    }

    if (fs.existsSync(dataDir)) {
      const calcDirSize = (dir) => {
        let size = 0;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const p = path.join(dir, entry.name);
          if (entry.isFile()) {
            size += fs.statSync(p).size;
          } else if (entry.isDirectory()) {
            size += calcDirSize(p);
          }
        }
        return size;
      };
      result.dataDirSize = calcDirSize(dataDir);
    }

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.setAppUserModelId('com.luofe.prompt-manager');

app.commandLine.appendSwitch('disable-software-rasterizer');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.whenReady().then(() => {
  createSplashWindow();
  createWindow();
}).catch((err) => {
  console.error('Failed to create window:', err.message);
  app.quit();
});

app.on('window-all-closed', () => {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close();
  }
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});
