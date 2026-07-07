import { appState, saveSettingsToStorage, savePromptUsage } from './state.js';
import { BG_IMAGE_MAX_SIZE } from './constants.js';
import { getCacheInfo, clearAllCache, isCacheAvailable } from './cache.js';
import { parseCsvLine, parseCategoryHierarchy, getCategoryById } from './utils.js';
import { applyTokenizerEnabledState } from './tokenizer.js';

let _showNotification = () => {};
let _applyBackgroundSettings = () => {};
let _applyBgClarityMode = () => {};
let _renderPromptList = () => {};
let _renderSelectedPrompts = () => {};
let _renderCategoryList = () => {};
let _renderRandomCategorySelector = () => {};
let _saveData = () => {};
let _getElements = () => ({});
let _showConfirm = async () => false;
let _savePromptUsage = () => {};
let _applyCustomLayout = () => {};
let _enterLayoutEditMode = () => {};
let _resetLayoutToDefault = () => {};

export function initSettings(handlers) {
  _showNotification = handlers.showNotification || _showNotification;
  _applyBackgroundSettings = handlers.applyBackgroundSettings || _applyBackgroundSettings;
  _applyBgClarityMode = handlers.applyBgClarityMode || _applyBgClarityMode;
  _renderPromptList = handlers.renderPromptList || _renderPromptList;
  _renderSelectedPrompts = handlers.renderSelectedPrompts || _renderSelectedPrompts;
  _renderCategoryList = handlers.renderCategoryList || _renderCategoryList;
  _renderRandomCategorySelector = handlers.renderRandomCategorySelector || _renderRandomCategorySelector;
  _saveData = handlers.saveData || _saveData;
  _showConfirm = handlers.showConfirm || _showConfirm;
  _savePromptUsage = handlers.savePromptUsage || _savePromptUsage;
  _getElements = handlers.getElements || _getElements;
  _applyCustomLayout = handlers.applyCustomLayout || _applyCustomLayout;
  _enterLayoutEditMode = handlers.enterLayoutEditMode || _enterLayoutEditMode;
  _resetLayoutToDefault = handlers.resetLayoutToDefault || _resetLayoutToDefault;
}

export function openSettingsModal(elements) {
  elements.translationEnabled.checked = appState.settings.translationEnabled;
  elements.onlineTranslation.checked = appState.settings.useOnlineTranslation;
  elements.autoTranslateNew.checked = appState.settings.autoTranslateNewWords;
  elements.showTranslationPreview.checked = appState.settings.showTranslationInPreview;
  elements.translationAPI.value = appState.settings.translationAPI;
  if (elements.panelOpacitySlider) elements.panelOpacitySlider.value = appState.settings.panelOpacity;
  if (elements.panelOpacityValue) elements.panelOpacityValue.textContent = appState.settings.panelOpacity + '%';
  if (elements.panelStyleFrosted && elements.panelStyleTransparent) {
    (appState.settings.panelStyle === 'transparent' ? elements.panelStyleTransparent : elements.panelStyleFrosted).checked = true;
  }
  if (elements.frequentCountInput) elements.frequentCountInput.value = appState.settings.frequentCount || 10;
  if (elements.rightClickCopyEnabled) elements.rightClickCopyEnabled.checked = appState.settings.rightClickCopyEnabled || false;
  loadRightClickCopySettings(elements);
  if (elements.exportShortcutInput) elements.exportShortcutInput.value = appState.settings.exportShortcut || 'Ctrl+Shift+E';
  if (elements.exportShortcutTarget) elements.exportShortcutTarget.value = appState.settings.exportShortcutTarget || 'clipboard';
  if (elements.exportShortcutAppendConnector) elements.exportShortcutAppendConnector.checked = appState.settings.exportShortcutAppendConnector !== false;
  if (elements.previewImageLimitEnabled) elements.previewImageLimitEnabled.checked = (appState.settings.previewImage || {}).limitEnabled !== false;
  if (elements.previewImageMaxDimension) elements.previewImageMaxDimension.value = (appState.settings.previewImage || {}).maxDimension || 200;
  if (elements.previewImageDisplaySize) elements.previewImageDisplaySize.value = (appState.settings.previewImage || {}).displaySize || 220;
  // 加载布局自定义设置
  if (elements.layoutLockToggle) {
    elements.layoutLockToggle.checked = !!(appState.settings.customLayout && appState.settings.customLayout.locked);
  }
  // 本地分词分类器：开关 + 词典统计信息
  if (elements.tokenizerEnabledCheckbox) {
    elements.tokenizerEnabledCheckbox.checked = appState.settings.localTokenizer?.enabled !== false;
  }
  // 学习模型：开关 + 置信度阈值回填（enabled 默认 false，需用户手动开启）
  if (elements.learningEnabledCheckbox) {
    elements.learningEnabledCheckbox.checked = appState.settings.localLearning?.enabled === true;
  }
  if (elements.learningMinConfidenceSelect) {
    elements.learningMinConfidenceSelect.value = String(appState.settings.localLearning?.minConfidence ?? 0.6);
  }
  loadTokenizerStats(elements);
  updateBgPreview(elements);
  elements.settingsModal.style.display = 'block';
  refreshCacheInfo();
  loadDataDirectoryInfo(elements);
}

