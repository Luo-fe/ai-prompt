import * as settings from './settings.js';
import * as search from './search.js';
import * as batch from './batch.js';
import { debounce } from './utils.js';
import { appState, saveSettingsToStorage } from './state.js';
import { openTokenizerModal } from './render.js';

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

  // 本地分词分类器入口：禁用态时不响应
  on(elements.tokenizerBtn, 'click', () => {
    if (elements.tokenizerBtn && elements.tokenizerBtn.disabled) return;
    openTokenizerModal();
  });

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

/* ================================
   Layout Customization
   ================================ */

const LAYOUT_DEFAULTS = {
  locked: false,
  direction: 'row',  // 'row' 三栏 | 'column' 单栏
  panels: {
    category: { ratio: 20, order: 0 },  // ratio = flex-grow 比例
    prompt:   { ratio: 50, order: 1 },
    preview:  { ratio: 30, order: 2 }
  }
};

const PANEL_KEYS = ['category', 'prompt', 'preview'];
// ratio 最小占比（相对于相邻两个面板的 ratio 总和）
const PANEL_MIN_RATIO_PERCENT = 0.1;

let _layoutEditState = null;
let _toolbarBound = false;

function _panelEl(key) {
  return elements[key + 'Panel'] || null; // categoryPanel / promptPanel / previewPanel
}

/**
 * 进入布局编辑模式：
 * 1. 保存当前布局快照（供取消时恢复）
 * 2. 注入拖拽手柄和 resize 手柄
 * 3. 显示底部工具栏
 */
export function enterLayoutEditMode() {
  if (document.body.classList.contains('layout-edit-mode')) return;

  // 先应用当前布局，确保 DOM 与 state 一致
  if (handlers.applyCustomLayout) handlers.applyCustomLayout();

  // 深拷贝当前布局作为取消时的回滚快照
  _layoutEditState = {
    originalLayout: JSON.parse(JSON.stringify(appState.settings.customLayout || LAYOUT_DEFAULTS))
  };

  document.body.classList.add('layout-edit-mode');
  _syncDirectionButtons();
  _injectDragHandles();
  _injectResizeHandles();
  _showToolbar();
  _bindToolbarButtons();
}

/**
 * 退出布局编辑模式
 * @param {boolean} save true=保存当前 DOM 布局到 state；false=恢复进入前快照
 */
export function exitLayoutEditMode(save) {
  if (!document.body.classList.contains('layout-edit-mode')) return;

  document.body.classList.remove('layout-edit-mode');
  _removeDragHandles();
  _removeResizeHandles();
  _hideToolbar();

  if (save) {
    _readLayoutFromDOM();
    saveSettingsToStorage();
    if (handlers.applyCustomLayout) handlers.applyCustomLayout();
  } else if (_layoutEditState && _layoutEditState.originalLayout) {
    appState.settings.customLayout = _layoutEditState.originalLayout;
    if (handlers.applyCustomLayout) handlers.applyCustomLayout();
  }
  _layoutEditState = null;
}

/**
 * 恢复默认布局：重置 state、清除 inline 样式、解除锁死
 */
export function resetLayoutToDefault() {
  appState.settings.customLayout = JSON.parse(JSON.stringify(LAYOUT_DEFAULTS));
  // 清除面板 inline 样式
  PANEL_KEYS.forEach(key => {
    const el = _panelEl(key);
    if (el) {
      el.style.order = '';
      el.style.width = '';
      el.style.height = '';
      el.style.flex = '';
    }
  });
  // 清除 CSS 变量
  const root = document.documentElement;
  root.style.removeProperty('--layout-category-ratio');
  root.style.removeProperty('--layout-prompt-ratio');
  root.style.removeProperty('--layout-preview-ratio');
  // 解除锁死和单栏模式
  document.body.classList.remove('layout-locked');
  document.body.classList.remove('layout-single-column');
  document.body.classList.add('layout-three-column');
  saveSettingsToStorage();
  if (handlers.applyCustomLayout) handlers.applyCustomLayout();
  _syncDirectionButtons();
}

/* ---------- 工具栏 ---------- */

