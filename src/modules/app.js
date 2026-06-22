import { appState, loadData, loadDataFromCache, saveData, saveDataImmediate, loadSettings, loadSettingsFromCache, saveSettingsToStorage, loadTranslations, loadTranslationsFromCache, saveTranslations, loadPromptUsage, loadUsageFromCache, savePromptUsage, recordPromptUsage, getFrequentPrompts, setNotificationHandler } from './state.js';
import { DEFAULT_CATEGORIES, EXAMPLES, DATA_VERSION } from './constants.js';
import { getPromptText, getPromptTranslation, getCategoryById, findPromptInCategory, findPromptIndex, debounce } from './utils.js';
import { addCategory, addCategories, editCategory, deleteCategory, batchDeleteCategories, moveCategoryUp, moveCategoryDown, addPrompt, editPrompt, deletePrompt, batchImportPrompts, togglePrompt, selectAllPrompts, deselectAllPrompts, clearAllSelectedPrompts, isPromptSelected, isPromptSelectedByText, updatePromptTranslation, syncSelectedPromptsTranslations, cleanDuplicatePrompts, setDialogHandlers as setDataDialogHandlers } from './data.js';
import { translateText, translateAllPrompts, setTranslateHandlers, setTranslateAllProgressCallback, getFallbackTranslation } from './translate.js';
import { initSearch, initSearchEvents, handleSearch } from './search.js';
import { initBatch, toggleBatchMode, exitBatchMode, updateBatchInfo, batchDeletePrompts, batchMovePrompts, performBatchMove, batchEditPrompts, initBatchEvents } from './batch.js';
import { initSettings, openSettingsModal, saveSettings, handleBgImageUpload, clearBgImage, loadBgImageFromFile, updateBgPreview, applyBackgroundSettings, toggleBgClarityMode, applyBgClarityMode, bindSettingsEvents } from './settings.js';
import { initRender, cacheElements, elements, renderCategoryList, renderCustomCategoryList, renderPromptList, renderFrequentPrompts, renderSelectedPrompts, renderPreview, renderRandomCategorySelector, renderExamples, showNotification, showConfirmDialog, showInputDialog, renderCategoryPromptsList, toggleCategoryBatchMode, exitCategoryBatchMode, categoryBatchDelete } from './render.js';
import { initEvents, bindEvents, bindSettingsEvents as bindSettingsEventsFromEvents, initSearchEvents as bindSearchEvents, initBatchEvents as bindBatchEvents, initSortEvents, initPreviewPanelResize } from './events.js';

function selectCategory(categoryId) {
  appState.selectedCategoryId = categoryId;
  renderCategoryList();
  renderPromptList(categoryId);
  if (window.innerWidth <= 768) {
    const categoryPanel = document.querySelector('.category-panel');
    if (categoryPanel) categoryPanel.classList.remove('active');
    const overlay = document.querySelector('.overlay');
    if (overlay) overlay.classList.remove('active');
  }
}

function generateRandomPrompts() {
  const selectedIds = [...document.querySelectorAll('#random-category-selector input[type="checkbox"]:checked')].map(cb => cb.value);
  if (selectedIds.length === 0) {
    showRandomResult('请至少选择一个类别', 'error');
    return;
  }

  const generated = {};
  const allPrompts = [];
  selectedIds.forEach(categoryId => {
    const category = getCategoryById(appState.categories, categoryId);
    if (category && category.prompts.length > 0) {
      const rp = category.prompts[Math.floor(Math.random() * category.prompts.length)];
      const obj = typeof rp === 'object' && rp !== null ? { ...rp } : { text: String(rp), translation: '' };
      if (!generated[categoryId]) generated[categoryId] = [];
      generated[categoryId].push(obj);
      allPrompts.push(obj);
    }
  });

  if (allPrompts.length === 0) {
    showRandomResult('所选类别中没有可用的提示词', 'error');
    return;
  }

  Object.keys(generated).forEach(categoryId => {
    if (!appState.selectedPrompts[categoryId]) {
      appState.selectedPrompts[categoryId] = generated[categoryId];
    } else {
      const existingTexts = new Set(appState.selectedPrompts[categoryId].map(p => getPromptText(p)));
      generated[categoryId].forEach(p => {
        if (!existingTexts.has(getPromptText(p))) appState.selectedPrompts[categoryId].push(p);
      });
    }
  });

  renderSelectedPrompts();
  renderPreview();
  saveData();
  showRandomResult(`成功生成 ${allPrompts.length} 个提示词`, 'success', allPrompts.map(p => getPromptText(p)).join(', '));
}