/**
 * 异步加载本地分词分类器词典统计信息（版本 / 标签数 / 分类数）
 * 不阻塞设置弹窗的显示；IPC 不可用时静默失败
 * @param {Object} elements - DOM 元素缓存
 */
function loadTokenizerStats(elements) {
  if (!window.electronAPI?.tokenizerReadDictionary) return;
  Promise.resolve(window.electronAPI.tokenizerReadDictionary()).then(res => {
    if (!res || !res.success) return;
    if (elements.tokenizerVersion) elements.tokenizerVersion.textContent = res.stats?.version || '-';
    if (elements.tokenizerTagCount) elements.tokenizerTagCount.textContent = res.stats?.tagCount ?? '-';
    if (elements.tokenizerCategoryCount) elements.tokenizerCategoryCount.textContent = res.stats?.categoryCount ?? '-';
  }).catch(() => { /* 优雅降级：IPC 未就绪或失败时静默 */ });
}

function loadRightClickCopySettings(elements) {
  const config = appState.settings.rightClickCopyConfig || {
    includeOriginal: true, includeTranslation: true, connector: ', ', order: 'original-first', appendConnector: false
  };
  if (elements.rccIncludeOriginal) elements.rccIncludeOriginal.checked = config.includeOriginal !== false;
  if (elements.rccIncludeTranslation) elements.rccIncludeTranslation.checked = config.includeTranslation !== false;
  if (elements.rccAppendConnector) elements.rccAppendConnector.checked = config.appendConnector === true;
  if (elements.rccConnector) {
    const connector = config.connector || ', ';
    const options = [...elements.rccConnector.options].map(o => o.value);
    if (options.includes(connector)) {
      elements.rccConnector.value = connector;
      if (elements.rccCustomConnector) elements.rccCustomConnector.style.display = 'none';
    } else {
      elements.rccConnector.value = 'custom';
      if (elements.rccCustomConnector) {
        elements.rccCustomConnector.style.display = 'inline-block';
        elements.rccCustomConnector.value = connector;
      }
    }
  }
  const orderRadio = document.querySelector('input[name="rcc-order"][value="' + (config.order || 'original-first') + '"]');
  if (orderRadio) orderRadio.checked = true;
  updateRightClickCopyPreview(elements);
}

function updateRightClickCopyPreview(elements) {
  if (!elements.rccPreviewText) return;
  const config = collectRightClickCopyConfig(elements);
  const original = 'apple';
  const translation = '苹果';
  const parts = [];
  if (config.order === 'translation-first') {
    if (config.includeTranslation) parts.push(translation);
    if (config.includeOriginal) parts.push(original);
  } else {
    if (config.includeOriginal) parts.push(original);
    if (config.includeTranslation) parts.push(translation);
  }
  let preview;
  if (parts.length === 0) preview = original;
  else if (parts.length === 1) preview = parts[0];
  else {
    let connector = config.connector;
    if (connector === 'custom') connector = config.customConnector || ', ';
    preview = parts.join(connector);
  }
  if (config.appendConnector) {
    let conn = config.connector;
    if (conn === 'custom') conn = config.customConnector || ', ';
    preview += conn;
  }
  elements.rccPreviewText.textContent = preview;
}

function collectRightClickCopyConfig(elements) {
  const connector = elements.rccConnector ? elements.rccConnector.value : ', ';
  let finalConnector = connector;
  let customConnector = '';
  if (connector === 'custom') {
    customConnector = elements.rccCustomConnector ? elements.rccCustomConnector.value : '';
    finalConnector = customConnector || ', ';
  }
  const orderRadio = document.querySelector('input[name="rcc-order"]:checked');
  return {
    includeOriginal: elements.rccIncludeOriginal ? elements.rccIncludeOriginal.checked : true,
    includeTranslation: elements.rccIncludeTranslation ? elements.rccIncludeTranslation.checked : true,
    connector: finalConnector,
    customConnector: customConnector,
    order: orderRadio ? orderRadio.value : 'original-first',
    appendConnector: elements.rccAppendConnector ? elements.rccAppendConnector.checked : false
  };
}

