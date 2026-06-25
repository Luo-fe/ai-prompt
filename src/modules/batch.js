import { appState } from './state.js';
import { getPromptText, getPromptTranslation, getCategoryById, findPromptIndex, iterateBatchSelected } from './utils.js';

let _showConfirm = async () => false;
let _showInput = async () => null;
let _showNotification = () => {};
let _renderCategoryList = () => {};
let _renderPromptList = () => {};
let _renderSelectedPrompts = () => {};
let _renderPreview = () => {};
let _saveData = () => {};

export function initBatch(handlers) {
  _showConfirm = handlers.showConfirm || _showConfirm;
  _showInput = handlers.showInput || _showInput;
  _showNotification = handlers.showNotification || _showNotification;
  _renderCategoryList = handlers.renderCategoryList || _renderCategoryList;
  _renderPromptList = handlers.renderPromptList || _renderPromptList;
  _renderSelectedPrompts = handlers.renderSelectedPrompts || _renderSelectedPrompts;
  _renderPreview = handlers.renderPreview || _renderPreview;
  _saveData = handlers.saveData || _saveData;
}

export function toggleBatchMode() {
  appState.batchMode = !appState.batchMode;
  document.body.classList.toggle('batch-mode', appState.batchMode);
  const batchModeBar = document.querySelector('.batch-mode-bar');
  if (batchModeBar) {
    batchModeBar.classList.toggle('active', appState.batchMode);
  }
  if (!appState.batchMode) {
    appState.batchSelected.clear();
    updateBatchInfo();
  }
  _renderPromptList(appState.selectedCategoryId);
}

export function exitBatchMode() {
  appState.batchMode = false;
  appState.batchSelected.clear();
  document.body.classList.remove('batch-mode');
  const batchModeBar = document.querySelector('.batch-mode-bar');
  if (batchModeBar) {
    batchModeBar.classList.remove('active');
  }
  updateBatchInfo();
  _renderPromptList(appState.selectedCategoryId);
}

export function updateBatchInfo() {
  const batchInfo = document.querySelector('.batch-info');
  if (batchInfo) {
    batchInfo.textContent = `已选择 ${appState.batchSelected.size} 项`;
  }
}

