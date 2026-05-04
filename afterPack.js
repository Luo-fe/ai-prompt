const path = require('path');
const fs = require('fs');

const USER_DATA_PATTERNS = [
  'data',
  'Local Storage',
  'Session Storage',
  'IndexedDB',
  'Cache',
  'Code Cache',
  'GPUCache',
  'DawnCache',
  'DawnGraphiteCache',
  'blob_storage',
  'Partitions',
  'SingletonLock',
  'SingletonSocket',
  'SingletonCookie',
  'window-state.json',
  '.org.chromium.Chromium'
];

function cleanUserDataFromDir(dir) {
  if (!fs.existsSync(dir)) return;

  for (const pattern of USER_DATA_PATTERNS) {
    const target = path.join(dir, pattern);
    try {
      if (!fs.existsSync(target)) continue;
      const stat = fs.statSync(target);
      if (stat.isDirectory()) {
        fs.rmSync(target, { recursive: true, force: true });
        console.log(`[afterPack] Removed user data dir: ${target}`);
      } else {
        fs.unlinkSync(target);
        console.log(`[afterPack] Removed user data file: ${target}`);
      }
    } catch (e) {
      console.warn(`[afterPack] Failed to remove ${target}: ${e.message}`);
    }
  }
}

exports.default = async function(context) {
  if (context.electronPlatformName !== 'win32') return;

  const appOutDir = context.appOutDir;

  cleanUserDataFromDir(appOutDir);

  const resourcesDir = path.join(appOutDir, 'resources');
  cleanUserDataFromDir(resourcesDir);

  const exeName = context.packager.appInfo.productFilename + '.exe';
  const exePath = path.join(appOutDir, exeName);

  const iconCandidates = [
    path.join(process.cwd(), 'icon.ico'),
    path.join(__dirname, 'icon.ico')
  ];

  let iconPath = null;
  for (const p of iconCandidates) {
    if (fs.existsSync(p)) {
      iconPath = p;
      break;
    }
  }

  if (!iconPath) {
    console.error('[afterPack] icon.ico not found!');
    return;
  }

  if (!fs.existsSync(exePath)) {
    console.error('[afterPack] exe not found:', exePath);
    return;
  }

  console.log(`[afterPack] Embedding icon into: ${exePath}`);
  console.log(`[afterPack] Using icon: ${iconPath}`);

  try {
    const { rcedit } = require('rcedit');
    await rcedit(exePath, { icon: iconPath });
    console.log('[afterPack] Icon embedded successfully!');
  } catch (err) {
    console.error('[afterPack] Failed to embed icon:', err.message);
  }

  console.log('[afterPack] User data cleanup completed - package is clean');
};
