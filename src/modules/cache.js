const CACHE_KEYS = {
  DATA: 'app-data',
  SETTINGS: 'app-settings',
  TRANSLATIONS: 'app-translations',
  USAGE: 'app-usage',
  BG_IMAGE: 'app-bg-image'
};

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

function isCacheAvailable() {
  return window.electronAPI && typeof window.electronAPI.cacheRead === 'function';
}

async function readCache(key) {
  if (!isCacheAvailable()) return null;
  try {
    const result = await window.electronAPI.cacheRead(key);
    if (result.success && result.data) {
      if (result.timestamp && (Date.now() - result.timestamp > CACHE_TTL)) {
        await deleteCache(key);
        return null;
      }
      return result.data;
    }
    return null;
  } catch (e) {
    console.warn('cacheRead failed:', e);
    return null;
  }
}

async function writeCache(key, data) {
  if (!isCacheAvailable()) return false;
  try {
    const result = await window.electronAPI.cacheWrite(key, data);
    return result.success;
  } catch (e) {
    console.warn('cacheWrite failed:', e);
    return false;
  }
}

async function deleteCache(key) {
  if (!isCacheAvailable()) return false;
  try {
    const result = await window.electronAPI.cacheDelete(key);
    return result.success;
  } catch (e) {
    console.warn('cacheDelete failed:', e);
    return false;
  }
}

async function clearAllCache() {
  if (!isCacheAvailable()) return false;
  try {
    const result = await window.electronAPI.cacheClear();
    return result.success;
  } catch (e) {
    console.warn('cacheClear failed:', e);
    return false;
  }
}

async function getCacheInfo() {
  if (!isCacheAvailable()) return null;
  try {
    const result = await window.electronAPI.cacheInfo();
    if (result.success) return result.data;
    return null;
  } catch (e) {
    console.warn('cacheInfo failed:', e);
    return null;
  }
}

export {
  CACHE_KEYS,
  CACHE_TTL,
  isCacheAvailable,
  readCache,
  writeCache,
  deleteCache,
  clearAllCache,
  getCacheInfo
};
