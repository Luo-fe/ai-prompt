import { appState, saveData, saveDataImmediate, saveSettingsToStorage, saveTranslations, recordPromptUsage } from './state.js';
import { getPromptText, getPromptTranslation, getCategoryById, findPromptInCategory, findPromptIndex, iterateBatchSelected, createPromptKey } from './utils.js';

let _translateText = async () => '';
let _showConfirm = async () => false;
let _showInput = async () => null;
let _showNotification = () => {};
let _renderCategoryPromptsList = () => {};
let _renderPromptList = () => {};
let _renderSelectedPrompts = () => {};
let _renderPreview = () => {};
let _renderCategoryList = () => {};
let _renderRandomCategorySelector = () => {};
let _renderCustomCategoryList = () => {};

export function setDialogHandlers(handlers) {
  if (handlers.showConfirm) _showConfirm = handlers.showConfirm;
  if (handlers.showInput) _showInput = handlers.showInput;
  if (handlers.showNotification) _showNotification = handlers.showNotification;
  if (handlers.translateText) _translateText = handlers.translateText;
  if (handlers.renderCategoryPromptsList) _renderCategoryPromptsList = handlers.renderCategoryPromptsList;
  if (handlers.renderPromptList) _renderPromptList = handlers.renderPromptList;
  if (handlers.renderSelectedPrompts) _renderSelectedPrompts = handlers.renderSelectedPrompts;
  if (handlers.renderPreview) _renderPreview = handlers.renderPreview;
  if (handlers.renderCategoryList) _renderCategoryList = handlers.renderCategoryList;
  if (handlers.renderRandomCategorySelector) _renderRandomCategorySelector = handlers.renderRandomCategorySelector;
  if (handlers.renderCustomCategoryList) _renderCustomCategoryList = handlers.renderCustomCategoryList;
}

export function addCategory(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const duplicate = appState.categories.some(cat => cat.name === trimmed);
  if (duplicate) {
    _showNotification('分类名称已存在', 'warning');
    return null;
  }
  const newCategory = {
    id: `custom_${appState.nextCategoryId++}`,
    name: trimmed,
    prompts: []
  };
  appState.categories.push(newCategory);
  saveData();
  _renderCategoryList();
  _renderRandomCategorySelector();
  _renderCustomCategoryList();
  _showNotification(`已添加分类: ${trimmed}`, 'success');
  return newCategory;
}

export function addCategories(names) {
  const added = [];
  for (const name of names) {
    const trimmed = name.trim();
    if (!trimmed) continue;
    const duplicate = appState.categories.some(cat => cat.name === trimmed);
    if (duplicate) continue;
    const newCategory = {
      id: `custom_${appState.nextCategoryId++}`,
      name: trimmed,
      prompts: []
    };
    appState.categories.push(newCategory);
    added.push(newCategory);
  }
  if (added.length > 0) {
    saveData();
    _renderCategoryList();
    _renderRandomCategorySelector();
    _renderCustomCategoryList();
    _showNotification(`已批量添加 ${added.length} 个分类`, 'success');
  }
  return added;
}

export async function editCategory(categoryId) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  const newName = await _showInput('编辑分类名称', category.name);
  if (newName === null) return;
  const trimmed = newName.trim();
  if (!trimmed) {
    _showNotification('分类名称不能为空', 'warning');
    return;
  }
  const duplicate = appState.categories.some(cat => cat.id !== categoryId && cat.name === trimmed);
  if (duplicate) {
    _showNotification('分类名称已存在', 'warning');
    return;
  }
  category.name = trimmed;
  saveData();
  _renderCategoryList();
  _renderRandomCategorySelector();
  _renderCustomCategoryList();
  _showNotification('分类名称已更新', 'success');
}

export async function deleteCategory(categoryId) {
  const confirmed = await _showConfirm('删除分类', '确定要删除此分类及其所有提示词吗？', '⚠️');
  if (!confirmed) return;
  delete appState.selectedPrompts[categoryId];
  appState.categories = appState.categories.filter(cat => cat.id !== categoryId);
  if (appState.selectedCategoryId === categoryId) {
    appState.selectedCategoryId = appState.categories.length > 0 ? appState.categories[0].id : null;
  }
  saveData();
  _renderCategoryList();
  _renderRandomCategorySelector();
  _renderCustomCategoryList();
  if (appState.selectedCategoryId) _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
  _renderPreview();
  _showNotification('分类已删除', 'success');
}