export async function saveSettings(elements) {
  appState.settings.translationEnabled = elements.translationEnabled.checked;
  appState.settings.useOnlineTranslation = elements.onlineTranslation.checked;
  appState.settings.autoTranslateNewWords = elements.autoTranslateNew.checked;
  appState.settings.showTranslationInPreview = elements.showTranslationPreview.checked;
  appState.settings.translationAPI = elements.translationAPI.value.trim();
  if (elements.panelOpacitySlider) appState.settings.panelOpacity = parseInt(elements.panelOpacitySlider.value);
  if (elements.panelStyleFrosted && elements.panelStyleFrosted.checked) appState.settings.panelStyle = 'frosted';
  else if (elements.panelStyleTransparent && elements.panelStyleTransparent.checked) appState.settings.panelStyle = 'transparent';
  if (elements.frequentCountInput) {
    const val = parseInt(elements.frequentCountInput.value);
    if (val >= 1 && val <= 20) appState.settings.frequentCount = val;
  }
  if (elements.rightClickCopyEnabled) appState.settings.rightClickCopyEnabled = elements.rightClickCopyEnabled.checked;
  appState.settings.rightClickCopyConfig = collectRightClickCopyConfig(elements);
  if (elements.exportShortcutInput && elements.exportShortcutInput.value.trim()) {
    appState.settings.exportShortcut = elements.exportShortcutInput.value.trim();
  }
  if (elements.exportShortcutTarget) {
    appState.settings.exportShortcutTarget = elements.exportShortcutTarget.value;
  }
  if (elements.exportShortcutAppendConnector) {
    appState.settings.exportShortcutAppendConnector = elements.exportShortcutAppendConnector.checked;
  }
  if (elements.previewImageLimitEnabled || elements.previewImageMaxDimension || elements.previewImageDisplaySize) {
    const maxDim = elements.previewImageMaxDimension ? parseInt(elements.previewImageMaxDimension.value) : 200;
    const dispSize = elements.previewImageDisplaySize ? parseInt(elements.previewImageDisplaySize.value) : 220;
    appState.settings.previewImage = {
      limitEnabled: elements.previewImageLimitEnabled ? elements.previewImageLimitEnabled.checked : true,
      maxDimension: (maxDim >= 50 && maxDim <= 500) ? maxDim : 200,
      displaySize: (dispSize >= 100 && dispSize <= 500) ? dispSize : 220
    };
  }
  // 保存布局自定义设置（仅锁死开关，其他在编辑模式中保存）
  if (elements.layoutLockToggle && appState.settings.customLayout) {
    appState.settings.customLayout.locked = elements.layoutLockToggle.checked;
  }
  // 本地分词分类器：收集开关值并同步导航栏按钮状态
  if (appState.settings.localTokenizer && elements.tokenizerEnabledCheckbox) {
    appState.settings.localTokenizer.enabled = elements.tokenizerEnabledCheckbox.checked;
  }
  // 学习模型：收集开关 + 置信度，同步到主进程 settings.json
  if (appState.settings.localLearning) {
    appState.settings.localLearning.enabled = elements.learningEnabledCheckbox ? elements.learningEnabledCheckbox.checked === true : false;
    appState.settings.localLearning.minConfidence = elements.learningMinConfidenceSelect ? (parseFloat(elements.learningMinConfidenceSelect.value) || 0.6) : 0.6;
    // 非阻塞同步到主进程持久化（settings.json 的 localLearning 字段）
    window.electronAPI?.tokenizerSaveLearningSettings?.({
      enabled: appState.settings.localLearning.enabled,
      minConfidence: appState.settings.localLearning.minConfidence
    }).catch(e => console.warn('保存学习设置到主进程失败:', e));
  }
  saveSettingsToStorage();
  _applyBackgroundSettings();
  // 应用布局设置（更新 CSS 变量、order、locked class）
  if (typeof _applyCustomLayout === 'function') _applyCustomLayout();
  // 同步本地分词分类器导航栏按钮的禁用态
  applyTokenizerEnabledState?.();
  elements.settingsModal.style.display = 'none';
  _showNotification('设置已保存', 'success');
  if (appState.selectedCategoryId) _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
}

