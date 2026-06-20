import { appState, saveSettingsToStorage, savePromptUsage } from './state.js';
import { BG_IMAGE_MAX_SIZE } from './constants.js';
import { getCacheInfo, clearAllCache, isCacheAvailable } from './cache.js';
import { parseCsvLine } from './utils.js';

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
  updateBgPreview(elements);
  elements.settingsModal.style.display = 'block';
  refreshCacheInfo();
}

function loadRightClickCopySettings(elements) {
  const config = appState.settings.rightClickCopyConfig || {
    includeOriginal: true, includeTranslation: true, connector: ', ', order: 'original-first'
  };
  if (elements.rccIncludeOriginal) elements.rccIncludeOriginal.checked = config.includeOriginal !== false;
  if (elements.rccIncludeTranslation) elements.rccIncludeTranslation.checked = config.includeTranslation !== false;
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
    order: orderRadio ? orderRadio.value : 'original-first'
  };
}

export function saveSettings(elements) {
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
  saveSettingsToStorage();
  _applyBackgroundSettings();
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
    try {
      localStorage.setItem('aiPromptToolBgCache', appState.bgImageData || '');
    } catch (e) {
      console.warn('bgCache save failed:', e);
    }
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
  try {
    localStorage.removeItem('aiPromptToolBgCache');
  } catch (e) {
    console.warn('bgCache clear failed:', e);
  }
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
      try {
        localStorage.setItem('aiPromptToolBgCache', result.data);
      } catch (e) {
        console.warn('bgCache save failed:', e);
      }
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
  elements.exportAllDataBtn.addEventListener('click', () => {
    const data = {
      categories: appState.categories,
      settings: appState.settings,
      translations: appState.translations,
      promptUsage: appState.promptUsage,
      selectedPrompts: appState.selectedPrompts,
      nextCategoryId: appState.nextCategoryId,
      bgImageData: appState.bgImageData || null,
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
          let category = appState.categories.find(c => c.name === catName);
          if (!category) {
            category = {
              id: `custom_${appState.nextCategoryId++}`,
              name: catName,
              prompts: []
            };
            appState.categories.push(category);
          }
          if (!category.prompts.some(p => (typeof p === 'object' && p !== null ? p.text : String(p)) === promptText)) {
            category.prompts.push({ text: promptText, translation });
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
  document.querySelectorAll('input[name="rcc-order"]').forEach(radio => {
    radio.addEventListener('change', () => updateRightClickCopyPreview(elements));
  });

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