export async function batchDeleteCategories(categoryIds) {
  if (!categoryIds || categoryIds.length === 0) {
    _showNotification('请选择要删除的分类', 'warning');
    return;
  }
  const confirmed = await _showConfirm('批量删除分类', `确定要删除选中的 ${categoryIds.length} 个分类及其所有提示词吗？`, '⚠️');
  if (!confirmed) return;
  for (const id of categoryIds) {
    delete appState.selectedPrompts[id];
  }
  appState.categories = appState.categories.filter(cat => !categoryIds.includes(cat.id));
  if (categoryIds.includes(appState.selectedCategoryId)) {
    appState.selectedCategoryId = appState.categories.length > 0 ? appState.categories[0].id : null;
  }
  saveData();
  _renderCategoryList();
  _renderRandomCategorySelector();
  _renderCustomCategoryList();
  if (appState.selectedCategoryId) _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
  _renderPreview();
  _showNotification(`已删除 ${categoryIds.length} 个分类`, 'success');
}

export function moveCategoryUp(categoryId) {
  const idx = appState.categories.findIndex(cat => cat.id === categoryId);
  if (idx <= 0) return;
  [appState.categories[idx - 1], appState.categories[idx]] = [appState.categories[idx], appState.categories[idx - 1]];
  saveData();
  _renderCategoryList();
  _renderRandomCategorySelector();
}

export function moveCategoryDown(categoryId) {
  const idx = appState.categories.findIndex(cat => cat.id === categoryId);
  if (idx < 0 || idx >= appState.categories.length - 1) return;
  [appState.categories[idx], appState.categories[idx + 1]] = [appState.categories[idx + 1], appState.categories[idx]];
  saveData();
  _renderCategoryList();
  _renderRandomCategorySelector();
}

export async function addPrompt(categoryId, promptText) {
  const trimmed = promptText.trim();
  if (!trimmed) return;
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  const existing = findPromptInCategory(category, trimmed);
  if (existing) {
    _showNotification('提示词已存在', 'warning');
    return;
  }
  let translation = '';
  const cached = appState.translations[trimmed];
  if (cached) {
    translation = typeof cached === 'string' ? cached : (cached.text || '');
  }
  if (appState.settings.autoTranslateNewWords && !translation) {
    try {
      translation = await _translateText(trimmed);
    } catch (e) {
      translation = '';
    }
  }
  category.prompts.push({ text: trimmed, translation });
  saveData();
  _showNotification(`已添加提示词: ${trimmed}`, 'success');
  _renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) _renderPromptList(categoryId);
}

export async function editPrompt(categoryId, index) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category || index < 0 || index >= category.prompts.length) return;
  const prompt = category.prompts[index];
  const currentText = getPromptText(prompt);
  const newText = await _showInput('编辑提示词', currentText);
  if (newText === null) return;
  const trimmed = newText.trim();
  if (!trimmed) {
    _showNotification('提示词不能为空', 'warning');
    return;
  }
  if (trimmed === currentText) return;
  const duplicate = findPromptInCategory(category, trimmed);
  if (duplicate) {
    _showNotification('提示词已存在', 'warning');
    return;
  }
  let translation = getPromptTranslation(prompt);
  try {
    translation = await _translateText(trimmed);
  } catch (e) {}
  category.prompts[index] = { text: trimmed, translation };
  const selectedArr = appState.selectedPrompts[categoryId];
  if (selectedArr) {
    const selIdx = selectedArr.findIndex(p => getPromptText(p) === currentText);
    if (selIdx !== -1) {
      selectedArr[selIdx] = { text: trimmed, translation };
    }
  }
  saveData();
  _renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) _renderPromptList(categoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export async function deletePrompt(categoryId, index) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category || index < 0 || index >= category.prompts.length) return;
  const confirmed = await _showConfirm('删除提示词', '确定要删除此提示词吗？', '⚠️');
  if (!confirmed) return;
  const removed = category.prompts.splice(index, 1)[0];
  const removedText = getPromptText(removed);
  const selectedArr = appState.selectedPrompts[categoryId];
  if (selectedArr) {
    const selIdx = selectedArr.findIndex(p => getPromptText(p) === removedText);
    if (selIdx !== -1) {
      selectedArr.splice(selIdx, 1);
    }
  }
  saveData();
  _renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) _renderPromptList(categoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export async function batchImportPrompts(categoryId, text) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const existingTexts = new Set(category.prompts.map(p => getPromptText(p).toLowerCase()));
  const newLines = lines.filter(l => !existingTexts.has(l.toLowerCase()));
  if (newLines.length === 0) {
    _showNotification('没有新的提示词可导入', 'info');
    return;
  }
  let translatedPrompts;
  if (appState.settings.autoTranslateNewWords) {
    const results = await Promise.allSettled(newLines.map(line => _translateText(line)));
    translatedPrompts = newLines.map((line, i) => {
      const result = results[i];
      const translation = result.status === 'fulfilled' ? result.value : '';
      return { text: line, translation };
    });
  } else {
    translatedPrompts = newLines.map(line => ({ text: line, translation: '' }));
  }
  category.prompts.push(...translatedPrompts);
  saveData();
  _renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) _renderPromptList(categoryId);
  _showNotification(`成功导入 ${translatedPrompts.length} 个提示词`, 'success');
}

