const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

app.setName('Luo-fe的本地提示词管理器');

// 捕获原始 userData 路径（在任何 setPath 调用之前）
// bootstrap 配置文件始终存储在此处，作为指向实际数据目录的指针
const ORIGINAL_USER_DATA = app.getPath('userData');

let mainWindow;
let splashWindow;
let splashStartTime = 0;

const SPLASH_BG = '#1a1a2e';
const SPLASH_WIDTH = 420;
const SPLASH_HEIGHT = 280;
const MIN_SPLASH_MS = 250;

const SPLASH_HTML = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{margin:0;padding:0;box-sizing:border-box}html,body{width:100%;height:100%;overflow:hidden;background:${SPLASH_BG}}body{display:flex;align-items:center;justify-content:center;font-family:'Microsoft YaHei','Segoe UI',sans-serif;color:#e0e0e0}.w{display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)}.ic{width:72px;height:72px;border-radius:18px;margin-bottom:20px;background:linear-gradient(135deg,#4a90d9,#2d6cc0);display:flex;align-items:center;justify-content:center;box-shadow:0 6px 20px rgba(74,144,217,.3)}.ic span{font-size:36px;color:#fff;line-height:1;text-shadow:0 2px 4px rgba(0,0,0,.2)}.n{font-size:20px;font-weight:600;letter-spacing:1px;margin-bottom:6px;color:#c8d8f0}.v{font-size:12px;color:rgba(255,255,255,.4);margin-bottom:28px}.ld{width:120px;height:3px;background:rgba(255,255,255,.08);border-radius:2px;overflow:hidden}.lb{width:0;height:100%;background:linear-gradient(90deg,#4a90d9,#a0c4ff);border-radius:2px;animation:l 1.4s ease-in-out infinite}@keyframes l{0%{width:0;margin-left:0}50%{width:50%;margin-left:25%}100%{width:0;margin-left:100%}}.t{margin-top:12px;font-size:11px;color:rgba(255,255,255,.3)}</style></head><body><div class="w"><div class="ic"><span>L</span></div><div class="n">Luo-fe 本地提示词管理器</div><div class="v">版本 1.4</div><div class="ld"><div class="lb"></div></div><div class="t">正在启动...</div></div></body></html>`;

// ============ Bootstrap 配置机制 ============
// data-config.json 存储在原始 userData 目录中，仅包含指向实际数据目录的路径
// 这样实际数据（分类、提示词、图像、设置等）可以存储在用户自定义的非系统盘位置

function getBootstrapConfigPath() {
  return path.join(ORIGINAL_USER_DATA, 'data-config.json');
}

function readBootstrapConfig() {
  try {
    const configPath = getBootstrapConfigPath();
    if (!fs.existsSync(configPath)) return null;
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return config;
  } catch (e) {
    console.warn('Failed to read bootstrap config:', e.message);
    return null;
  }
}

function writeBootstrapConfig(config) {
  try {
    const configPath = getBootstrapConfigPath();
    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return true;
  } catch (e) {
    console.error('Failed to write bootstrap config:', e.message);
    return false;
  }
}

function getCustomDataPath() {
  const config = readBootstrapConfig();
  if (config && config.dataPath && typeof config.dataPath === 'string') {
    if (fs.existsSync(config.dataPath)) return config.dataPath;
    // 路径不存在，尝试创建
    try {
      fs.mkdirSync(config.dataPath, { recursive: true });
      return config.dataPath;
    } catch (e) {
      console.warn('Custom data path inaccessible:', config.dataPath, e.message);
      return null;
    }
  }
  return null;
}

function isPortableMode() {
  return !!process.env.PORTABLE_EXECUTABLE_DIR;
}

function getAppDataDir() {
  // 优先使用用户自定义数据目录
  const customPath = getCustomDataPath();
  if (customPath) {
    if (!fs.existsSync(customPath)) fs.mkdirSync(customPath, { recursive: true });
    return customPath;
  }

  // 便携版和安装版：数据默认存储在 exe 同级目录的 data 文件夹
  // 用户可在设置中更改到其他位置
  const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));
  const dataDir = path.join(exeDir, 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  return dataDir;
}