export function handleBgImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.match(/^image\/(jpeg|png|bmp|webp|gif)$/)) {
    _showNotification('请选择有效的图片文件（JPG、PNG、BMP、WebP、GIF）', 'error');
    return;
  }
  if (file.size > BG_IMAGE_MAX_SIZE) {
    _showNotification('图片文件不能超过10MB', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Data = e.target.result;
    if (window.electronAPI && window.electronAPI.saveBgImage) {
      const result = await window.electronAPI.saveBgImage(base64Data);
      if (result.success) {
        appState.settings.backgroundImage = 'file://stored';
        appState.bgImageData = base64Data;
      } else {
        appState.settings.backgroundImage = base64Data;
      }
    } else {
      appState.settings.backgroundImage = base64Data;
    }
    saveSettingsToStorage();
    _applyBackgroundSettings(_getElements());
    _showNotification('背景图片已设置', 'success');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

export function clearBgImage(elements) {
  appState.settings.backgroundImage = '';
  appState.bgImageData = null;
  if (window.electronAPI && window.electronAPI.deleteBgImage) {
    window.electronAPI.deleteBgImage();
  }
  saveSettingsToStorage();
  _applyBackgroundSettings(_getElements());
  updateBgPreview(elements);
  _showNotification('背景图片已清除', 'success');
}

export async function loadBgImageFromFile() {
  if (appState.bgImageData) return;
  if (appState.settings.backgroundImage !== 'file://stored') return;
  if (window.electronAPI && window.electronAPI.readBgImage) {
    const result = await window.electronAPI.readBgImage();
    if (result.success) {
      appState.bgImageData = result.data;
    } else {
      appState.settings.backgroundImage = '';
      appState.bgImageData = null;
      saveSettingsToStorage();
    }
  }
}

export function updateBgPreview(elements) {
  const container = elements.bgPreviewContainer;
  if (!container) return;
  const bgImage = appState.bgImageData || (appState.settings.backgroundImage !== 'file://stored' ? appState.settings.backgroundImage : '');
  container.innerHTML = '';
  if (bgImage) {
    const img = document.createElement('img');
    img.src = bgImage;
    img.alt = '背景预览';
    container.appendChild(img);
  } else {
    const span = document.createElement('span');
    span.className = 'bg-preview-placeholder';
    span.textContent = '未设置背景图片';
    container.appendChild(span);
  }
}

export function applyBackgroundSettings(elements) {
  const { panelOpacity: opacity, panelStyle: style } = appState.settings;
  const bgImage = appState.bgImageData || (appState.settings.backgroundImage !== 'file://stored' ? appState.settings.backgroundImage : '');
  const alpha = opacity / 100;
  const isFrosted = (style || 'frosted') === 'frosted';

  const overlay = elements ? elements.bgImageOverlay : document.getElementById('bg-image-overlay');
  if (overlay) {
    if (bgImage) {
      overlay.style.backgroundImage = `url(${bgImage})`;
      document.body.classList.add('has-bg-image');
    } else {
      overlay.style.backgroundImage = '';
      document.body.classList.remove('has-bg-image');
    }
  }

  document.body.classList.remove('panel-style-frosted', 'panel-style-transparent');
  document.body.classList.add('panel-style-' + (style || 'frosted'));

  const root = document.documentElement.style;
  root.setProperty('--panel-alpha', alpha);
  root.setProperty('--panel-blur', isFrosted ? '16px' : '0px');
  root.setProperty('--panel-saturate', isFrosted ? '1.4' : '1');
  root.setProperty('--panel-bg', `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`);
  root.setProperty('--navbar-bg', `rgba(255, 255, 255, ${Math.max(0.05, 0.85 * alpha)})`);
  root.setProperty('--light-bg', `rgba(248, 250, 252, ${Math.max(0.05, alpha)})`);
  root.setProperty('--item-bg', `rgba(255, 255, 255, ${Math.max(0.05, alpha * 0.9)})`);
  root.setProperty('--border-alpha', Math.max(0.15, alpha * 0.6));
  root.setProperty('--dark-bg', `rgba(15, 23, 42, ${Math.max(0.7, alpha)})`);

  const backdrop = isFrosted ? `blur(var(--panel-blur)) saturate(var(--panel-saturate))` : 'none';
  root.setProperty('--panel-backdrop', backdrop);
}

export function toggleBgClarityMode() {
  appState.settings.bgClarityMode = !appState.settings.bgClarityMode;
  saveSettingsToStorage();
  _applyBgClarityMode();
  _showNotification(appState.settings.bgClarityMode ? '背景清晰度优化已开启' : '背景清晰度优化已关闭', 'success');
}

export function applyBgClarityMode() {
  document.body.classList.toggle('bg-clarity-mode', appState.settings.bgClarityMode);
}

export function bindSettingsEvents(elements) {
  elements.saveSettingsBtn.addEventListener('click', () => saveSettings(elements));
  elements.cancelSettingsBtn.addEventListener('click', () => { elements.settingsModal.style.display = 'none'; });
  elements.cleanDuplicatesBtn.addEventListener('click', () => {
    let totalRemoved = 0;
    appState.categories.forEach(category => {
      const unique = new Map();
      category.prompts.forEach(p => {
        const text = (typeof p === 'object' && p !== null ? p.text : String(p)).toLowerCase();
        if (!unique.has(text)) unique.set(text, p);
      });
      const removed = category.prompts.length - unique.size;
      totalRemoved += removed;
      if (removed > 0) category.prompts = Array.from(unique.values());
    });
    if (totalRemoved > 0) {
      _saveData();
      if (appState.selectedCategoryId) _renderPromptList(appState.selectedCategoryId);
      _showNotification(`已清理 ${totalRemoved} 个重复提示词`, 'success');
    } else {
      _showNotification('没有发现重复的提示词', 'info');
    }
  });
  elements.exportAllDataBtn.addEventListener('click', async () => {
    const promptImages = {};
    if (window.electronAPI && window.electronAPI.readPromptImage) {
      for (const category of appState.categories) {
        for (const prompt of category.prompts) {
          if (typeof prompt === 'object' && prompt !== null && prompt.imagePath) {
            try {
              const result = await window.electronAPI.readPromptImage(prompt.imagePath);
              if (result.success) promptImages[prompt.imagePath] = result.data;
            } catch (e) {}
          }
        }
      }
    }
    const data = {
      categories: appState.categories,
      settings: appState.settings,
      translations: appState.translations,
      promptUsage: appState.promptUsage,
      selectedPrompts: appState.selectedPrompts,
      nextCategoryId: appState.nextCategoryId,
      bgImageData: appState.bgImageData || null,
      promptImages: Object.keys(promptImages).length > 0 ? promptImages : null,
      exportDate: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-prompt-tool-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    _showNotification('数据导出成功', 'success');
  });
  elements.importDataBtn.addEventListener('click', () => elements.importFileInput.click());
  elements.importFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.categories || !Array.isArray(data.categories)) {
          _showNotification('无效的导入文件格式', 'error');
          return;
        }

        let addedCategories = 0;
        let addedPrompts = 0;

        for (const cat of data.categories) {
          const existing = appState.categories.find(c => c.id === cat.id || c.name === cat.name);
          if (existing) {
            const existingTexts = new Set(existing.prompts.map(p => (typeof p === 'object' && p !== null ? p.text : String(p)).toLowerCase()));
            for (const prompt of cat.prompts) {
              const text = typeof prompt === 'object' && prompt !== null ? prompt.text : String(prompt);
              if (!existingTexts.has(text.toLowerCase())) {
                existing.prompts.push(prompt);
                existingTexts.add(text.toLowerCase());
                addedPrompts++;
              }
            }
          } else {
            appState.categories.push(cat);
            addedCategories++;
          }
        }

        if (data.settings) Object.assign(appState.settings, data.settings);
        if (data.translations) Object.assign(appState.translations, data.translations);
        if (data.promptUsage) Object.assign(appState.promptUsage, data.promptUsage);
        if (data.nextCategoryId && data.nextCategoryId > appState.nextCategoryId) {
          appState.nextCategoryId = data.nextCategoryId;
        }
        if (data.bgImageData) appState.bgImageData = data.bgImageData;

        if (data.promptImages && window.electronAPI && window.electronAPI.savePromptImage) {
          for (const [filename, base64Data] of Object.entries(data.promptImages)) {
            try {
              await window.electronAPI.savePromptImage(filename, base64Data);
            } catch (e) {}
          }
        }

        _saveData();
        saveSettingsToStorage();
        appState.selectedCategoryId = appState.selectedCategoryId || (appState.categories.length > 0 ? appState.categories[0].id : null);
        const els = _getElements();
        _renderCategoryList();
        _renderRandomCategorySelector();
        _applyBackgroundSettings(els);
        if (appState.selectedCategoryId) _renderPromptList(appState.selectedCategoryId);
        _renderSelectedPrompts();
        _showNotification(`数据合并成功：新增 ${addedCategories} 个分类，${addedPrompts} 个提示词`, 'success');
      } catch (error) {
        _showNotification('导入文件解析失败', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  });
  elements.exportCsvBtn.addEventListener('click', () => {
    const BOM = '\uFEFF';
    let csv = BOM + '分类,提示词,翻译\n';
    for (const category of appState.categories) {
      for (const prompt of category.prompts) {
        const text = (typeof prompt === 'object' && prompt !== null ? prompt.text : String(prompt)).replace(/"/g, '""');
        const translation = (typeof prompt === 'object' && prompt !== null ? (prompt.translation || '') : '').replace(/"/g, '""');
        const name = category.name.replace(/"/g, '""');
        csv += `"${name}","${text}","${translation}"\n`;
      }
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-prompt-tool-export-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    _showNotification('CSV导出成功', 'success');
  });
  elements.importCsvBtn.addEventListener('click', () => elements.importCsvFileInput.click());
  elements.importCsvFileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n');
        if (lines.length < 2) {
          _showNotification('CSV文件为空', 'error');
          return;
        }
        const header = parseCsvLine(lines[0]);
        const catIdx = header.indexOf('分类');
        const textIdx = header.indexOf('提示词');
        const transIdx = header.indexOf('翻译');
        if (catIdx === -1 || textIdx === -1) {
          _showNotification('CSV格式不正确，需要"分类"和"提示词"列', 'error');
          return;
        }
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const fields = parseCsvLine(line);
          const catName = fields[catIdx] || '';
          const promptText = fields[textIdx] || '';
          const translation = transIdx !== -1 ? (fields[transIdx] || '') : '';
          if (!catName || !promptText) continue;
          const hierarchy = parseCategoryHierarchy(catName);
          let currentParentId = null;
          let lastCategory = null;
          for (let j = 0; j < hierarchy.length; j++) {
            const levelName = hierarchy[j];
            let levelCategory = appState.categories.find(c => c.name === levelName && c.parentId === currentParentId);
            if (!levelCategory) {
              levelCategory = {
                id: `custom_${appState.nextCategoryId++}`,
                name: levelName,
                parentId: currentParentId,
                prompts: []
              };
              appState.categories.push(levelCategory);
            }
            lastCategory = levelCategory;
            currentParentId = levelCategory.id;
          }
          if (lastCategory && !lastCategory.prompts.some(p => (typeof p === 'object' && p !== null ? p.text : String(p)) === promptText)) {
            lastCategory.prompts.push({ text: promptText, translation });
          }
        }
        _saveData();
        _showNotification('CSV导入成功', 'success');
      } catch (error) {
        _showNotification('CSV解析失败', 'error');
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  });

  if (elements.bgUploadBtn) elements.bgUploadBtn.addEventListener('click', () => elements.bgFileInput.click());
  if (elements.bgFileInput) elements.bgFileInput.addEventListener('change', handleBgImageUpload);
  if (elements.bgClearBtn) elements.bgClearBtn.addEventListener('click', () => clearBgImage(elements));

  if (elements.panelOpacitySlider) {
    elements.panelOpacitySlider.addEventListener('input', (e) => {
      const val = e.target.value;
      if (elements.panelOpacityValue) elements.panelOpacityValue.textContent = val + '%';
      appState.settings.panelOpacity = parseInt(val);
      applyBackgroundSettings(elements);
    });
  }
  if (elements.panelStyleFrosted) {
    elements.panelStyleFrosted.addEventListener('change', () => {
      appState.settings.panelStyle = 'frosted';
      applyBackgroundSettings(elements);
    });
  }
  if (elements.panelStyleTransparent) {
    elements.panelStyleTransparent.addEventListener('change', () => {
      appState.settings.panelStyle = 'transparent';
      applyBackgroundSettings(elements);
    });
  }
  if (elements.bgClarityBtn) {
    elements.bgClarityBtn.addEventListener('click', toggleBgClarityMode);
  }
  if (elements.clearUsageBtn) {
    elements.clearUsageBtn.addEventListener('click', () => {
      _showConfirm('清空使用记录', '确定要清空所有提示词使用记录吗？此操作不可撤销。', '🗑️', () => {
        appState.promptUsage = {};
        _savePromptUsage();
        if (appState.selectedCategoryId) _renderPromptList(appState.selectedCategoryId);
        _showNotification('使用记录已清空', 'success');
      });
    });
  }

  if (elements.refreshCacheInfoBtn) {
    elements.refreshCacheInfoBtn.addEventListener('click', refreshCacheInfo);
  }

  if (elements.clearCacheBtn) {
    elements.clearCacheBtn.addEventListener('click', async () => {
      const confirmed = await _showConfirm('清除缓存', '确定要清除所有缓存文件吗？这不会删除您的数据，但下次启动可能稍慢。', '⚠️');
      if (!confirmed) return;
      const success = await clearAllCache();
      if (success) {
        _showNotification('缓存已清除', 'success');
        refreshCacheInfo();
      } else {
        _showNotification('缓存清除失败', 'error');
      }
    });
  }

  if (elements.rccConnector) {
    elements.rccConnector.addEventListener('change', (e) => {
      if (elements.rccCustomConnector) {
        elements.rccCustomConnector.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
      }
      updateRightClickCopyPreview(elements);
    });
  }
  if (elements.rccCustomConnector) {
    elements.rccCustomConnector.addEventListener('input', () => updateRightClickCopyPreview(elements));
  }
  if (elements.rccIncludeOriginal) {
    elements.rccIncludeOriginal.addEventListener('change', () => updateRightClickCopyPreview(elements));
  }
  if (elements.rccIncludeTranslation) {
    elements.rccIncludeTranslation.addEventListener('change', () => updateRightClickCopyPreview(elements));
  }
  if (elements.rccAppendConnector) {
    elements.rccAppendConnector.addEventListener('change', () => updateRightClickCopyPreview(elements));
  }
  document.querySelectorAll('input[name="rcc-order"]').forEach(radio => {
    radio.addEventListener('change', () => updateRightClickCopyPreview(elements));
  });

  // 布局自定义事件绑定
  if (elements.layoutCustomizeBtn) {
    elements.layoutCustomizeBtn.addEventListener('click', () => {
      elements.settingsModal.style.display = 'none';
      _enterLayoutEditMode();
    });
  }
  if (elements.layoutResetBtn) {
    elements.layoutResetBtn.addEventListener('click', () => {
      _resetLayoutToDefault();
      if (elements.layoutLockToggle) elements.layoutLockToggle.checked = false;
      _showNotification('已恢复默认布局', 'success');
    });
  }

  if (elements.exportShortcutInput) {
    elements.exportShortcutInput.addEventListener('focus', () => {
      elements.exportShortcutInput.value = '请按下组合键...';
    });
    elements.exportShortcutInput.addEventListener('keydown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.key === 'Escape') {
        elements.exportShortcutInput.value = appState.settings.exportShortcut || 'Ctrl+Shift+E';
        elements.exportShortcutInput.blur();
        return;
      }
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      if (e.metaKey) parts.push('Meta');
      const keyName = e.key;
      if (!['Control', 'Shift', 'Alt', 'Meta'].includes(keyName)) {
        let displayKey = keyName;
        if (keyName === ' ') displayKey = 'Space';
        else if (keyName.length === 1) displayKey = keyName.toUpperCase();
        parts.push(displayKey);
        if (parts.length >= 2) {
          elements.exportShortcutInput.value = parts.join('+');
          elements.exportShortcutInput.blur();
        }
      }
    });
    elements.exportShortcutInput.addEventListener('blur', () => {
      if (!elements.exportShortcutInput.value || elements.exportShortcutInput.value === '请按下组合键...') {
        elements.exportShortcutInput.value = appState.settings.exportShortcut || 'Ctrl+Shift+E';
      }
    });
  }
  if (elements.exportShortcutResetBtn) {
    elements.exportShortcutResetBtn.addEventListener('click', () => {
      if (elements.exportShortcutInput) {
        elements.exportShortcutInput.value = 'Ctrl+Shift+E';
        _showNotification('快捷键已重置为默认值 (Ctrl+Shift+E)', 'info');
      }
    });
  }
  if (elements.openPromptImagesFolderBtn) {
    elements.openPromptImagesFolderBtn.addEventListener('click', async () => {
      if (window.electronAPI && window.electronAPI.openPromptImagesFolder) {
        const result = await window.electronAPI.openPromptImagesFolder();
        if (!result.success) {
          _showNotification('打开文件夹失败: ' + (result.error || ''), 'error');
        }
      } else {
        _showNotification('当前环境不支持此功能', 'warning');
      }
    });
  }

  // 数据存储位置管理
  if (elements.changeDataDirectoryBtn) {
    elements.changeDataDirectoryBtn.addEventListener('click', handleChangeDataDirectory);
  }
  if (elements.openDataDirectoryBtn) {
    elements.openDataDirectoryBtn.addEventListener('click', handleOpenDataDirectory);
  }
  if (elements.resetDataDirectoryBtn) {
    elements.resetDataDirectoryBtn.addEventListener('click', handleResetDataDirectory);
  }
}