function showRandomResult(message, type, promptText = '') {
  const result = document.getElementById('random-result');
  if (!result) return;
  result.innerHTML = '';
  const msgP = document.createElement('p');
  msgP.className = type;
  msgP.textContent = message;
  result.appendChild(msgP);
  if (promptText) {
    const div = document.createElement('div');
    div.className = 'generated-prompt';
    div.textContent = `"${promptText}"`;
    result.appendChild(div);
  }
}

function applyExample(example) {
  appState.selectedPrompts = {};
  Object.keys(example.combinations).forEach(categoryId => {
    const category = getCategoryById(appState.categories, categoryId);
    if (!category) return;
    appState.selectedPrompts[categoryId] = [];
    example.combinations[categoryId].forEach(promptText => {
      const found = category.prompts.find(p => getPromptText(p) === promptText);
      appState.selectedPrompts[categoryId].push(found && typeof found === 'object' ? { ...found } : { text: promptText, translation: '' });
    });
  });
  renderPromptList();
  renderSelectedPrompts();
  renderPreview();
  saveData();
  showNotification('示例已应用');
}

function openExportModal() {
  const count = getSelectedPromptsCount();
  if (count === 0) {
    showNotification('请先选择提示词', 'warning');
    return;
  }
  const delimiterOption = document.getElementById('delimiter-option');
  const checkedFormat = document.querySelector('input[name="export-format"]:checked');
  if (delimiterOption && checkedFormat) {
    delimiterOption.style.display = checkedFormat.value === 'text' ? 'block' : 'none';
  }
  updateExportPreview();
  elements.exportModal.style.display = 'block';
}

function getSelectedPromptsCount() {
  return Object.values(appState.selectedPrompts).flat().length;
}

function updateExportPreview() {
  const checkedRadio = document.querySelector('input[name="export-format"]:checked');
  const format = checkedRadio ? checkedRadio.value : 'txt';
  let preview = '';
  switch (format) {
    case 'text': preview = getAllSelectedPrompts().join(getDelimiter()); break;
    case 'json': preview = JSON.stringify(getSelectedPromptsAsObject(), null, 2); break;
    case 'markdown': preview = generateMarkdownOutput(); break;
    case 'csv': preview = generateCsvOutput(); break;
  }
  elements.exportPreview.value = preview;
}

function getDelimiter() {
  const sel = document.getElementById('delimiter').value;
  if (sel === 'custom') return document.getElementById('custom-delimiter').value || ', ';
  if (sel === ',') return ', ';
  if (sel === '\n') return '\n';
  return sel;
}

function getAllSelectedPrompts() {
  const prompts = [];
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    appState.selectedPrompts[categoryId].forEach(p => prompts.push(getPromptText(p)));
  });
  return prompts;
}

function getSelectedPromptsAsObject() {
  const result = {};
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = getCategoryById(appState.categories, categoryId);
    if (category) result[category.name] = appState.selectedPrompts[categoryId];
  });
  return result;
}

function generateMarkdownOutput() {
  let md = '# AI文生图提示词\n\n';
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = getCategoryById(appState.categories, categoryId);
    if (!category) return;
    md += `## ${category.name}\n\n`;
    appState.selectedPrompts[categoryId].forEach(p => { md += `- ${getPromptText(p)}\n`; });
    md += '\n';
  });
  md += '## 组合提示词\n\n';
  md += `"${getAllSelectedPrompts().join(', ')}"`;
  return md;
}

function generateCsvOutput() {
  const escapeCsv = (str) => '"' + String(str).replace(/"/g, '""') + '"';
  let csv = '分类,提示词,翻译\n';
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = getCategoryById(appState.categories, categoryId);
    if (!category) return;
    appState.selectedPrompts[categoryId].forEach(p => {
      csv += [escapeCsv(category.name), escapeCsv(getPromptText(p)), escapeCsv(getPromptTranslation(p))].join(',') + '\n';
    });
  });
  return csv;
}