// 检查 target 是否在 source 内部（即 source 是 target 的祖先目录）
// 用于防止数据迁移时将目录复制到自身内部，导致无限递归嵌套
function isPathInside(target, source) {
  const relative = path.relative(source, target);
  return !!relative && !relative.startsWith('..') && !path.isAbsolute(relative);
}

// 递归复制目录（异步）
async function copyDirRecursiveAsync(src, dest) {
  // 安全检查：防止 dest 在 src 内部，否则会产生无限递归嵌套
  if (isPathInside(dest, src)) {
    console.warn(`copyDirRecursiveAsync: dest (${dest}) is inside src (${src}), skipping to prevent infinite recursion`);
    return;
  }
  try {
    await fs.promises.access(src);
  } catch (e) {
    return; // 源目录不存在
  }
  await fs.promises.mkdir(dest, { recursive: true });
  const entries = await fs.promises.readdir(src, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursiveAsync(srcPath, destPath);
    } else if (entry.isFile()) {
      // 只复制目标不存在的文件
      try {
        await fs.promises.access(destPath);
      } catch (e) {
        try { await fs.promises.copyFile(srcPath, destPath); } catch (err) {}
      }
    }
  }));
}

// 移动数据到新目录（异步，用于更改数据存储位置）
// 复制后删除原文件，实现"移动"而非"复制"
async function migrateDataToNewDirAsync(oldDir, newDir) {
  if (path.resolve(oldDir) === path.resolve(newDir)) return { success: true, migrated: 0, failedToDelete: 0 };
  try {
    await fs.promises.access(oldDir);
  } catch (e) {
    return { success: true, migrated: 0, failedToDelete: 0 };
  }
  await fs.promises.mkdir(newDir, { recursive: true });

  // 检查 newDir 是否在 oldDir 内部
  // 如果是，遍历 oldDir 时必须跳过 newDir 本身，否则会产生无限递归嵌套
  const isNewDirInsideOldDir = isPathInside(newDir, oldDir);

  let migrated = 0;
  let failedToDelete = 0;
  const entries = await fs.promises.readdir(oldDir, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(oldDir, entry.name);

    // 如果 newDir 在 oldDir 内部，跳过 newDir 本身（避免递归嵌套）
    if (isNewDirInsideOldDir && path.resolve(srcPath) === path.resolve(newDir)) {
      continue;
    }

    const destPath = path.join(newDir, entry.name);
    if (entry.isDirectory()) {
      await copyDirRecursiveAsync(srcPath, destPath);
      try { await fs.promises.rm(srcPath, { recursive: true, force: true }); }
      catch (e) { failedToDelete++; }
      migrated++;
    } else if (entry.isFile()) {
      try {
        await fs.promises.access(destPath);
      } catch (e) {
        try { await fs.promises.copyFile(srcPath, destPath); } catch (err) {}
      }
      try { await fs.promises.unlink(srcPath); }
      catch (e) { failedToDelete++; }
      migrated++;
    }
  }
  // 尝试删除空的原目录（但如果 newDir 在 oldDir 内部，不能删除 oldDir）
  if (failedToDelete === 0 && !isNewDirInsideOldDir) {
    try { await fs.promises.rmdir(oldDir); } catch (e) {}
  }
  return { success: true, migrated, failedToDelete };
}

