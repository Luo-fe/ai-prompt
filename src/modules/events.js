import * as settings from './settings.js';
import * as search from './search.js';
import * as batch from './batch.js';
import { debounce } from './utils.js';
import { appState } from './state.js';

let handlers = {};
let elements = {};

export function initEvents(els, h) {
  elements = els;
  handlers = h;
}

export function bindEvents() {
  elements.addCategoryBtn.addEventListener('click', () => {
    elements.categoryModal.style.display = 'block';
    handlers.renderCustomCategoryList();
  });

  elements.saveCategoryBtn.addEventListener('click', () => {
    const name = elements.newCategoryName.value;
    if (name.trim()) {
      handlers.addCategory(name);
      elements.newCategoryName.value = '';
    }
  });

  elements.newCategoryName.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const name = elements.newCategoryName.value;
      if (name.trim()) {
        handlers.addCategory(name);
        elements.newCategoryName.value = '';
      }
    }
  });

  if (elements.batchAddCategoryBtn) {
    elements.batchAddCategoryBtn.addEventListener('click', () => {
      const text = elements.batchCategoryNames.value;
      if (!text.trim()) {
        handlers.showNotification('请输入分类名称', 'warning');
        return;
      }
      const names = text.split('\n').map(n => n.trim()).filter(n => n.length > 0);
      if (names.length === 0) {
        handlers.showNotification('请输入有效的分类名称', 'warning');
        return;
      }
      handlers.addCategories(names);
      elements.batchCategoryNames.value = '';
    });
  }

  if (elements.batchDeleteCategoryBtn) {
    elements.batchDeleteCategoryBtn.addEventListener('click', () => {
      const checkboxes = elements.customCategoryList.querySelectorAll('.category-batch-checkbox:checked');
      if (checkboxes.length === 0) {
        handlers.showNotification('请先勾选要删除的分类', 'warning');
        return;
      }
      const ids = [...checkboxes].map(cb => cb.dataset.categoryId);
      handlers.batchDeleteCategories(ids);
    });
  }

  elements.editPromptsBtn.addEventListener('click', () => {
    if (appState.selectedCategoryId || elements.promptModal?.dataset?.categoryId) {
      handlers.openPromptModal(appState.selectedCategoryId || elements.promptModal.dataset.categoryId);
    } else {
      handlers.showNotification('请先选择一个分类', 'warning');
    }
  });

  elements.savePromptBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const categoryId = elements.promptModal.dataset.categoryId;
    const text = elements.newPromptText.value;
    if (!categoryId) {
      handlers.showNotification('请先选择一个分类', 'warning');
      return;
    }
    if (!text.trim()) {
      handlers.showNotification('提示词不能为空', 'error');
      return;
    }
    elements.newPromptText.value = '';
    handlers.addPrompt(categoryId, text);
  });

  elements.newPromptText.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      const categoryId = elements.promptModal.dataset.categoryId;
      if (!categoryId) return;
      const text = elements.newPromptText.value;
      if (!text.trim()) return;
      elements.newPromptText.value = '';
      handlers.addPrompt(categoryId, text);
    }
  });

  elements.batchImportBtn.addEventListener('click', () => {
    const categoryId = elements.promptModal.dataset.categoryId;
    if (categoryId) handlers.batchImportPrompts(categoryId, elements.batchImport.value);
  });

  elements.selectAllBtn.addEventListener('click', () => handlers.selectAllPrompts());
  elements.deselectAllBtn.addEventListener('click', () => handlers.deselectAllPrompts());
  elements.clearSelectedBtn.addEventListener('click', () => handlers.clearAllSelectedPrompts());
  elements.randomGenerateBtn.addEventListener('click', () => handlers.generateRandomPrompts());
  elements.exportBtn.addEventListener('click', () => handlers.openExportModal());

  document.querySelectorAll('input[name="export-format"]').forEach((radio) => {
    radio.addEventListener('change', () => {
      const delimiterOption = document.getElementById('delimiter-option');
      if (delimiterOption) delimiterOption.style.display = radio.value === 'text' ? 'block' : 'none';
      handlers.updateExportPreview();
    });
  });

  document.getElementById('delimiter').addEventListener('change', (e) => {
    const customDelimiter = document.getElementById('custom-delimiter');
    if (customDelimiter) customDelimiter.style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
    handlers.updateExportPreview();
  });

  document.getElementById('custom-delimiter').addEventListener('input', () => handlers.updateExportPreview());

  elements.copyToClipboardBtn.addEventListener('click', () => handlers.copyToClipboard());
  elements.downloadFileBtn.addEventListener('click', () => handlers.downloadFile());

  document.querySelectorAll('.modal .close').forEach((btn) => {
    btn.addEventListener('click', function () {
      const modal = this.closest('.modal');
      if (modal) handlers.closeModal(modal.id);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) handlers.closeModal(e.target.id);
  });

  elements.mobileToggle.addEventListener('click', () => {
    elements.categoryPanel.classList.toggle('active');
    let overlay = document.querySelector('.overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'overlay';
      overlay.addEventListener('click', () => {
        elements.categoryPanel.classList.remove('active');
        overlay.classList.remove('active');
      });
      document.body.appendChild(overlay);
    }
    overlay.classList.toggle('active');
  });

  window.addEventListener('resize', debounce(() => {
    if (window.innerWidth > 768) {
      elements.categoryPanel.classList.remove('active');
      const overlay = document.querySelector('.overlay');
      if (overlay) overlay.classList.remove('active');
    }
  }, 150));

  elements.settingsBtn.addEventListener('click', () => handlers.openSettingsModal());
  elements.translateAllBtn.addEventListener('click', () => handlers.translateAllPrompts());

  if (window.electronAPI) {
    const minBtn = document.getElementById('win-minimize');
    const maxBtn = document.getElementById('win-maximize');
    const closeBtn = document.getElementById('win-close');
    if (minBtn) minBtn.addEventListener('click', () => window.electronAPI.minimize());
    if (maxBtn) maxBtn.addEventListener('click', () => window.electronAPI.maximize());
    if (closeBtn) closeBtn.addEventListener('click', () => window.electronAPI.close());
    const wc = document.getElementById('window-controls');
    if (wc) wc.style.display = 'flex';
  } else {
    const wc = document.getElementById('window-controls');
    if (wc) wc.style.display = 'none';
  }
}

