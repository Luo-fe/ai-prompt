import { DEFAULT_CATEGORIES, TRANSLATION_CACHE_LIMIT, SAVE_DATA_DEBOUNCE, DATA_VERSION } from './constants.js';
import { getPromptText, getCategoryById, debounce } from './utils.js';
import { readCache, writeCache, CACHE_KEYS, isCacheAvailable } from './cache.js';

const appState = {
  categories: [],
  selectedCategoryId: null,
  selectedPrompts: {},
  nextCategoryId: 1,
  dataVersion: 0,
  translations: {},
  settings: {
    translationEnabled: true,
    useOnlineTranslation: true,
    translationAPI: 'https://api.mymemory.translated.net/get',
    showTranslationInPreview: true,
    autoTranslateNewWords: true,
    backgroundImage: '',
    panelOpacity: 95,
    panelStyle: 'frosted',
    bgClarityMode: false,
    frequentCount: 10,
    rightClickCopyEnabled: false,
    rightClickCopyConfig: {
      includeOriginal: true,
      includeTranslation: true,
      connector: ', ',
      order: 'original-first'
    },
    exportShortcut: 'Ctrl+Shift+E',
    exportShortcutTarget: 'clipboard'
  },
  promptUsage: {},
  batchMode: false,
  batchSelected: new Set(),
  bgImageData: null,
  dataVersion: DATA_VERSION
};

let _notificationHandler = null;

function _notify(message, type) {
  if (typeof _notificationHandler === 'function') {
    _notificationHandler(message, type);
  }
}

function loadData() {
  try {
    const raw = localStorage.getItem('aiPromptToolData');
    if (raw) {
      const data = JSON.parse(raw);
      appState.categories = data.categories || [];
      appState.selectedPrompts = data.selectedPrompts || {};
      appState.nextCategoryId = data.nextCategoryId || 1;
      appState.dataVersion = data.dataVersion || 0;
    }
  } catch (error) {
    console.warn('loadData parse error, using DEFAULT_CATEGORIES:', error);
    appState.categories = [];
    appState.selectedPrompts = {};
    appState.nextCategoryId = 1;
    appState.dataVersion = 0;
  }
  ensureDefaultCategories();
}

async function loadDataFromCache() {
  if (!isCacheAvailable()) return false;
  try {
    const cached = await readCache(CACHE_KEYS.DATA);
    if (cached && cached.categories) {
      appState.categories = cached.categories || [];
      appState.selectedPrompts = cached.selectedPrompts || {};
      appState.nextCategoryId = cached.nextCategoryId || 1;
      appState.dataVersion = cached.dataVersion || 0;
      ensureDefaultCategories();
      return true;
    }
  } catch (e) {
    console.warn('loadDataFromCache failed:', e);
  }
  return false;
}

const debouncedSaveData = debounce(() => {
  const data = {
    categories: appState.categories,
    selectedPrompts: appState.selectedPrompts,
    nextCategoryId: appState.nextCategoryId,
    dataVersion: appState.dataVersion
  };
  try {
    localStorage.setItem('aiPromptToolData', JSON.stringify(data));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      _notify('存储空间不足，请清理浏览器缓存', 'error');
    }
    console.warn('saveData failed:', error);
  }
  if (isCacheAvailable()) {
    writeCache(CACHE_KEYS.DATA, data).catch(() => {});
  }
}, SAVE_DATA_DEBOUNCE);

function saveData() {
  debouncedSaveData();
}

function saveDataImmediate() {
  const data = {
    categories: appState.categories,
    selectedPrompts: appState.selectedPrompts,
    nextCategoryId: appState.nextCategoryId
  };
  try {
    localStorage.setItem('aiPromptToolData', JSON.stringify(data));
  } catch (error) {
    if (error.name === 'QuotaExceededError') {
      _notify('存储空间不足，请清理浏览器缓存', 'error');
    }
    console.warn('saveDataImmediate failed:', error);
  }
  if (isCacheAvailable()) {
    writeCache(CACHE_KEYS.DATA, data).catch(() => {});
  }
}

function ensureDefaultCategories() {
  for (const defaultCat of DEFAULT_CATEGORIES) {
    const existing = getCategoryById(appState.categories, defaultCat.id);
    if (!existing) {
      appState.categories.push({
        ...defaultCat,
        isDefault: true,
        prompts: defaultCat.prompts.map(p => typeof p === 'string' ? { text: p, translation: '' } : { ...p })
      });
    } else if (existing.isDefault) {
      existing.prompts = existing.prompts.map(p => typeof p === 'string' ? { text: p, translation: '' } : p);
      for (const defaultPrompt of defaultCat.prompts) {
        const defaultText = typeof defaultPrompt === 'string' ? defaultPrompt : defaultPrompt.text;
        const found = existing.prompts.some(p => getPromptText(p) === defaultText);
        if (!found) {
          existing.prompts.push(typeof defaultPrompt === 'string' ? { text: defaultPrompt, translation: '' } : { ...defaultPrompt });
        }
      }
    }
  }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem('aiPromptToolSettings');
    if (raw) {
      const data = JSON.parse(raw);
      // 深度合并 rightClickCopyConfig，避免部分缓存覆盖默认值
      if (data.rightClickCopyConfig) {
        appState.settings.rightClickCopyConfig = {
          ...appState.settings.rightClickCopyConfig,
          ...data.rightClickCopyConfig
        };
        delete data.rightClickCopyConfig;
      }
      Object.assign(appState.settings, data);
    }
    const bgCache = localStorage.getItem('aiPromptToolBgCache');
    if (bgCache) {
      appState.bgImageData = bgCache;
    }
  } catch (error) {
    console.warn('loadSettings failed:', error);
  }
}