function _showToolbar() {
  if (!elements.layoutEditToolbar) return;
  elements.layoutEditToolbar.classList.add('visible');
  elements.layoutEditToolbar.setAttribute('aria-hidden', 'false');
}

function _hideToolbar() {
  if (!elements.layoutEditToolbar) return;
  elements.layoutEditToolbar.classList.remove('visible');
  elements.layoutEditToolbar.setAttribute('aria-hidden', 'true');
}

function _bindToolbarButtons() {
  if (_toolbarBound) return;
  _toolbarBound = true;
  if (elements.layoutEditSave) {
    elements.layoutEditSave.addEventListener('click', () => {
      exitLayoutEditMode(true);
      if (handlers.showNotification) handlers.showNotification('布局已保存', 'success');
    });
  }
  if (elements.layoutEditCancel) {
    elements.layoutEditCancel.addEventListener('click', () => {
      exitLayoutEditMode(false);
    });
  }
  if (elements.layoutEditReset) {
    elements.layoutEditReset.addEventListener('click', () => {
      // 在编辑模式内恢复默认（不退出编辑模式，方便继续调整）
      appState.settings.customLayout = JSON.parse(JSON.stringify(LAYOUT_DEFAULTS));
      if (handlers.applyCustomLayout) handlers.applyCustomLayout();
      // 清除可能残留的 inline 样式
      PANEL_KEYS.forEach(key => {
        const el = _panelEl(key);
        if (el) { el.style.width = ''; el.style.height = ''; el.style.flex = ''; }
      });
      _syncDirectionButtons();
      // 重新注入 resize 手柄（方向可能变化）
      _removeResizeHandles();
      _injectResizeHandles();
      if (handlers.showNotification) handlers.showNotification('已恢复默认布局', 'info');
    });
  }
  if (elements.layoutEditThreeCol) {
    elements.layoutEditThreeCol.addEventListener('click', () => {
      _setDirection('row');
    });
  }
  if (elements.layoutEditSingleCol) {
    elements.layoutEditSingleCol.addEventListener('click', () => {
      _setDirection('column');
    });
  }
}

/**
 * 同步三栏/单栏按钮的激活状态
 */
function _syncDirectionButtons() {
  const dir = (appState.settings.customLayout || {}).direction || 'row';
  if (elements.layoutEditThreeCol) elements.layoutEditThreeCol.classList.toggle('active', dir === 'row');
  if (elements.layoutEditSingleCol) elements.layoutEditSingleCol.classList.toggle('active', dir === 'column');
}

/**
 * 切换布局方向
 */
function _setDirection(dir) {
  if (!appState.settings.customLayout) return;
  appState.settings.customLayout.direction = dir;
  if (handlers.applyCustomLayout) handlers.applyCustomLayout();
  _syncDirectionButtons();
  // 清除面板 inline 宽度/高度（方向切换后旧尺寸无意义）
  PANEL_KEYS.forEach(key => {
    const el = _panelEl(key);
    if (el) { el.style.width = ''; el.style.height = ''; el.style.flex = ''; }
  });
  // 重新注入 resize 手柄（方向变化）
  _removeResizeHandles();
  _injectResizeHandles();
}

/* ---------- 拖拽手柄（换位） ---------- */

function _injectDragHandles() {
  PANEL_KEYS.forEach(key => {
    const panel = _panelEl(key);
    if (!panel) return;
    if (panel.querySelector('.layout-drag-handle')) return;
    const handle = document.createElement('div');
    handle.className = 'layout-drag-handle';
    handle.dataset.panelKey = key;
    handle.title = '拖拽换位';
    panel.appendChild(handle);
    _bindDragHandle(handle, key, panel);
  });
}

function _removeDragHandles() {
  document.querySelectorAll('.layout-drag-handle').forEach(h => h.remove());
}

