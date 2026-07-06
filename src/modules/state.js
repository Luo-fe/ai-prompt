import { DEFAULT_CATEGORIES, TRANSLATION_CACHE_LIMIT, SAVE_DATA_DEBOUNCE, DATA_VERSION } from './constants.js';
import { getPromptText, getCategoryById, debounce } from './utils.js';
import { readCache, writeCache, CACHE_KEYS, isCacheAvailable } from './cache.js';

const appState = {
  categories: [],
  selectedCategoryId: null,
  selectedPrompts: {},
  nextCategoryId: 1,
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
      order: 'original-first',
      appendConnector: false
    },
    exportShortcut: 'Ctrl+Shift+E',
    exportShortcutTarget: 'clipboard',
    exportShortcutAppendConnector: true,
    previewImage: {
      limitEnabled: true,
      maxDimension: 200,
      displaySize: 220
    },
    // 布局自定义设置
    customLayout: {
      locked: false,                 // 锁死布局：禁用响应式，窗口缩放时按比例等比缩放
      direction: 'row',              // 布局方向：'row' 三栏并排 | 'column' 单栏堆叠
      panels: {
        category: { ratio: 20, order: 0 },  // 类别卡片（ratio = flex-grow 比例）
        prompt:   { ratio: 50, order: 1 }, // 提示词卡片
        preview:  { ratio: 30, order: 2 }   // 已选提示词卡片（整个右侧面板）
      }
    },
    // 本地分词分类器设置（持久化于 settings）
    localTokenizer: {
      enabled: true,                 // 是否启用本地分词分类器
      customRulesLoaded: false,      // 用户自定义规则是否已加载
      lastDictVersion: null          // 上次加载的词典版本号
    },
    // 学习模型设置（持久化于 settings.json 主进程文件，这里仅作 UI 状态镜像）
    localLearning: {
      enabled: false,                // 是否启用学习模型辅助分类
      minConfidence: 0.6,            // 置信度阈值
      modelTrained: false,           // 模型是否已训练
      lastTrainedAt: null,           // 上次训练时间戳
      sampleCount: 0,                // 样本总数
      categoryCount: 0               // 类别数
    }
  },
  promptUsage: {},
  batchMode: false,
  batchSelected: new Set(),
  bgImageData: null,
  dataVersion: DATA_VERSION,
  // 运行时字段（不持久化）：分词分类器词典缓存
  tokenizerCache: {
    dictionary: null,                // 已加载的词典对象（合并内置 + 自定义规则后）
    lastLoadAt: 0                    // 上次加载时间戳（ms），用于失效判断
  },
  // 运行时字段（不持久化）：分词分类器当前结果列表
  // 每项形如 {tag, category, subgroup, matched, source, selected, imported}
  tokenizerResults: [],
  // 运行时字段（不持久化）：学习模型缓存
  learningCache: {
    samples: null,                   // 用户学习样本对象
    model: null,                     // 训练好的模型（仅用于状态展示，预测在主进程执行）
    lastLoadAt: 0                    // 上次加载时间戳
  }
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

// 防抖保存使用频率数据，避免频繁复制/选择提示词时产生过多 I/O
const debouncedSavePromptUsage = debounce(() => {
  try {
    localStorage.setItem('aiPromptToolUsage', JSON.stringify(appState.promptUsage));
  } catch (error) {
    console.warn('savePromptUsage failed:', error);
  }
  if (isCacheAvailable()) {
    writeCache(CACHE_KEYS.USAGE, appState.promptUsage).catch(() => {});
  }
}, SAVE_DATA_DEBOUNCE);

function saveData() {
  debouncedSaveData();
}