export function togglePrompt(categoryId, prompt) {
  const text = getPromptText(prompt);
  const translation = getPromptTranslation(prompt);
  if (!appState.selectedPrompts[categoryId]) {
    appState.selectedPrompts[categoryId] = [];
  }
  const selectedArr = appState.selectedPrompts[categoryId];
  const idx = selectedArr.findIndex(p => getPromptText(p) === text);
  if (idx === -1) {
    selectedArr.push({ text, translation });
  } else {
    selectedArr.splice(idx, 1);
  }
  saveData();
  _renderSelectedPrompts();
  _renderPreview();
}

export function selectAllPrompts() {
  const categoryId = appState.selectedCategoryId;
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  appState.selectedPrompts[categoryId] = category.prompts.map(p => ({
    text: getPromptText(p),
    translation: getPromptTranslation(p)
  }));
  saveData();
  _renderPromptList(categoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export function deselectAllPrompts() {
  const categoryId = appState.selectedCategoryId;
  if (appState.selectedPrompts[categoryId]) {
    appState.selectedPrompts[categoryId] = [];
  }
  saveData();
  _renderPromptList(categoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export function clearAllSelectedPrompts() {
  appState.selectedPrompts = {};
  saveData();
  _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export function isPromptSelected(categoryId, prompt) {
  const selectedArr = appState.selectedPrompts[categoryId];
  if (!selectedArr) return false;
  const text = getPromptText(prompt);
  return selectedArr.some(p => getPromptText(p) === text);
}

export function isPromptSelectedByText(categoryId, text) {
  const selectedArr = appState.selectedPrompts[categoryId];
  if (!selectedArr) return false;
  return selectedArr.some(p => getPromptText(p) === text);
}

export function updatePromptTranslation(categoryId, promptText, newTranslation) {
  const category = getCategoryById(appState.categories, categoryId);
  if (category) {
    const prompt = findPromptInCategory(category, promptText);
    if (prompt) {
      prompt.translation = newTranslation;
    }
  }
  const selectedArr = appState.selectedPrompts[categoryId];
  if (selectedArr) {
    const selPrompt = selectedArr.find(p => getPromptText(p) === promptText);
    if (selPrompt) {
      selPrompt.translation = newTranslation;
    }
  }
  saveData();
}

export function syncSelectedPromptsTranslations() {
  for (const categoryId of Object.keys(appState.selectedPrompts)) {
    const category = getCategoryById(appState.categories, categoryId);
    if (!category) continue;
    const selectedArr = appState.selectedPrompts[categoryId];
    for (const selPrompt of selectedArr) {
      const catPrompt = findPromptInCategory(category, getPromptText(selPrompt));
      if (catPrompt) {
        selPrompt.translation = getPromptTranslation(catPrompt);
      }
    }
  }
  saveData();
}

export function cleanDuplicatePrompts() {
  for (const category of appState.categories) {
    const seen = new Set();
    category.prompts = category.prompts.filter(p => {
      const text = getPromptText(p).toLowerCase();
      if (seen.has(text)) return false;
      seen.add(text);
      return true;
    });
  }
  saveData();
}