function copyToClipboard() {
  const text = elements.exportPreview.value;
  if (!text) { showNotification('没有可复制的内容', 'warning'); return; }

  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    appState.selectedPrompts[categoryId].forEach(p => {
      recordPromptUsage(categoryId, getPromptText(p));
    });
  });

  if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);

  navigator.clipboard.writeText(text)
    .then(() => showNotification('已复制到剪贴板'))
    .catch(() => showNotification('复制失败，请手动复制', 'error'));
}

function downloadFile() {
  const text = elements.exportPreview.value;
  if (!text) { showNotification('没有可下载的内容', 'warning'); return; }

  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    appState.selectedPrompts[categoryId].forEach(p => {
      recordPromptUsage(categoryId, getPromptText(p));
    });
  });

  if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);

  const checkedRadio = document.querySelector('input[name="export-format"]:checked');
  const format = checkedRadio ? checkedRadio.value : 'txt';
  let filename = 'ai-prompt-combination', mimeType = 'text/plain';
  if (format === 'json') { filename += '.json'; mimeType = 'application/json'; }
  else if (format === 'markdown') { filename += '.md'; mimeType = 'text/markdown'; }
  else if (format === 'csv') { filename += '.csv'; mimeType = 'text/csv;charset=utf-8'; }
  else filename += '.txt';
  const content = format === 'csv' ? '\uFEFF' + text : text;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification(`文件 "${filename}" 已下载`);
}

function openPromptModal(categoryId) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  elements.promptModalTitle.textContent = `${category.name} - 提示词管理`;
  renderCategoryPromptsList(categoryId);
  elements.promptModal.style.display = 'block';
  elements.promptModal.dataset.categoryId = categoryId;
}

function sortPrompts(order) {
  const categoryId = elements.promptModal.dataset.categoryId;
  if (!categoryId) return;
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  category.prompts.sort((a, b) => {
    const ta = getPromptText(a).toLowerCase();
    const tb = getPromptText(b).toLowerCase();
    return order === 'az' ? ta.localeCompare(tb) : tb.localeCompare(ta);
  });
  renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) renderPromptList(categoryId);
  saveData();
  showNotification(order === 'az' ? '已按A-Z排序' : '已按Z-A排序', 'success');
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function migrateData() {
  // 已迁移过的数据跳过，避免每次启动都遍历
  if (appState.dataVersion === DATA_VERSION) return;
  let hasChanges = false;
  for (const category of appState.categories) {
    const defaultCategory = DEFAULT_CATEGORIES.find(dc => dc.id === category.id);
    for (let i = 0; i < category.prompts.length; i++) {
      const prompt = category.prompts[i];
      if (typeof prompt === 'string') {
        let translation = '';
        if (defaultCategory) {
          const dp = defaultCategory.prompts.find(d => d.text === prompt);
          if (dp) translation = dp.translation;
        }
        if (!translation) translation = getFallbackTranslation(prompt) || '';
        category.prompts[i] = { text: prompt, translation };
        hasChanges = true;
      } else if (typeof prompt === 'object' && prompt !== null && (!prompt.translation || prompt.translation === '')) {
        let translation = '';
        if (defaultCategory) {
          const dp = defaultCategory.prompts.find(d => d.text === prompt.text);
          if (dp) translation = dp.translation;
        }
        if (!translation) translation = getFallbackTranslation(prompt.text) || '';
        if (translation) { prompt.translation = translation; hasChanges = true; }
      }
    }
  }
  appState.dataVersion = DATA_VERSION;
  if (hasChanges) saveData();
}

