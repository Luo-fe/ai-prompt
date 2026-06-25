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

// 安全绑定事件，元素不存在时跳过而非中断后续绑定
function on(el, type, fn) {
  if (el) el.addEventListener(type, fn);
}

export function bindEvents() {
  on(elements.addCategoryBtn, 'click', () => {
    elements.categoryModal.style.display = 'block';
    handlers.renderCustomCategoryList();
  });

  if (elements.categoryBatchModeBtn) {
    elements.categoryBatchModeBtn.addEventListener('click', () => {
      if (handlers.toggleCategoryBatchMode) handlers.toggleCategoryBatchMode();
    });
  }

  if (elements.categoryBatchCancelBtn) {
    elements.categoryBatchCancelBtn.addEventListener('click', () => {
      if (handlers.exitCategoryBatchMode) handlers.exitCategoryBatchMode();
    });
  }

  if (elements.categoryBatchDeleteBtn) {
    elements.categoryBatchDeleteBtn.addEventListener('click', () => {
      if (handlers.categoryBatchDelete) {
        const result = handlers.categoryBatchDelete();
        if (result && typeof result.catch === 'function') {
          result.catch(e => console.error('categoryBatchDelete error:', e));
        }
      }
    });
  }

  on(elements.saveCategoryBtn, 'click', () => {
    const name = elements.newCategoryName.value;
    if (name.trim()) {
      handlers.addCategory(name);
      elements.newCategoryName.value = '';
    }
  });

  on(elements.newCategoryName, 'keydown', (e) => {
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

  on(elements.editPromptsBtn, 'click', () => {
    if (appState.selectedCategoryId || elements.promptModal?.dataset?.categoryId) {
      handlers.openPromptModal(appState.selectedCategoryId || elements.promptModal.dataset.categoryId);
    } else {
      handlers.showNotification('请先选择一个分类', 'warning');
    }
  });

  on(elements.savePromptBtn, 'click', (e) => {
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

  on(elements.newPromptText, 'keydown', (e) => {
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

  on(elements.batchImportBtn, 'click', () => {
    const categoryId = elements.promptModal.dataset.categoryId;
    if (categoryId) handlers.batchImportPrompts(categoryId, elements.batchImport.value);
  });

  on(elements.selectAllBtn, 'click', () => handlers.selectAllPrompts());
  on(elements.deselectAllBtn, 'click', () => handlers.deselectAllPrompts());
  on(elements.clearSelectedBtn, 'click', () => handlers.clearAllSelectedPrompts());
  on(elements.randomGenerateBtn, 'click', () => handlers.generateRandomPrompts());
  on(elements.exportBtn, 'click', () => handlers.openExportModal());

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

  on(elements.copyToClipboardBtn, 'click', () => handlers.copyToClipboard());
  on(elements.downloadFileBtn, 'click', () => handlers.downloadFile());

  document.querySelectorAll('.modal .close').forEach((btn) => {
    btn.addEventListener('click', function () {
      const modal = this.closest('.modal');
      if (modal) handlers.closeModal(modal.id);
    });
  });

  window.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal')) handlers.closeModal(e.target.id);
  });

  on(elements.mobileToggle, 'click', () => {
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

  on(elements.settingsBtn, 'click', () => handlers.openSettingsModal());
  on(elements.translateAllBtn, 'click', () => handlers.translateAllPrompts());

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
    let startPos = 0;
    let startSize = 0;
    const isHorizontal = direction === 'horizontal';
    let rafId = null;
    let lastEvent = null;

    function onMouseMove(e) {
      lastEvent = e;
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!lastEvent) return;
        const diff = (isHorizontal ? lastEvent.clientX : lastEvent.clientY) - startPos;
        const newSize = Math.min(Math.max(startSize + diff, minSize), maxSize);
        if (isHorizontal) target.style.width = newSize + 'px';
        else target.style.height = newSize + 'px';
      });
    }

    function onMouseUp() {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    handle.addEventListener('mousedown', (e) => {
      startPos = isHorizontal ? e.clientX : e.clientY;
      startSize = isHorizontal ? target.offsetWidth : target.offsetHeight;
      handle.classList.add('active');
      document.body.style.cursor = isHorizontal ? 'ew-resize' : 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  if (panelHandle && panel) createResizeHandler(panelHandle, panel, 'horizontal', 240, 500);
  if (promptsHandle && promptsBox) createResizeHandler(promptsHandle, promptsBox, 'vertical', 60, 500);
}