async function loadSettingsFromCache() {
  if (!isCacheAvailable()) return false;
  try {
    const cached = await readCache(CACHE_KEYS.SETTINGS);
    if (cached) {
      // 深度合并 rightClickCopyConfig，避免部分缓存覆盖默认值
      if (cached.rightClickCopyConfig) {
        appState.settings.rightClickCopyConfig = {
          ...appState.settings.rightClickCopyConfig,
          ...cached.rightClickCopyConfig
        };
        delete cached.rightClickCopyConfig;
      }
      Object.assign(appState.settings, cached);
      return true;
    }
  } catch (e) {
    console.warn('loadSettingsFromCache failed:', e);
  }
  return false;
}

function saveSettingsToStorage() {
  try {
    const settingsCopy = { ...appState.settings };
    if (settingsCopy.backgroundImage && settingsCopy.backgroundImage.startsWith('data:')) {
      settingsCopy.backgroundImage = 'file://stored';
    }
    localStorage.setItem('aiPromptToolSettings', JSON.stringify(settingsCopy));
    if (isCacheAvailable()) {
      writeCache(CACHE_KEYS.SETTINGS, settingsCopy).catch(() => {});
    }
  } catch (error) {
    console.warn('saveSettingsToStorage failed:', error);
  }
}

function loadTranslations() {
  try {
    const raw = localStorage.getItem('aiPromptToolTranslations');
    if (raw) {
      appState.translations = JSON.parse(raw);
    }
  } catch (error) {
    console.warn('loadTranslations failed:', error);
  }
}

async function loadTranslationsFromCache() {
  if (!isCacheAvailable()) return false;
  try {
    const cached = await readCache(CACHE_KEYS.TRANSLATIONS);
    if (cached && typeof cached === 'object') {
      appState.translations = cached;
      return true;
    }
  } catch (e) {
    console.warn('loadTranslationsFromCache failed:', e);
  }
  return false;
}

function saveTranslations() {
  try {
    const entries = Object.entries(appState.translations);
    if (entries.length > TRANSLATION_CACHE_LIMIT) {
      appState.translations = Object.fromEntries(entries.slice(-TRANSLATION_CACHE_LIMIT));
    }
    localStorage.setItem('aiPromptToolTranslations', JSON.stringify(appState.translations));
    if (isCacheAvailable()) {
      writeCache(CACHE_KEYS.TRANSLATIONS, appState.translations).catch(() => {});
    }
  } catch (error) {
    console.warn('saveTranslations failed:', error);
    _notify('翻译缓存保存失败', 'error');
  }
}

function loadPromptUsage() {
  try {
    const raw = localStorage.getItem('aiPromptToolUsage');
    if (raw) {
      appState.promptUsage = JSON.parse(raw);
    }
  } catch (error) {
    console.warn('loadPromptUsage failed:', error);
  }
}

async function loadUsageFromCache() {
  if (!isCacheAvailable()) return false;
  try {
    const cached = await readCache(CACHE_KEYS.USAGE);
    if (cached && typeof cached === 'object') {
      appState.promptUsage = cached;
      return true;
    }
  } catch (e) {
    console.warn('loadUsageFromCache failed:', e);
  }
  return false;
}

function savePromptUsage() {
  try {
    localStorage.setItem('aiPromptToolUsage', JSON.stringify(appState.promptUsage));
    if (isCacheAvailable()) {
      writeCache(CACHE_KEYS.USAGE, appState.promptUsage).catch(() => {});
    }
  } catch (error) {
    console.warn('savePromptUsage failed:', error);
  }
}

function recordPromptUsage(categoryId, promptText) {
  const key = `${categoryId}::${promptText}`;
  if (!appState.promptUsage[key]) {
    appState.promptUsage[key] = 0;
  }
  appState.promptUsage[key]++;
  savePromptUsage();
}

function getFrequentPrompts(categoryId, count) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return [];

  const usageEntries = Object.entries(appState.promptUsage)
    .filter(([key]) => key.startsWith(`${categoryId}::`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);

  return usageEntries.map(([key, countVal]) => {
    const text = key.substring(key.indexOf('::') + 2);
    const prompt = category.prompts.find(p => getPromptText(p) === text);
    return {
      text,
      translation: prompt ? (typeof prompt === 'object' ? (prompt.translation || '') : '') : '',
      count: countVal
    };
  });
}

function setNotificationHandler(handler) {
  _notificationHandler = handler;
}

export { appState };
export {
  loadData,
  loadDataFromCache,
  saveData,
  saveDataImmediate,
  ensureDefaultCategories,
  loadSettings,
  loadSettingsFromCache,
  saveSettingsToStorage,
  loadTranslations,
  loadTranslationsFromCache,
  saveTranslations,
  loadPromptUsage,
  loadUsageFromCache,
  savePromptUsage,
  recordPromptUsage,
  getFrequentPrompts,
  setNotificationHandler
};