async function exportAllDataShortcut() {
  const target = appState.settings.exportShortcutTarget || 'clipboard';
  const selectedCount = getSelectedPromptsCount();

  if (selectedCount === 0) {
    showNotification('请先选择提示词', 'warning');
    return;
  }

  const selectedTexts = getAllSelectedPrompts();

  // 记录使用频率，与 copyToClipboard/downloadFile 保持一致
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    appState.selectedPrompts[categoryId].forEach(p => {
      recordPromptUsage(categoryId, getPromptText(p));
    });
  });
  if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);

  if (target === 'clipboard') {
    const text = selectedTexts.join(', ');
    try {
      await navigator.clipboard.writeText(text);
      showNotification(`已复制 ${selectedCount} 个提示词到剪贴板`, 'success');
    } catch (err) {
      showNotification('复制失败', 'error');
    }
    return;
  }

  let content = '';
  let defaultName = '';

  if (target === 'csv') {
    content = '\uFEFF' + generateCsvOutput();
    defaultName = `ai-prompt-combination-${new Date().toISOString().slice(0, 10)}.csv`;
  } else if (target === 'markdown') {
    content = generateMarkdownOutput();
    defaultName = `ai-prompt-combination-${new Date().toISOString().slice(0, 10)}.md`;
  } else if (target === 'js') {
    content = '// AI文生图提示词导出\n';
    content += '// 导出时间: ' + new Date().toISOString() + '\n';
    content += 'const prompts = ' + JSON.stringify(getSelectedPromptsAsObject(), null, 2) + ';\n\n';
    content += '// 组合提示词\n';
    content += 'const combinedPrompt = "' + selectedTexts.join(', ') + '";\n';
    defaultName = `ai-prompt-combination-${new Date().toISOString().slice(0, 10)}.js`;
  }

  if (window.electronAPI && window.electronAPI.saveExportFile) {
    const result = await window.electronAPI.saveExportFile(defaultName, content);
    if (result.success) {
      showNotification(`已导出 ${selectedCount} 个提示词到: ${result.filePath}`, 'success');
    } else if (!result.canceled) {
      showNotification('导出失败: ' + (result.error || '未知错误'), 'error');
    }
  } else {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = defaultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification(`文件 "${defaultName}" 已下载`, 'success');
  }
}

function parseShortcut(shortcutStr) {
  if (!shortcutStr) return null;
  const parts = shortcutStr.split('+').map(p => p.trim());
  const key = parts[parts.length - 1];
  return {
    ctrl: parts.includes('Ctrl'),
    shift: parts.includes('Shift'),
    alt: parts.includes('Alt'),
    meta: parts.includes('Meta'),
    key: key === 'Space' ? ' ' : (key.length === 1 ? key.toLowerCase() : key)
  };
}

function matchShortcut(e, shortcut) {
  if (!shortcut) return false;
  const eKey = e.key === 'Space' ? ' ' : e.key;
  const keyMatch = eKey.length === 1
    ? eKey.toLowerCase() === shortcut.key
    : eKey === shortcut.key;
  return keyMatch && e.ctrlKey === shortcut.ctrl && e.shiftKey === shortcut.shift && e.altKey === shortcut.alt && e.metaKey === shortcut.meta;
}