function saveDataImmediate() {
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
      // 深度合并 previewImage，避免部分缓存覆盖默认值
      if (data.previewImage) {
        appState.settings.previewImage = {
          ...appState.settings.previewImage,
          ...data.previewImage
        };
        delete data.previewImage;
      }
      // 深度合并 customLayout（含 panels 嵌套），避免部分缓存覆盖默认值
      if (data.customLayout) {
        const mergedPanels = {
          category: { ...appState.settings.customLayout.panels.category, ...(data.customLayout.panels?.category || {}) },
          prompt:   { ...appState.settings.customLayout.panels.prompt,   ...(data.customLayout.panels?.prompt   || {}) },
          preview:  { ...appState.settings.customLayout.panels.preview,  ...(data.customLayout.panels?.preview  || {}) }
        };
        appState.settings.customLayout = {
          locked: data.customLayout.locked ?? appState.settings.customLayout.locked,
          direction: data.customLayout.direction || appState.settings.customLayout.direction,
          panels: mergedPanels
        };
        delete data.customLayout;
      }
      // 深度合并 localTokenizer，避免旧版缓存（无字段）或部分缓存覆盖默认值
      if (data.localTokenizer) {
        appState.settings.localTokenizer = {
          enabled: data.localTokenizer.enabled ?? appState.settings.localTokenizer.enabled,
          customRulesLoaded: data.localTokenizer.customRulesLoaded ?? appState.settings.localTokenizer.customRulesLoaded,
          lastDictVersion: data.localTokenizer.lastDictVersion ?? appState.settings.localTokenizer.lastDictVersion
        };
        delete data.localTokenizer;
      }
      // 深度合并 localLearning
      if (data.localLearning) {
        appState.settings.localLearning = {
          enabled: data.localLearning.enabled ?? appState.settings.localLearning.enabled,
          minConfidence: data.localLearning.minConfidence ?? appState.settings.localLearning.minConfidence,
          modelTrained: data.localLearning.modelTrained ?? appState.settings.localLearning.modelTrained,
          lastTrainedAt: data.localLearning.lastTrainedAt ?? appState.settings.localLearning.lastTrainedAt,
          sampleCount: data.localLearning.sampleCount ?? appState.settings.localLearning.sampleCount,
          categoryCount: data.localLearning.categoryCount ?? appState.settings.localLearning.categoryCount
        };
        delete data.localLearning;
      }
      Object.assign(appState.settings, data);
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
      // 深度合并 previewImage，避免部分缓存覆盖默认值
      if (cached.previewImage) {
        appState.settings.previewImage = {
          ...appState.settings.previewImage,
          ...cached.previewImage
        };
        delete cached.previewImage;
      }
      // 深度合并 customLayout（含 panels 嵌套），避免部分缓存覆盖默认值
      if (cached.customLayout) {
        const mergedPanels = {
          category: { ...appState.settings.customLayout.panels.category, ...(cached.customLayout.panels?.category || {}) },
          prompt:   { ...appState.settings.customLayout.panels.prompt,   ...(cached.customLayout.panels?.prompt   || {}) },
          preview:  { ...appState.settings.customLayout.panels.preview,  ...(cached.customLayout.panels?.preview  || {}) }
        };
        appState.settings.customLayout = {
          locked: cached.customLayout.locked ?? appState.settings.customLayout.locked,
          direction: cached.customLayout.direction || appState.settings.customLayout.direction,
          panels: mergedPanels
        };
        delete cached.customLayout;
      }
      // 深度合并 localTokenizer，避免旧版缓存（无字段）或部分缓存覆盖默认值
      if (cached.localTokenizer) {
        appState.settings.localTokenizer = {
          enabled: cached.localTokenizer.enabled ?? appState.settings.localTokenizer.enabled,
          customRulesLoaded: cached.localTokenizer.customRulesLoaded ?? appState.settings.localTokenizer.customRulesLoaded,
          lastDictVersion: cached.localTokenizer.lastDictVersion ?? appState.settings.localTokenizer.lastDictVersion
        };
        delete cached.localTokenizer;
      }
      // 深度合并 localLearning
      if (cached.localLearning) {
        appState.settings.localLearning = {
          enabled: cached.localLearning.enabled ?? appState.settings.localLearning.enabled,
          minConfidence: cached.localLearning.minConfidence ?? appState.settings.localLearning.minConfidence,
          modelTrained: cached.localLearning.modelTrained ?? appState.settings.localLearning.modelTrained,
          lastTrainedAt: cached.localLearning.lastTrainedAt ?? appState.settings.localLearning.lastTrainedAt,
          sampleCount: cached.localLearning.sampleCount ?? appState.settings.localLearning.sampleCount,
          categoryCount: cached.localLearning.categoryCount ?? appState.settings.localLearning.categoryCount
        };
        delete cached.localLearning;
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
  debouncedSavePromptUsage();
}

// 缓存频繁使用的提示词，避免每次 renderPromptList 都重新计算
let _frequentCache = { categoryId: null, count: 0, result: [] };

function recordPromptUsage(categoryId, promptText) {
  const key = `${categoryId}::${promptText}`;
  if (!appState.promptUsage[key]) {
    appState.promptUsage[key] = 0;
  }
  appState.promptUsage[key]++;
  // 使缓存失效
  _frequentCache.categoryId = null;
  savePromptUsage();
}

function getFrequentPrompts(categoryId, count) {
  // 如果缓存命中（相同分类、相同请求数量），直接返回缓存结果
  if (_frequentCache.categoryId === categoryId && _frequentCache.count === count) {
    return _frequentCache.result;
  }

  const category = getCategoryById(appState.categories, categoryId);
  if (!category) {
    _frequentCache = { categoryId, count, result: [] };
    return [];
  }

  const usageEntries = Object.entries(appState.promptUsage)
    .filter(([key]) => key.startsWith(`${categoryId}::`))
    .sort((a, b) => b[1] - a[1])
    .slice(0, count);

  const result = usageEntries.map(([key, countVal]) => {
    const text = key.substring(key.indexOf('::') + 2);
    const prompt = category.prompts.find(p => getPromptText(p) === text);
    return {
      text,
      translation: prompt ? (typeof prompt === 'object' ? (prompt.translation || '') : '') : '',
      count: countVal
    };
  });

  _frequentCache = { categoryId, count, result };
  return result;
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