// 一次性迁移：将旧位置的数据迁移到当前数据目录（异步）
// 旧位置可能包括：
//   1. exe目录/data（旧便携版或曾使用安装目录存储的版本）
//   2. ORIGINAL_USER_DATA（上一版安装版使用 userData 目录存储）
async function migrateUserDataIfNeededAsync() {
  try {
    const newDataDir = getAppDataDir();

    // 迁移完成标记，避免每次启动都遍历
    const migratedFlag = path.join(newDataDir, '.migrated');
    try {
      await fs.promises.access(migratedFlag);
      return; // 已迁移
    } catch (e) { /* 未迁移，继续 */ }

    const exeDir = process.env.PORTABLE_EXECUTABLE_DIR || path.dirname(app.getPath('exe'));

    // 只迁移用户数据，跳过 Electron 内部缓存和临时文件
    const userDataDirs = ['backgrounds', 'prompt-images', 'cache', 'Local Storage'];
    const userDataFiles = ['window-state.json'];

    const possibleOldDirs = [
      path.join(exeDir, 'data'),
      ORIGINAL_USER_DATA
    ];

    // 读取安装程序写入的旧安装目录标记文件，用于跨目录升级时迁移数据
    const oldInstallDirFile = path.join(ORIGINAL_USER_DATA, 'old-install-dir.txt');
    try {
      // NSIS Unicode 以 UTF-16LE 编码写入文件
      const oldInstallDir = (await fs.promises.readFile(oldInstallDirFile, 'utf-16le')).trim();
      if (oldInstallDir) {
        const oldDataDir = path.join(oldInstallDir, 'data');
        if (!possibleOldDirs.some(d => path.resolve(d) === path.resolve(oldDataDir))) {
          possibleOldDirs.push(oldDataDir);
        }
      }
      // 读取后删除标记文件，避免重复迁移
      try { await fs.promises.unlink(oldInstallDirFile); } catch (e) {}
    } catch (e) {
      // 标记文件不存在，忽略
    }

    for (const oldDir of possibleOldDirs) {
      if (path.resolve(oldDir) === path.resolve(newDataDir)) continue;
      try {
        await fs.promises.access(oldDir);
      } catch (e) {
        continue;
      }
      // 安全检查：如果 newDataDir 在 oldDir 内部，跳过该 oldDir
      // 防止将数据从祖先目录复制到子目录中导致嵌套
      if (isPathInside(newDataDir, oldDir)) {
        continue;
      }

      // 迁移用户数据子目录
      for (const sub of userDataDirs) {
        const oldSub = path.join(oldDir, sub);
        try {
          await fs.promises.access(oldSub);
        } catch (e) {
          continue;
        }
        const newSub = path.join(newDataDir, sub);
        await fs.promises.mkdir(newSub, { recursive: true });
        const files = await fs.promises.readdir(oldSub);
        await Promise.all(files.map(async (f) => {
          const oldPath = path.join(oldSub, f);
          const newPath = path.join(newSub, f);
          try {
            await fs.promises.access(newPath);
            return; // 目标已存在，跳过
          } catch (e) { /* 目标不存在，继续复制 */ }
          try {
            const stat = await fs.promises.stat(oldPath);
            if (stat.isDirectory()) {
              await copyDirRecursiveAsync(oldPath, newPath);
            } else {
              await fs.promises.copyFile(oldPath, newPath);
            }
          } catch (err) {}
        }));
      }

      // 迁移用户数据文件
      for (const file of userDataFiles) {
        const oldFile = path.join(oldDir, file);
        const newFile = path.join(newDataDir, file);
        try {
          await fs.promises.access(oldFile);
          try {
            await fs.promises.access(newFile);
          } catch (e) {
            try { await fs.promises.copyFile(oldFile, newFile); } catch (err) {}
          }
        } catch (e) { /* 旧文件不存在，跳过 */ }
      }
    }

    // 写入迁移完成标记
    await fs.promises.writeFile(migratedFlag, new Date().toISOString(), 'utf-8');
  } catch (e) {
    console.warn('Data migration failed:', e);
  }
}

function getCacheDir() {
  const cacheDir = path.join(getAppDataDir(), 'cache');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }
  return cacheDir;
}