async function initApp() {
  const cacheStart = performance.now();
  let usedCache = false;

  try {
    // 并行加载所有缓存数据，减少串行 IPC 往返延迟
    const [dataLoaded, settingsLoaded, translationsLoaded, usageLoaded] = await Promise.all([
      loadDataFromCache(),
      loadSettingsFromCache(),
      loadTranslationsFromCache(),
      loadUsageFromCache()
    ]);

    if (dataLoaded && settingsLoaded && translationsLoaded && usageLoaded) {
      usedCache = true;
    } else {
      // 部分缓存缺失时回退到 localStorage
      if (!dataLoaded) loadData();
      if (!translationsLoaded) loadTranslations();
      if (!settingsLoaded) loadSettings();
      if (!usageLoaded) loadPromptUsage();
    }
  } catch (error) {
    console.error('Cache load failed, falling back to localStorage:', error);
    loadData();
    loadTranslations();
    loadSettings();
    loadPromptUsage();
  }

  if (!appState.categories || appState.categories.length === 0) {
    appState.categories = JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
    if (!appState.selectedPrompts) appState.selectedPrompts = {};
    if (!appState.nextCategoryId) appState.nextCategoryId = 1;
    saveData();
  }

  const cacheEnd = performance.now();
  console.log(`[启动] 数据加载耗时: ${(cacheEnd - cacheStart).toFixed(1)}ms (${usedCache ? '文件缓存' : 'localStorage'})`);

  cacheElements();

  setNotificationHandler(showNotification);
  setDataDialogHandlers({ showConfirm: showConfirmDialog, showInput: showInputDialog, showNotification, translateText,
    renderCategoryPromptsList, renderPromptList, renderSelectedPrompts, renderPreview, renderCategoryList,
    renderRandomCategorySelector, renderCustomCategoryList });
  setTranslateHandlers({ syncSelectedPromptsTranslations, saveData, showNotification });

  setTranslateAllProgressCallback((total, failed, skipped, totalTasks) => {
    if (totalTasks <= 0) return;
    const percent = Math.round(((total + failed) / totalTasks) * 100);
    showNotification(`翻译进度: ${percent}% (${total + failed}/${totalTasks})`, 'info');
  });

  initRender({
    togglePrompt, isPromptSelected, recordPromptUsage, selectCategory,
    editCategory, deleteCategory, batchDeleteCategories, moveCategoryUp, moveCategoryDown,
    openPromptModal, addPrompt, editPrompt,
    deletePrompt, batchImportPrompts, saveData, translateText,
    updatePromptTranslation, renderPromptList, renderSelectedPrompts,
    renderPreview, applyExample, showConfirmDialog, showInputDialog,
    getFrequentPrompts
  });

  initSearch(elements, {
    togglePrompt, isPromptSelected, recordPromptUsage, renderPromptList, getCategoryById: (id) => getCategoryById(appState.categories, id),
    renderSelectedPrompts, renderPreview, saveData
  });

  initBatch({
    showConfirm: showConfirmDialog, showInput: showInputDialog, showNotification,
    renderCategoryList, renderPromptList, renderSelectedPrompts, renderPreview, saveData
  });

  initSettings({
    showNotification, applyBackgroundSettings, applyBgClarityMode,
    renderPromptList, renderSelectedPrompts, renderCategoryList,
    renderRandomCategorySelector, saveData,
    showConfirm: showConfirmDialog, savePromptUsage,
    getElements: () => elements
  });

  initEvents(elements, {
    addCategory, addCategories, editCategory, deleteCategory, batchDeleteCategories,
    moveCategoryUp, moveCategoryDown,
    openPromptModal, addPrompt, batchImportPrompts,
    selectAllPrompts, deselectAllPrompts, clearAllSelectedPrompts,
    generateRandomPrompts, openExportModal, updateExportPreview,
    copyToClipboard, downloadFile, closeModal, openSettingsModal: () => openSettingsModal(elements),
    translateAllPrompts, showNotification, renderCustomCategoryList,
    sortPrompts, selectCategory, renderCategoryList, renderPromptList: () => renderPromptList(appState.selectedCategoryId),
    renderSelectedPrompts, renderPreview, saveData,
    toggleCategoryBatchMode, exitCategoryBatchMode, categoryBatchDelete
  });

  renderCategoryList();
  renderRandomCategorySelector();
  bindEvents();
  bindSettingsEventsFromEvents();
  applyBackgroundSettings(elements);
  applyBgClarityMode();

  // 关键路径完成，记录渲染初始化耗时
  const renderEnd = performance.now();
  console.log(`[启动] 渲染初始化耗时: ${(renderEnd - cacheEnd).toFixed(1)}ms`);

  // 非关键初始化延迟到空闲时执行，不阻塞首屏交互
  const deferredInit = () => {
    renderExamples();
    initPreviewPanelResize();
    bindSearchEvents();
    bindBatchEvents();
    initSortEvents();

    migrateData();
    loadBgImageFromFile().then(() => {
      applyBackgroundSettings(elements);
    });
  };

  if (window.requestIdleCallback) {
    requestIdleCallback(deferredInit, { timeout: 1000 });
  } else {
    setTimeout(deferredInit, 50);
  }

  if (elements.rightClickCopyEnabled) {
    elements.rightClickCopyEnabled.checked = appState.settings.rightClickCopyEnabled || false;
    elements.rightClickCopyEnabled.addEventListener('change', (e) => {
      appState.settings.rightClickCopyEnabled = e.target.checked;
      saveSettingsToStorage();
      if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
      showNotification(e.target.checked ? '右键复制已开启' : '右键复制已关闭', 'success');
    });
  }

  document.addEventListener('keydown', (e) => {
    const target = e.target;
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
    const shortcutStr = appState.settings.exportShortcut || 'Ctrl+Shift+E';
    const shortcut = parseShortcut(shortcutStr);
    if (shortcut && matchShortcut(e, shortcut)) {
      e.preventDefault();
      exportAllDataShortcut().catch(err => console.error('Export shortcut error:', err));
    }
  });

  const initEnd = performance.now();
  console.log(`[启动] 总初始化耗时: ${(initEnd - cacheStart).toFixed(1)}ms`);
}

export { initApp };