function _bindDragHandle(handle, sourceKey, sourcePanel) {
  let startX = 0, startY = 0;
  let dragging = false;
  let dropTarget = null;
  let ghost = null;

  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    startX = e.clientX;
    startY = e.clientY;
    dragging = true;
    sourcePanel.classList.add('panel-dragging');

    function onMove(ev) {
      if (!dragging) return;
      // 创建跟随光标的幻影
      if (!ghost) {
        ghost = document.createElement('div');
        ghost.style.cssText = `position:fixed;pointer-events:none;z-index:2000;
          padding:0.3rem 0.8rem;background:var(--primary-color);color:#fff;
          border-radius:var(--border-radius-sm);font-size:0.8rem;font-weight:600;
          box-shadow:0 4px 12px rgba(99,102,241,0.4);opacity:0.95;`;
        ghost.textContent = sourcePanel.querySelector('h2, h3') ?
          sourcePanel.querySelector('h2, h3').textContent.trim() : '面板';
        document.body.appendChild(ghost);
      }
      ghost.style.left = (ev.clientX + 12) + 'px';
      ghost.style.top  = (ev.clientY + 12) + 'px';

      // 检测悬停的目标面板
      const target = _findPanelAtPoint(ev.clientX, ev.clientY, sourcePanel);
      if (dropTarget && dropTarget !== target) dropTarget.classList.remove('panel-drop-target');
      dropTarget = target;
      if (dropTarget) dropTarget.classList.add('panel-drop-target');
    }

    function onUp() {
      dragging = false;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      sourcePanel.classList.remove('panel-dragging');
      if (ghost) { ghost.remove(); ghost = null; }
      if (dropTarget) {
        dropTarget.classList.remove('panel-drop-target');
        const targetKey = dropTarget.dataset.panelKey || _keyFromPanel(dropTarget);
        if (targetKey && targetKey !== sourceKey) {
          _swapPanels(sourceKey, targetKey);
        }
      }
      dropTarget = null;
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

function _findPanelAtPoint(x, y, exclude) {
  const panels = document.querySelectorAll('.category-panel, .prompt-panel, .preview-panel');
  for (const p of panels) {
    if (p === exclude) continue;
    const r = p.getBoundingClientRect();
    if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return p;
  }
  return null;
}

function _keyFromPanel(panelEl) {
  if (panelEl.classList.contains('category-panel')) return 'category';
  if (panelEl.classList.contains('prompt-panel'))   return 'prompt';
  if (panelEl.classList.contains('preview-panel'))  return 'preview';
  return null;
}

/**
 * FLIP 动画交换两个面板的 order
 */
function _swapPanels(keyA, keyB) {
  const layout = appState.settings.customLayout;
  const orderA = layout.panels[keyA].order;
  const orderB = layout.panels[keyB].order;

  // First: 记录交换前位置
  const rectA = _panelEl(keyA).getBoundingClientRect();
  const rectB = _panelEl(keyB).getBoundingClientRect();

  // Last: 交换 order
  layout.panels[keyA].order = orderB;
  layout.panels[keyB].order = orderA;
  if (handlers.applyCustomLayout) handlers.applyCustomLayout();

  // Invert: 用 transform 把面板拉回旧位置
  const elA = _panelEl(keyA);
  const elB = _panelEl(keyB);
  const newRectA = elA.getBoundingClientRect();
  const newRectB = elB.getBoundingClientRect();
  const dxA = rectA.left - newRectA.left;
  const dyA = rectA.top  - newRectA.top;
  const dxB = rectB.left - newRectB.left;
  const dyB = rectB.top  - newRectB.top;

  elA.style.transition = 'none';
  elB.style.transition = 'none';
  elA.style.transform = `translate(${dxA}px, ${dyA}px)`;
  elB.style.transform = `translate(${dxB}px, ${dyB}px)`;

  // Play: 下一帧移除 transform，触发过渡动画
  requestAnimationFrame(() => {
    elA.classList.add('panel-flip-animating');
    elB.classList.add('panel-flip-animating');
    elA.style.transition = '';
    elB.style.transition = '';
    elA.style.transform = '';
    elB.style.transform = '';
    setTimeout(() => {
      elA.classList.remove('panel-flip-animating');
      elB.classList.remove('panel-flip-animating');
    }, 280);
  });
}

/* ---------- Resize 手柄（联动调整比例） ---------- */

/**
 * 按 order 排序获取面板 key 数组
 */
function _getSortedPanelKeys() {
  const layout = appState.settings.customLayout;
  if (!layout) return PANEL_KEYS.slice();
  return PANEL_KEYS.slice().sort((a, b) =>
    (layout.panels[a]?.order ?? 0) - (layout.panels[b]?.order ?? 0)
  );
}

function _injectResizeHandles() {
  const dir = (appState.settings.customLayout || {}).direction || 'row';
  const isColumn = dir === 'column';
  const sortedKeys = _getSortedPanelKeys();
  // 除了最后一个面板，其他面板都注入 resize handle（与其右侧/下方面板联动）
  sortedKeys.slice(0, -1).forEach(key => {
    const panel = _panelEl(key);
    if (!panel) return;
    if (panel.querySelector('.layout-resize-handle')) return;
    const handle = document.createElement('div');
    handle.className = isColumn ? 'layout-resize-handle vertical' : 'layout-resize-handle horizontal';
    handle.dataset.panelKey = key;
    if (isColumn) {
      handle.style.bottom = '-4px';
      handle.style.left = '0';
      handle.style.right = '0';
    } else {
      handle.style.right = '-4px';
      handle.style.top = '0';
      handle.style.bottom = '0';
    }
    panel.appendChild(handle);
    _bindResizeHandle(handle, key, isColumn);
  });
}

function _removeResizeHandles() {
  document.querySelectorAll('.layout-resize-handle').forEach(h => h.remove());
}

/**
 * 绑定 resize 手柄：拖拽时联动调整当前面板与相邻面板的 ratio
 * 直接更新 CSS 变量，无 RAF 节流，确保跟手
 */
function _bindResizeHandle(handle, key, isColumn) {
  handle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    e.stopPropagation();

    const layout = appState.settings.customLayout;
    if (!layout) return;
    const currentIsColumn = layout.direction === 'column';

    // 找到相邻的下一个面板（按 order）
    const sortedKeys = _getSortedPanelKeys();
    const myIndex = sortedKeys.indexOf(key);
    const nextKey = sortedKeys[myIndex + 1];
    if (!nextKey) return; // 最后一个面板，无法 resize

    const startPos = currentIsColumn ? e.clientY : e.clientX;
    const startRatioA = layout.panels[key].ratio;
    const startRatioB = layout.panels[nextKey].ratio;
    const totalRatio = startRatioA + startRatioB;
    const container = elements.mainContent;
    const containerSize = currentIsColumn
      ? container.offsetHeight
      : container.offsetWidth;

    handle.classList.add('active');
    document.body.style.cursor = currentIsColumn ? 'ns-resize' : 'ew-resize';
    document.body.style.userSelect = 'none';

    const root = document.documentElement;
    const varNameA = `--layout-${key}-ratio`;
    const varNameB = `--layout-${nextKey}-ratio`;

    function onMove(ev) {
      const currentPos = currentIsColumn ? ev.clientY : ev.clientX;
      const delta = currentPos - startPos;
      // 将像素位移转换为 ratio 变化量
      const deltaRatio = (delta / containerSize) * totalRatio;

      let newRatioA = startRatioA + deltaRatio;
      // 限制最小占比，防止面板被压缩到不可见
      const minRatio = totalRatio * PANEL_MIN_RATIO_PERCENT;
      newRatioA = Math.max(minRatio, Math.min(totalRatio - minRatio, newRatioA));
      const newRatioB = totalRatio - newRatioA;

      // 更新 state
      layout.panels[key].ratio = newRatioA;
      layout.panels[nextKey].ratio = newRatioB;

      // 直接更新 CSS 变量（极快，浏览器仅重算 flex 布局，无 JS 对象 reflow）
      root.style.setProperty(varNameA, newRatioA);
      root.style.setProperty(varNameB, newRatioB);
    }

    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      handle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
}

/**
 * 保存时从 state 读取 ratio（拖拽过程中已实时更新到 state）
 */
function _readLayoutFromDOM() {
  // ratio 已在拖拽过程中实时写入 appState.settings.customLayout.panels[key].ratio
  // order 已在换位时写入，此处无需额外读取
}

/**
 * 初始化布局自定义：在应用启动后调用
 */
export function initLayoutCustomization() {
  // 应用保存的布局
  if (handlers.applyCustomLayout) handlers.applyCustomLayout();
}