function createMenu() {
  // 无边框窗口不显示菜单栏，跳过菜单创建以加速启动
  Menu.setApplicationMenu(null);
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
      sandbox: false
    }
  });

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(SPLASH_HTML)}`);

  splashWindow.on('closed', () => {
    splashWindow = null;
    // 如果主窗口未显示（如安装程序关闭了启动画面），退出整个应用
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      mainWindow.destroy();
      mainWindow = null;
      app.quit();
    }
  });
}

function createWindow() {
  const dataDir = getAppDataDir();
  app.setPath('userData', dataDir);

  const iconPath = resolveIconPath();

  const windowStatePath = path.join(dataDir, 'window-state.json');
  let windowState = { width: 1200, height: 800, x: undefined, y: undefined, isMaximized: false };
  try {
    if (fs.existsSync(windowStatePath)) {
      const saved = JSON.parse(fs.readFileSync(windowStatePath, 'utf-8'));
      if (saved && typeof saved.width === 'number' && typeof saved.height === 'number') {
        windowState = saved;
      }
    }
  } catch (e) {
    console.warn('Failed to load window state:', e.message);
  }

  const createOptions = {
    width: windowState.width,
    height: windowState.height,
    minWidth: 900,
    minHeight: 600,
    title: 'Luo-fe的本地提示词管理器 v1.4',
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
  };

  if (typeof windowState.x === 'number' && typeof windowState.y === 'number') {
    createOptions.x = windowState.x;
    createOptions.y = windowState.y;
  }

  mainWindow = new BrowserWindow(createOptions);

  if (windowState.isMaximized) {
    mainWindow.maximize();
  }

  if (process.platform === 'win32' && iconPath) {
    try {
      mainWindow.setIcon(iconPath);
    } catch (e) {
      console.warn('Failed to set window icon:', e.message);
    }
  }

  // 仅对主页面应用 CSP，避免对所有资源请求触发回调
  mainWindow.webContents.session.webRequest.onHeadersReceived({ urls: ['file://*'] }, (details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': ["default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data: blob:; connect-src https://api.mymemory.translated.net;"]
      }
    });
  });

  createMenu();

  // 主窗口不在 ready-to-show 时自动显示，而是等待渲染进程完成所有加载（含背景图）后通知
  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  // 超时保底：如果 5 秒后渲染进程仍未通知 ready，强制显示主窗口
  setTimeout(() => {
    if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isVisible()) {
      console.warn('Main window ready timeout, forcing show');
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
      }
      mainWindow.show();
      mainWindow.focus();
    }
  }, 5000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.on('close', () => {
    try {
      const dataDir = getAppDataDir();
      const windowStatePath = path.join(dataDir, 'window-state.json');
      const bounds = mainWindow.getBounds();
      const isMaximized = mainWindow.isMaximized();
      const state = { ...bounds, isMaximized };
      fs.writeFileSync(windowStatePath, JSON.stringify(state), 'utf-8');
    } catch (e) {
      console.warn('Failed to save window state:', e.message);
    }
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

// 渲染进程完成所有加载（含背景图）后通知主进程显示主窗口
ipcMain.on('main-window-ready', () => {
  if (!mainWindow) return;
  const elapsed = Date.now() - splashStartTime;
  const delay = Math.max(0, MIN_SPLASH_MS - elapsed);
  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      // 聚焦主窗口
      mainWindow.focus();
    }
  }, delay);
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
    await fs.promises.mkdir(bgDir, { recursive: true });
    const files = await fs.promises.readdir(bgDir);
    await Promise.all(files.map(f => fs.promises.unlink(path.join(bgDir, f))));
    const filename = `bg_${Date.now()}.${ext}`;
    const filepath = path.join(bgDir, filename);
    await fs.promises.writeFile(filepath, buffer);
    return { success: true, path: filepath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-bg-image', async () => {
  try {
    const bgDir = path.join(getAppDataDir(), 'backgrounds');
    const files = await fs.promises.readdir(bgDir);
    if (files.length === 0) return { success: false };
    const filepath = path.join(bgDir, files[0]);
    const buffer = await fs.promises.readFile(filepath);
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
    const files = await fs.promises.readdir(bgDir);
    await Promise.all(files.map(f => fs.promises.unlink(path.join(bgDir, f))));
    return { success: true };
  } catch (err) {
    if (err.code === 'ENOENT') return { success: true };
    return { success: false, error: err.message };
  }
});

function getPromptImagesDir() {
  const dir = path.join(getAppDataDir(), 'prompt-images');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

// 文件名净化：允许中文等 Unicode 字符，仅替换 Windows 文件名非法字符
function sanitizeImageFilename(name) {
  return path.basename(name).replace(/[\\/:*?"<>|]/g, '_').trim();
}

ipcMain.handle('save-prompt-image', async (event, filename, base64Data) => {
  try {
    if (!filename || typeof filename !== 'string') {
      return { success: false, error: 'Invalid filename' };
    }
    if (!base64Data || typeof base64Data !== 'string') {
      return { success: false, error: 'Invalid image data' };
    }
    const matches = base64Data.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) return { success: false, error: 'Invalid image data format' };
    const buffer = Buffer.from(matches[2], 'base64');
    const safeName = sanitizeImageFilename(filename);
    const filepath = path.join(getPromptImagesDir(), safeName);
    await fs.promises.writeFile(filepath, buffer);
    return { success: true, filename: safeName };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-prompt-image', async (event, filename) => {
  try {
    if (!filename) return { success: true };
    const safeName = path.basename(filename);
    const filepath = path.join(getPromptImagesDir(), safeName);
    try { await fs.promises.unlink(filepath); } catch (e) { /* 文件不存在视为成功 */ }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('read-prompt-image', async (event, filename) => {
  try {
    if (!filename) return { success: false, error: 'No filename' };
    const safeName = path.basename(filename);
    const filepath = path.join(getPromptImagesDir(), safeName);
    const buffer = await fs.promises.readFile(filepath);
    const ext = path.extname(filepath).slice(1).toLowerCase();
    const mime = ext === 'jpg' ? 'jpeg' : (ext || 'jpeg');
    const base64 = `data:image/${mime};base64,${buffer.toString('base64')}`;
    return { success: true, data: base64 };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('rename-prompt-image', async (event, oldFilename, newFilename) => {
  try {
    if (!oldFilename || !newFilename) return { success: false, error: 'Invalid filename' };
    const oldSafe = path.basename(oldFilename);
    const newSafe = sanitizeImageFilename(newFilename);
    const oldPath = path.join(getPromptImagesDir(), oldSafe);
    const newPath = path.join(getPromptImagesDir(), newSafe);
    if (oldPath === newPath) return { success: true, filename: newSafe };
    await fs.promises.rename(oldPath, newPath);
    return { success: true, filename: newSafe };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('delete-category-images', async (event, categoryPrefix) => {
  try {
    if (!categoryPrefix) return { success: true };
    const prefix = sanitizeImageFilename(String(categoryPrefix)) + '_';
    const dir = getPromptImagesDir();
    const files = await fs.promises.readdir(dir);
    const toDelete = files.filter(f => f.startsWith(prefix));
    const results = await Promise.all(
      toDelete.map(f =>
        fs.promises.unlink(path.join(dir, f))
          .then(() => true)
          .catch(() => false)
      )
    );
    const deleted = results.filter(Boolean).length;
    return { success: true, deleted };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-prompt-images-folder', async () => {
  try {
    const dir = getPromptImagesDir();
    await shell.openPath(dir);
    return { success: true, path: dir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

// ============ 数据目录管理 IPC ============

ipcMain.handle('get-data-directory', async () => {
  try {
    const config = readBootstrapConfig();
    const currentDir = getAppDataDir();
    const isCustom = !!(config && config.dataPath);
    const isPortable = isPortableMode();
    return {
      success: true,
      currentPath: currentDir,
      isCustom,
      isPortable,
      configPath: getBootstrapConfigPath(),
      hasPrompted: !!(config && config.hasPrompted)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('choose-data-directory', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择数据存储位置',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: 'D:\\'
    });
    if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }
    const selectedPath = result.filePaths[0];
    return { success: true, path: selectedPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('set-data-directory', async (event, newPath) => {
  try {
    if (!newPath || typeof newPath !== 'string') {
      return { success: false, error: 'Invalid path' };
    }

    const oldDir = getAppDataDir();

    // 如果新路径与当前路径相同，无需操作
    if (path.resolve(oldDir) === path.resolve(newPath)) {
      return { success: true, migrated: 0, failedToDelete: 0, message: '路径未变化' };
    }

    // 安全检查：禁止将数据目录设置到当前数据目录的子目录内
    // 否则迁移时会将整个数据目录复制到子目录中，产生无限递归嵌套
    if (isPathInside(newPath, oldDir)) {
      return { success: false, error: '不能将数据目录设置到当前数据目录的子目录内，这会导致数据嵌套' };
    }

    // 确保新目录存在
    await fs.promises.mkdir(newPath, { recursive: true });

    // 移动数据（复制后删除原文件）
    const migrationResult = await migrateDataToNewDirAsync(oldDir, newPath);

    // 更新 bootstrap 配置
    writeBootstrapConfig({
      dataPath: newPath,
      hasPrompted: true,
      updatedAt: new Date().toISOString()
    });

    return {
      success: true,
      migrated: migrationResult.migrated,
      failedToDelete: migrationResult.failedToDelete,
      newPath,
      oldPath: oldDir
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('reset-data-directory', async () => {
  try {
    const config = readBootstrapConfig();
    if (config) {
      delete config.dataPath;
      config.hasPrompted = true;
      config.updatedAt = new Date().toISOString();
      writeBootstrapConfig(config);
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('relaunch-app', async () => {
  try {
    app.relaunch();
    app.exit(0);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('set-data-directory-prompted', async () => {
  try {
    const config = readBootstrapConfig() || {};
    config.hasPrompted = true;
    writeBootstrapConfig(config);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('open-data-directory', async () => {
  try {
    const dir = getAppDataDir();
    await shell.openPath(dir);
    return { success: true, path: dir };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-read', async (event, key) => {
  try {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${key}.json`);
    let raw;
    try {
      raw = await fs.promises.readFile(filePath, 'utf-8');
    } catch (e) {
      // 文件不存在或读取失败
      return { success: false };
    }
    const cached = JSON.parse(raw);
    return { success: true, data: cached.data, timestamp: cached.timestamp };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-write', async (event, key, data) => {
  try {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${key}.json`);
    const cached = {
      key,
      data,
      timestamp: Date.now(),
      version: 2
    };
    await fs.promises.writeFile(filePath, JSON.stringify(cached), 'utf-8');
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-delete', async (event, key) => {
  try {
    const cacheDir = getCacheDir();
    const filePath = path.join(cacheDir, `${key}.json`);
    try { await fs.promises.unlink(filePath); } catch (e) { /* 文件不存在视为成功 */ }
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('cache-clear', async () => {
  try {
    const cacheDir = getCacheDir();
    let files = [];
    try { files = await fs.promises.readdir(cacheDir); } catch (e) { /* 目录不存在 */ }
    const jsonFiles = files.filter(f => f.endsWith('.json'));
    await Promise.all(
      jsonFiles.map(f =>
        fs.promises.unlink(path.join(cacheDir, f)).catch(() => {})
      )
    );
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

    // 读取缓存文件列表
    try {
      const files = await fs.promises.readdir(cacheDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      const stats = await Promise.all(
        jsonFiles.map(f =>
          fs.promises.stat(path.join(cacheDir, f))
            .then(stat => ({ name: f, size: stat.size, mtime: stat.mtimeMs }))
            .catch(() => null)
        )
      );
      for (const s of stats) {
        if (s) {
          result.cacheFiles.push(s);
          result.totalSize += s.size;
        }
      }
    } catch (e) { /* 缓存目录不存在 */ }

    // 异步递归计算数据目录大小
    const calcDirSize = async (dir) => {
      let size = 0;
      let entries;
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch (e) {
        return 0;
      }
      const stats = await Promise.all(
        entries.map(async (entry) => {
          const p = path.join(dir, entry.name);
          if (entry.isFile()) {
            try {
              const stat = await fs.promises.stat(p);
              return stat.size;
            } catch (e) {
              return 0;
            }
          } else if (entry.isDirectory()) {
            return await calcDirSize(p);
          }
          return 0;
        })
      );
      for (const s of stats) size += s;
      return size;
    };
    result.dataDirSize = await calcDirSize(dataDir);

    return { success: true, data: result };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('save-export-file', async (event, defaultName, content) => {
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath: defaultName,
      filters: [{ name: 'All Files', extensions: ['*'] }]
    });
    if (canceled || !filePath) return { success: false, canceled: true };
    await fs.promises.writeFile(filePath, content, 'utf-8');
    return { success: true, filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

app.setAppUserModelId('com.luofe.prompt-manager');

// 启动性能优化：减少 GPU 进程初始化开销
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection:', reason);
});

app.whenReady().then(async () => {
  await migrateUserDataIfNeededAsync();
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