async function loadDataDirectoryInfo(elements) {
  if (!window.electronAPI || !window.electronAPI.getDataDirectory) return;
  if (!elements.dataDirectoryPath) return;

  try {
    const result = await window.electronAPI.getDataDirectory();
    if (!result.success) {
      elements.dataDirectoryPath.textContent = '获取失败';
      return;
    }

    elements.dataDirectoryPath.textContent = result.currentPath;

    if (elements.dataDirectoryMode) {
      let modeText = '';
      if (result.isPortable) {
        modeText = '（便携模式）';
        if (elements.changeDataDirectoryBtn) elements.changeDataDirectoryBtn.style.display = 'none';
        if (elements.resetDataDirectoryBtn) elements.resetDataDirectoryBtn.style.display = 'none';
      } else if (result.isCustom) {
        modeText = '（自定义位置）';
        if (elements.changeDataDirectoryBtn) elements.changeDataDirectoryBtn.style.display = '';
        if (elements.resetDataDirectoryBtn) elements.resetDataDirectoryBtn.style.display = '';
      } else {
        modeText = '（安装目录默认）';
        if (elements.changeDataDirectoryBtn) elements.changeDataDirectoryBtn.style.display = '';
        if (elements.resetDataDirectoryBtn) elements.resetDataDirectoryBtn.style.display = 'none';
      }
      elements.dataDirectoryMode.textContent = modeText;
    }
  } catch (e) {
    elements.dataDirectoryPath.textContent = '获取失败';
  }
}