export async function batchDeletePrompts() {
  if (appState.batchSelected.size === 0) {
    _showNotification('请先选择要删除的提示词', 'warning');
    return;
  }
  const confirmed = await _showConfirm('批量删除', `确定要删除选中的 ${appState.batchSelected.size} 个提示词吗？`, '🗑️');
  if (!confirmed) return;
  iterateBatchSelected(appState.batchSelected, (categoryId, text) => {
    const category = getCategoryById(appState.categories, categoryId);
    if (category) {
      const idx = findPromptIndex(category.prompts, text);
      if (idx !== -1) {
        const removed = category.prompts.splice(idx, 1)[0];
        if (typeof removed === 'object' && removed !== null && removed.imagePath) {
          if (window.electronAPI && window.electronAPI.deletePromptImage) {
            window.electronAPI.deletePromptImage(removed.imagePath);
          }
        }
      }
    }
    const selectedArr = appState.selectedPrompts[categoryId];
    if (selectedArr) {
      const selIdx = findPromptIndex(selectedArr, text);
      if (selIdx !== -1) {
        selectedArr.splice(selIdx, 1);
      }
    }
  });
  appState.batchSelected.clear();
  updateBatchInfo();
  _saveData();
  _renderCategoryList();
  _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export function batchMovePrompts() {
  if (appState.batchSelected.size === 0) {
    _showNotification('请先选择要移动的提示词', 'warning');
    return;
  }
  const currentCategoryId = appState.selectedCategoryId;
  const targetCategories = appState.categories.filter(cat => cat.id !== currentCategoryId);
  if (targetCategories.length === 0) {
    _showNotification('没有可移动的目标分类', 'warning');
    return;
  }
  const batchMoveModal = document.querySelector('.batch-move-modal');
  const batchMoveList = document.querySelector('.batch-move-list');
  if (!batchMoveModal || !batchMoveList) return;
  batchMoveList.innerHTML = '';
  for (const cat of targetCategories) {
    const item = document.createElement('div');
    item.className = 'batch-move-item';
    item.textContent = cat.name;
    item.addEventListener('click', () => {
      performBatchMove(cat.id);
      batchMoveModal.classList.remove('active');
    });
    batchMoveList.appendChild(item);
  }
  batchMoveModal.classList.add('active');
}

export function performBatchMove(targetCategoryId) {
  const targetCategory = getCategoryById(appState.categories, targetCategoryId);
  if (!targetCategory) return;
  const targetTexts = new Set(targetCategory.prompts.map(p => getPromptText(p).toLowerCase()));
  iterateBatchSelected(appState.batchSelected, (categoryId, text) => {
    if (targetTexts.has(text.toLowerCase())) return;
    const sourceCategory = getCategoryById(appState.categories, categoryId);
    if (sourceCategory) {
      const idx = findPromptIndex(sourceCategory.prompts, text);
      if (idx !== -1) {
        const prompt = sourceCategory.prompts.splice(idx, 1)[0];
        const newPrompt = { text: getPromptText(prompt), translation: getPromptTranslation(prompt) };
        if (typeof prompt === 'object' && prompt !== null && prompt.imagePath) {
          newPrompt.imagePath = prompt.imagePath;
        }
        targetCategory.prompts.push(newPrompt);
        targetTexts.add(getPromptText(prompt).toLowerCase());
      }
    }
    const sourceSelected = appState.selectedPrompts[categoryId];
    if (sourceSelected) {
      const selIdx = findPromptIndex(sourceSelected, text);
      if (selIdx !== -1) {
        sourceSelected.splice(selIdx, 1);
      }
    }
    if (!appState.selectedPrompts[targetCategoryId]) {
      appState.selectedPrompts[targetCategoryId] = [];
    }
    const targetSelected = appState.selectedPrompts[targetCategoryId];
    if (!targetSelected.some(p => getPromptText(p).toLowerCase() === text.toLowerCase())) {
      const sourceCategory = getCategoryById(appState.categories, categoryId);
      let translation = '';
      if (sourceCategory) {
        const found = sourceCategory.prompts.find(p => getPromptText(p) === text);
        if (found) translation = getPromptTranslation(found);
      }
      targetSelected.push({ text, translation });
    }
  });
  appState.batchSelected.clear();
  updateBatchInfo();
  _saveData();
  _renderCategoryList();
  _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export async function batchEditPrompts() {
  if (appState.batchSelected.size === 0) {
    _showNotification('请先选择要编辑的提示词', 'warning');
    return;
  }
  const prefix = await _showInput('批量编辑', '请输入要添加的前缀');
  if (prefix === null || prefix.trim() === '') {
    _showNotification('前缀不能为空', 'warning');
    return;
  }
  const trimmedPrefix = prefix.trim();
  iterateBatchSelected(appState.batchSelected, (categoryId, text) => {
    const category = getCategoryById(appState.categories, categoryId);
    if (category) {
      const idx = findPromptIndex(category.prompts, text);
      if (idx !== -1) {
        const prompt = category.prompts[idx];
        const newText = trimmedPrefix + getPromptText(prompt);
        category.prompts[idx] = { text: newText, translation: getPromptTranslation(prompt) };
      }
    }
    const selectedArr = appState.selectedPrompts[categoryId];
    if (selectedArr) {
      const selIdx = findPromptIndex(selectedArr, text);
      if (selIdx !== -1) {
        const selPrompt = selectedArr[selIdx];
        selectedArr[selIdx] = { text: trimmedPrefix + getPromptText(selPrompt), translation: getPromptTranslation(selPrompt) };
      }
    }
  });
  appState.batchSelected.clear();
  updateBatchInfo();
  _saveData();
  _renderCategoryList();
  _renderPromptList(appState.selectedCategoryId);
  _renderSelectedPrompts();
  _renderPreview();
}

export function initBatchEvents(elements) {
  if (elements.batchModeBtn) {
    elements.batchModeBtn.addEventListener('click', toggleBatchMode);
  }
  if (elements.batchCancelBtn) {
    elements.batchCancelBtn.addEventListener('click', exitBatchMode);
  }
  if (elements.batchDeleteBtn) {
    elements.batchDeleteBtn.addEventListener('click', batchDeletePrompts);
  }
  if (elements.batchMoveBtn) {
    elements.batchMoveBtn.addEventListener('click', batchMovePrompts);
  }
  if (elements.batchEditBtn) {
    elements.batchEditBtn.addEventListener('click', batchEditPrompts);
  }
  if (elements.batchMoveCancelBtn) {
    elements.batchMoveCancelBtn.addEventListener('click', () => {
      const batchMoveModal = document.querySelector('.batch-move-modal');
      if (batchMoveModal) {
        batchMoveModal.classList.remove('active');
      }
    });
  }
}