export function bindSettingsEvents() {
  settings.bindSettingsEvents(elements);
}

export function initSearchEvents() {
  search.initSearchEvents();
}

export function initBatchEvents() {
  batch.initBatchEvents(elements);
}

export function initSortEvents() {
  const sortAzBtn = document.getElementById('sort-az-btn');
  const sortZaBtn = document.getElementById('sort-za-btn');
  if (sortAzBtn) sortAzBtn.addEventListener('click', () => handlers.sortPrompts('az'));
  if (sortZaBtn) sortZaBtn.addEventListener('click', () => handlers.sortPrompts('za'));
}

export function initPreviewPanelResize() {
  const panelHandle = document.getElementById('preview-resize-handle');
  const panel = document.querySelector('.preview-panel');
  const promptsHandle = document.getElementById('selected-prompts-resize-handle');
  const promptsBox = document.getElementById('selected-prompts');

  function createResizeHandler(handle, target, direction, minSize, maxSize) {
    let isResizing = false;
    let startPos = 0;
    let startSize = 0;
    const isHorizontal = direction === 'horizontal';

    handle.addEventListener('mousedown', (e) => {
      isResizing = true;
      startPos = isHorizontal ? e.clientX : e.clientY;
      startSize = isHorizontal ? target.offsetWidth : target.offsetHeight;
      handle.classList.add('active');
      document.body.style.cursor = isHorizontal ? 'ew-resize' : 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      const diff = (isHorizontal ? e.clientX : e.clientY) - startPos;
      const newSize = Math.min(Math.max(startSize + diff, minSize), maxSize);
      if (isHorizontal) target.style.width = newSize + 'px';
      else target.style.height = newSize + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  if (panelHandle && panel) createResizeHandler(panelHandle, panel, 'horizontal', 240, 500);
  if (promptsHandle && promptsBox) createResizeHandler(promptsHandle, promptsBox, 'vertical', 60, 500);
}