async function handleChangeDataDirectory() {
  if (!window.electronAPI || !window.electronAPI.chooseDataDirectory) {
    _showNotification('当前环境不支持此功能', 'warning');
    return;
  }

  const confirmed = await _showConfirm(
    '更改数据存储位置',
    '将更改所有用户数据（分类、提示词、背景图、预览图、设置等）的存储位置。\n\n现有数据将自动迁移到新位置。此操作完成后应用将重启。\n\n是否继续？',
    '📁'
  );
  if (!confirmed) return;

  const chooseResult = await window.electronAPI.chooseDataDirectory();
  if (!chooseResult.success) {
    if (!chooseResult.canceled) {
      _showNotification('选择文件夹失败: ' + (chooseResult.error || ''), 'error');
    }
    return;
  }

  const selectedPath = chooseResult.path;
  // 在选定位置创建子目录
  const newDataPath = selectedPath + '\\Luo-fe提示词管理器';

  const confirmMigrate = await _showConfirm(
    '确认移动数据',
    `新位置: ${newDataPath}\n\n所有数据将从原位置移动到新位置，原位置的数据将被删除。\n\n点击确认开始移动并重启应用。`,
    '📦'
  );
  if (!confirmMigrate) return;

  _showNotification('正在移动数据，请稍候...', 'info');

  const setResult = await window.electronAPI.setDataDirectory(newDataPath);
  if (!setResult.success) {
    _showNotification('移动失败: ' + (setResult.error || ''), 'error');
    return;
  }

  let msg = `移动完成（${setResult.migrated} 项），应用将重启...`;
  if (setResult.failedToDelete > 0) {
    msg = `移动完成（${setResult.migrated} 项，${setResult.failedToDelete} 项原文件未能删除，可手动清理），应用将重启...`;
  }
  _showNotification(msg, 'success');

  // 延迟一下让用户看到通知，然后重启
  setTimeout(async () => {
    if (window.electronAPI && window.electronAPI.relaunchApp) {
      await window.electronAPI.relaunchApp();
    }
  }, 1500);
}

async function handleOpenDataDirectory() {
  if (!window.electronAPI || !window.electronAPI.openDataDirectory) {
    _showNotification('当前环境不支持此功能', 'warning');
    return;
  }

  const result = await window.electronAPI.openDataDirectory();
  if (!result.success) {
    _showNotification('打开文件夹失败: ' + (result.error || ''), 'error');
  }
}

async function handleResetDataDirectory() {
  if (!window.electronAPI || !window.electronAPI.resetDataDirectory) {
    _showNotification('当前环境不支持此功能', 'warning');
    return;
  }

  const confirmed = await _showConfirm(
    '恢复默认数据位置',
    '将恢复使用系统默认位置（C 盘）存储数据。\n\n现有自定义位置的数据不会被删除，但应用将不再使用它们。\n\n应用将重启以应用更改。是否继续？',
    '🔄'
  );
  if (!confirmed) return;

  const result = await window.electronAPI.resetDataDirectory();
  if (!result.success) {
    _showNotification('恢复失败: ' + (result.error || ''), 'error');
    return;
  }

  _showNotification('已恢复默认位置，应用将重启...', 'success');
  setTimeout(async () => {
    if (window.electronAPI && window.electronAPI.relaunchApp) {
      await window.electronAPI.relaunchApp();
    }
  }, 1500);
}

async function refreshCacheInfo() {
  const cacheInfoEl = document.getElementById('cache-info');
  if (!cacheInfoEl) return;

  if (!isCacheAvailable()) {
    cacheInfoEl.innerHTML = '<span class="cache-label">缓存状态:</span> <span class="cache-value">不可用（非Electron环境）</span>';
    return;
  }

  const info = await getCacheInfo();
  if (!info) {
    cacheInfoEl.innerHTML = '<span class="cache-label">缓存状态:</span> <span class="cache-value">获取失败</span>';
    return;
  }

  const cacheSizeMB = (info.totalSize / 1024).toFixed(1);
  const dataSizeMB = (info.dataDirSize / 1024 / 1024).toFixed(2);
  const fileCount = info.cacheFiles.length;

  cacheInfoEl.innerHTML = '';
  const lines = [
    { label: '缓存文件数', value: `${fileCount} 个` },
    { label: '缓存大小', value: `${cacheSizeMB} KB` },
    { label: '数据目录总大小', value: `${dataSizeMB} MB` },
    { label: '缓存位置', value: '应用程序目录/data/cache' }
  ];
  lines.forEach(line => {
    const div = document.createElement('div');
    const labelSpan = document.createElement('span');
    labelSpan.className = 'cache-label';
    labelSpan.textContent = line.label + ':';
    const valueSpan = document.createElement('span');
    valueSpan.className = 'cache-value';
    valueSpan.textContent = line.value;
    div.appendChild(labelSpan);
    div.appendChild(document.createTextNode(' '));
    div.appendChild(valueSpan);
    cacheInfoEl.appendChild(div);
  });
}
