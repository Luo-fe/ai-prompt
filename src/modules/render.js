import { appState, saveDataImmediate } from './state.js';
import { getPromptText, getPromptTranslation, getCategoryById, findPromptInCategory, createPromptKey, sanitizeFilename } from './utils.js';
import { NOTIFICATION_DURATION, NOTIFICATION_MAX_COUNT } from './constants.js';
import { BUILTIN_CATEGORY_IDS } from './learning.js';

let handlers = {};

export function initRender(h) {
  handlers = { ...handlers, ...h };
}

const elements = {};
export { elements };

let _categoryBatchMode = false;
let _categoryBatchSelected = new Set();

export function cacheElements() {
  elements.categoryList = document.getElementById('category-list');
  elements.currentCategoryTitle = document.getElementById('current-category-title');
  elements.promptList = document.getElementById('prompt-list');
  elements.selectedPrompts = document.getElementById('selected-prompts');
  elements.previewOutput = document.getElementById('preview-output');
  elements.addCategoryBtn = document.getElementById('add-category-btn');
  elements.selectAllBtn = document.getElementById('select-all-btn');
  elements.deselectAllBtn = document.getElementById('deselect-all-btn');
  elements.editPromptsBtn = document.getElementById('edit-prompts-btn');
  elements.clearSelectedBtn = document.getElementById('clear-selected-btn');
  elements.exportBtn = document.getElementById('export-btn');
  elements.categoryModal = document.getElementById('category-modal');
  elements.promptModal = document.getElementById('prompt-modal');
  elements.exportModal = document.getElementById('export-modal');
  elements.settingsModal = document.getElementById('settings-modal');
  elements.newCategoryName = document.getElementById('new-category-name');
  elements.saveCategoryBtn = document.getElementById('save-category-btn');
  elements.batchCategoryNames = document.getElementById('batch-category-names');
  elements.batchAddCategoryBtn = document.getElementById('batch-add-category-btn');
  elements.batchDeleteCategoryBtn = document.getElementById('batch-delete-category-btn');
  elements.customCategoryList = document.getElementById('custom-category-list');
  elements.promptModalTitle = document.getElementById('prompt-modal-title');
  elements.newPromptText = document.getElementById('new-prompt-text');
  elements.savePromptBtn = document.getElementById('save-prompt-btn');
  elements.batchImport = document.getElementById('batch-import');
  elements.batchImportBtn = document.getElementById('batch-import-btn');
  elements.categoryPromptsList = document.getElementById('category-prompts-list');
  elements.exportPreview = document.getElementById('export-preview');
  elements.copyToClipboardBtn = document.getElementById('copy-to-clipboard-btn');
  elements.downloadFileBtn = document.getElementById('download-file-btn');
  elements.mobileToggle = document.getElementById('mobile-toggle');
  elements.categoryPanel = document.querySelector('.category-panel');
  elements.randomCategorySelector = document.getElementById('random-category-selector');
  elements.randomGenerateBtn = document.getElementById('random-generate-btn');
  elements.randomResult = document.getElementById('random-result');
  elements.settingsBtn = document.getElementById('settings-btn');
  elements.translateAllBtn = document.getElementById('translate-all-btn');
  elements.translationEnabled = document.getElementById('translation-enabled');
  elements.onlineTranslation = document.getElementById('online-translation');
  elements.autoTranslateNew = document.getElementById('auto-translate-new');
  elements.showTranslationPreview = document.getElementById('show-translation-preview');
  elements.translationAPI = document.getElementById('translation-api');
  elements.saveSettingsBtn = document.getElementById('save-settings-btn');
  elements.cancelSettingsBtn = document.getElementById('cancel-settings-btn');
  elements.bgUploadBtn = document.getElementById('bg-upload-btn');
  elements.bgClearBtn = document.getElementById('bg-clear-btn');
  elements.bgFileInput = document.getElementById('bg-file-input');
  elements.bgPreviewContainer = document.getElementById('bg-preview-container');
  elements.panelOpacitySlider = document.getElementById('panel-opacity-slider');
  elements.panelOpacityValue = document.getElementById('panel-opacity-value');
  elements.bgImageOverlay = document.getElementById('bg-image-overlay');
  elements.panelStyleFrosted = document.getElementById('panel-style-frosted');
  elements.panelStyleTransparent = document.getElementById('panel-style-transparent');
  elements.searchInput = document.getElementById('search-input');
  elements.searchClearBtn = document.getElementById('search-clear-btn');
  elements.searchResultsDropdown = document.getElementById('search-results-dropdown');
  elements.batchModeBtn = document.getElementById('batch-mode-btn');
  elements.batchModeBar = document.getElementById('batch-mode-bar');
  elements.batchInfo = document.getElementById('batch-info');
  elements.batchMoveBtn = document.getElementById('batch-move-btn');
  elements.batchDeleteBtn = document.getElementById('batch-delete-btn');
  elements.batchEditBtn = document.getElementById('batch-edit-btn');
  elements.batchCancelBtn = document.getElementById('batch-cancel-btn');
  elements.batchMoveModal = document.getElementById('batch-move-modal');
  elements.batchMoveList = document.getElementById('batch-move-list');
  elements.batchMoveCancelBtn = document.getElementById('batch-move-cancel-btn');
  elements.sortAzBtn = document.getElementById('sort-az-btn');
  elements.sortZaBtn = document.getElementById('sort-za-btn');
  elements.bgClarityBtn = document.getElementById('bg-clarity-btn');
  elements.frequentSection = document.getElementById('frequent-section');
  elements.frequentList = document.getElementById('frequent-list');
  elements.frequentCountInput = document.getElementById('frequent-count-input');
  elements.clearUsageBtn = document.getElementById('clear-usage-btn');
  elements.refreshCacheInfoBtn = document.getElementById('refresh-cache-info-btn');
  elements.clearCacheBtn = document.getElementById('clear-cache-btn');
  elements.confirmDialog = document.getElementById('confirm-dialog');
  elements.confirmIcon = document.getElementById('confirm-icon');
  elements.confirmTitle = document.getElementById('confirm-title');
  elements.confirmMessage = document.getElementById('confirm-message');
  elements.confirmOkBtn = document.getElementById('confirm-ok-btn');
  elements.confirmCancelBtn = document.getElementById('confirm-cancel-btn');
  elements.cleanDuplicatesBtn = document.getElementById('clean-duplicates-btn');
  elements.exportAllDataBtn = document.getElementById('export-all-data-btn');
  elements.importDataBtn = document.getElementById('import-data-btn');
  elements.importFileInput = document.getElementById('import-file-input');
  elements.exportCsvBtn = document.getElementById('export-csv-btn');
  elements.importCsvBtn = document.getElementById('import-csv-btn');
  elements.importCsvFileInput = document.getElementById('import-csv-file-input');
  elements.categoryBatchModeBtn = document.getElementById('category-batch-mode-btn');
  elements.categoryBatchBar = document.getElementById('category-batch-bar');
  elements.categoryBatchInfo = document.getElementById('category-batch-info');
  elements.categoryBatchDeleteBtn = document.getElementById('category-batch-delete-btn');
  elements.categoryBatchCancelBtn = document.getElementById('category-batch-cancel-btn');
  elements.rightClickCopyEnabled = document.getElementById('right-click-copy-enabled');
  elements.rccIncludeOriginal = document.getElementById('rcc-include-original');
  elements.rccIncludeTranslation = document.getElementById('rcc-include-translation');
  elements.rccConnector = document.getElementById('rcc-connector');
  elements.rccCustomConnector = document.getElementById('rcc-custom-connector');
  elements.rccAppendConnector = document.getElementById('rcc-append-connector');
  elements.rccPreviewText = document.getElementById('rcc-preview-text');
  elements.exportShortcutInput = document.getElementById('export-shortcut-input');
  elements.exportShortcutResetBtn = document.getElementById('export-shortcut-reset-btn');
  elements.exportShortcutTarget = document.getElementById('export-shortcut-target');
  elements.exportShortcutAppendConnector = document.getElementById('export-shortcut-append-connector');
  elements.previewImageLimitEnabled = document.getElementById('preview-image-limit-enabled');
  elements.previewImageMaxDimension = document.getElementById('preview-image-max-dimension');
  elements.previewImageDisplaySize = document.getElementById('preview-image-display-size');
  elements.promptImageFileInput = document.getElementById('prompt-image-file-input');
  elements.promptImagePreview = document.getElementById('prompt-image-preview');
  elements.promptImagePreviewImg = document.getElementById('prompt-image-preview-img');
  elements.promptImageEnlargedModal = document.getElementById('prompt-image-enlarged-modal');
  elements.promptImageEnlargedImg = document.getElementById('prompt-image-enlarged-img');
  elements.promptImageEnlargedClose = document.getElementById('prompt-image-enlarged-close');
  elements.openPromptImagesFolderBtn = document.getElementById('open-prompt-images-folder-btn');
  elements.dataDirectoryPath = document.getElementById('data-directory-path');
  elements.dataDirectoryMode = document.getElementById('data-directory-mode');
  elements.changeDataDirectoryBtn = document.getElementById('change-data-directory-btn');
  elements.openDataDirectoryBtn = document.getElementById('open-data-directory-btn');
  elements.resetDataDirectoryBtn = document.getElementById('reset-data-directory-btn');
  // 布局自定义相关元素
  elements.layoutCustomizeBtn = document.getElementById('layout-customize-btn');
  elements.layoutLockToggle = document.getElementById('layout-lock-toggle');
  elements.layoutResetBtn = document.getElementById('layout-reset-btn');
  elements.layoutEditToolbar = document.getElementById('layout-edit-toolbar');
  elements.layoutEditSave = document.getElementById('layout-edit-save');
  elements.layoutEditCancel = document.getElementById('layout-edit-cancel');
  elements.layoutEditReset = document.getElementById('layout-edit-reset');
  elements.layoutEditThreeCol = document.getElementById('layout-edit-three-col');
  elements.layoutEditSingleCol = document.getElementById('layout-edit-single-col');
  elements.mainContent = document.querySelector('.main-content');
  elements.categoryPanel = document.querySelector('.category-panel');
  elements.promptPanel = document.querySelector('.prompt-panel');
  elements.previewPanel = document.querySelector('.preview-panel');
  // Tokenizer 元素
  elements.tokenizerBtn = document.getElementById('tokenizer-btn');
  elements.tokenizerModal = document.getElementById('tokenizer-modal');
  elements.tokenizerInput = document.getElementById('tokenizer-input');
  elements.tokenizerClassifyBtn = document.getElementById('tokenizer-classify-btn');
  elements.tokenizerResults = document.getElementById('tokenizer-results');
  elements.tokenizerStats = document.getElementById('tokenizer-stats');
  elements.tokenizerSelectAllBtn = document.getElementById('tokenizer-select-all-btn');
  elements.tokenizerDeleteSelectedBtn = document.getElementById('tokenizer-delete-selected-btn');
  elements.tokenizerMoveBtn = document.getElementById('tokenizer-move-btn');
  elements.tokenizerImportBtn = document.getElementById('tokenizer-import-btn');
  // 设置面板
  elements.tokenizerEnabledCheckbox = document.getElementById('tokenizer-enabled-checkbox');
  elements.tokenizerVersion = document.getElementById('tokenizer-version');
  elements.tokenizerTagCount = document.getElementById('tokenizer-tag-count');
  elements.tokenizerCategoryCount = document.getElementById('tokenizer-category-count');
  elements.tokenizerEditRulesBtn = document.getElementById('tokenizer-edit-rules-btn');
  // Learning 模型元素
  elements.learningOpenBtn = document.getElementById('open-learning-modal-btn');
  elements.learningModal = document.getElementById('learning-modal');
  elements.learningCloseBtn = elements.learningModal ? elements.learningModal.querySelector('.close') : null;
  elements.learningTrainBtn = document.getElementById('learning-train-btn');
  elements.learningDeleteModelBtn = document.getElementById('learning-delete-model-btn');
  elements.learningSaveSamplesBtn = document.getElementById('learning-save-samples-btn');
  elements.learningImportFileBtn = document.getElementById('learning-import-file-btn');
  elements.learningImportFileInput = document.getElementById('learning-import-file-input');
  elements.learningImportCategoryBtn = document.getElementById('learning-import-category-btn');
  elements.learningImportCategoryModal = document.getElementById('learning-import-category-modal');
  elements.learningImportCategoryList = document.getElementById('learning-import-category-list');
  elements.learningImportCategoryCancelBtn = document.getElementById('learning-import-category-cancel-btn');
  elements.learningAddCategoryBtn = document.getElementById('learning-add-category-btn');
  elements.learningRenameCategoryBtn = document.getElementById('learning-rename-category-btn');
  elements.learningDeleteCategoryBtn = document.getElementById('learning-delete-category-btn');
  elements.learningCategoryList = document.getElementById('learning-category-list');
  elements.learningSamplesTextarea = document.getElementById('learning-samples-textarea');
  elements.learningCurrentCatLabel = document.getElementById('learning-current-cat-label');
  elements.learningSampleCount = document.getElementById('learning-sample-count');
  elements.learningModelStatusText = document.getElementById('learning-model-status-text');
  elements.tokenizerDiagnosticBtn = document.getElementById('tokenizer-diagnostic-btn');
  elements.tokenizerDiagnosticInfo = document.getElementById('tokenizer-diagnostic-info');
  elements.learningEnabledCheckbox = document.getElementById('learning-enabled-checkbox');
  elements.learningMinConfidenceSelect = document.getElementById('learning-min-confidence-select');
  // 设置面板中的学习模型 info-value（与 learning.js 状态同步）
  elements.learningModelStatusInfo = document.getElementById('learning-model-status');
  elements.learningSampleCountInfo = document.getElementById('learning-sample-count');
  elements.learningCategoryCountInfo = document.getElementById('learning-category-count');
}

/**
 * 应用自定义布局到 DOM
 * - 设置面板 flex-grow 比例（通过 CSS 变量）
 * - 设置面板顺序（通过 order 属性）
 * - 设置布局方向（三栏 row / 单栏 column）
 * - 切换 locked 类（禁用响应式）
 * 在初始化、设置加载/保存后调用
 */
export function applyCustomLayout() {
  const layout = appState.settings.customLayout;
  if (!layout || !layout.panels) return;
  const { panels, locked, direction } = layout;
  const body = document.body;
  const root = document.documentElement;

  // 设置 flex-grow 比例 CSS 变量（三栏模式分配宽度，单栏模式分配高度）
  root.style.setProperty('--layout-category-ratio', panels.category.ratio);
  root.style.setProperty('--layout-prompt-ratio', panels.prompt.ratio);
  root.style.setProperty('--layout-preview-ratio', panels.preview.ratio);

  // 设置 order 属性控制面板顺序
  if (elements.categoryPanel) elements.categoryPanel.style.order = panels.category.order;
  if (elements.promptPanel)   elements.promptPanel.style.order = panels.prompt.order;
  if (elements.previewPanel)  elements.previewPanel.style.order = panels.preview.order;

  // 布局方向：三栏 row / 单栏 column
  if (direction === 'column') {
    body.classList.add('layout-single-column');
    body.classList.remove('layout-three-column');
  } else {
    body.classList.add('layout-three-column');
    body.classList.remove('layout-single-column');
  }

  // 锁死布局：添加/移除 class
  if (locked) {
    body.classList.add('layout-locked');
  } else {
    body.classList.remove('layout-locked');
  }
}

export function renderCategoryList() {
  elements.categoryList.innerHTML = '';
  const frag = document.createDocumentFragment();
  appState.categories.forEach((category, index) => {
    const item = document.createElement('li');
    item.className = `category-item ${appState.selectedCategoryId === category.id ? 'active' : ''}`;
    item.dataset.categoryId = category.id;

    if (_categoryBatchMode) {
      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'category-list-checkbox';
      cb.checked = _categoryBatchSelected.has(category.id);
      cb.addEventListener('change', () => {
        if (cb.checked) _categoryBatchSelected.add(category.id);
        else _categoryBatchSelected.delete(category.id);
        _updateCategoryBatchInfo();
      });
      item.appendChild(cb);
    }

    const leftSection = document.createElement('div');
    leftSection.className = 'category-item-left';

    if (!_categoryBatchMode) {
      const sortBtns = document.createElement('div');
      sortBtns.className = 'category-sort-btns';
      const upBtn = document.createElement('button');
      upBtn.className = 'category-sort-btn';
      upBtn.innerHTML = '<i class="fa fa-chevron-up"></i>';
      upBtn.title = '上移';
      upBtn.disabled = index === 0;
      upBtn.addEventListener('click', e => { e.stopPropagation(); handlers.moveCategoryUp(category.id); });
      const downBtn = document.createElement('button');
      downBtn.className = 'category-sort-btn';
      downBtn.innerHTML = '<i class="fa fa-chevron-down"></i>';
      downBtn.title = '下移';
      downBtn.disabled = index === appState.categories.length - 1;
      downBtn.addEventListener('click', e => { e.stopPropagation(); handlers.moveCategoryDown(category.id); });
      sortBtns.appendChild(upBtn);
      sortBtns.appendChild(downBtn);
      leftSection.appendChild(sortBtns);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    nameSpan.textContent = category.name;
    leftSection.appendChild(nameSpan);
    item.appendChild(leftSection);

    const actions = document.createElement('div');
    actions.className = 'category-actions';

    if (!_categoryBatchMode) {
      if (!category.isDefault) {
        const editBtn = document.createElement('button');
        editBtn.className = 'category-action-btn';
        editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
        editBtn.title = '编辑分类';
        editBtn.addEventListener('click', e => { e.stopPropagation(); handlers.editCategory(category.id); });
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'category-action-btn';
        deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
        deleteBtn.title = '删除分类';
        deleteBtn.addEventListener('click', e => { e.stopPropagation(); handlers.deleteCategory(category.id); });
        actions.appendChild(editBtn);
        actions.appendChild(deleteBtn);
      } else {
        const editBtn = document.createElement('button');
        editBtn.className = 'category-action-btn';
        editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
        editBtn.title = '编辑提示词';
        editBtn.addEventListener('click', e => { e.stopPropagation(); handlers.openPromptModal(category.id); });
        actions.appendChild(editBtn);
      }
    }

    item.appendChild(actions);
    item.addEventListener('click', () => {
      if (_categoryBatchMode) return;
      handlers.selectCategory(category.id);
    });
    frag.appendChild(item);
  });
  elements.categoryList.appendChild(frag);
}

export function renderCustomCategoryList() {
  elements.customCategoryList.innerHTML = '';
  const custom = appState.categories.filter(cat => !cat.isDefault);
  if (custom.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-list';
    emptyItem.textContent = '暂无自定义分类';
    elements.customCategoryList.appendChild(emptyItem);
    return;
  }
  const frag = document.createDocumentFragment();
  custom.forEach(category => {
    const item = document.createElement('li');
    item.className = 'custom-category-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.className = 'category-batch-checkbox';
    checkbox.dataset.categoryId = category.id;
    checkbox.addEventListener('click', e => e.stopPropagation());
    const text = document.createElement('span');
    text.textContent = category.name;
    const actions = document.createElement('div');
    actions.className = 'category-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'category-action-btn';
    editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
    editBtn.title = '编辑分类';
    editBtn.addEventListener('click', () => { handlers.editCategory(category.id); });
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'category-action-btn';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.title = '删除分类';
    deleteBtn.addEventListener('click', () => { handlers.deleteCategory(category.id); });
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);
    item.appendChild(checkbox);
    item.appendChild(text);
    item.appendChild(actions);
    frag.appendChild(item);
  });
  elements.customCategoryList.appendChild(frag);
}

function handlePromptToggle(categoryId, prompt) {
  handlers.togglePrompt(categoryId, prompt);
  renderPromptList(categoryId);
}

export function renderPromptList(categoryId) {
  const targetId = categoryId || appState.selectedCategoryId;
  const category = getCategoryById(appState.categories, targetId);
  if (!category) {
    elements.currentCategoryTitle.textContent = '请选择分类';
    elements.promptList.innerHTML = '<div class="no-prompts">请从左侧选择一个分类</div>';
    elements.frequentSection.classList.add('hidden');
    return;
  }
  elements.currentCategoryTitle.textContent = category.name;
  if (category.prompts.length === 0) {
    elements.promptList.innerHTML = '<div class="no-prompts">此分类下暂无提示词</div>';
    elements.frequentSection.classList.add('hidden');
    return;
  }

  if (appState.batchMode) {
    elements.frequentSection.classList.add('hidden');
  } else {
    renderFrequentPrompts(targetId);
  }

  elements.promptList.innerHTML = '';
  const frag = document.createDocumentFragment();
  category.prompts.forEach(prompt => {
    const item = document.createElement('div');
    const promptKey = createPromptKey(category.id, getPromptText(prompt));
    const hasImage = typeof prompt === 'object' && prompt !== null && prompt.imagePath;

    const textContainer = document.createElement('div');
    textContainer.className = 'prompt-text-container';
    const text = document.createElement('span');
    text.className = 'prompt-text';
    text.textContent = getPromptText(prompt);
    textContainer.appendChild(text);

    if (appState.settings.translationEnabled) {
      textContainer.appendChild(createTranslationUI(category.id, prompt));
    }

    if (hasImage) {
      const imgIcon = document.createElement('span');
      imgIcon.className = 'prompt-image-icon';
      imgIcon.innerHTML = '<i class="fa fa-camera"></i>';
      imgIcon.title = '已设置预览图';
      textContainer.appendChild(imgIcon);
    }

    if (appState.batchMode) {
      // 批量模式：不显示选用复选框，点击卡片任意位置切换批量选中，红色高亮
      item.className = `prompt-item ${appState.batchSelected.has(promptKey) ? 'batch-selected' : ''}`;
      item.appendChild(textContainer);
      item.addEventListener('click', e => {
        if (e.target.closest('.editable-translation') || e.target.closest('.inline-translate-btn') || e.target.closest('.translation-edit-input') || e.target.closest('.prompt-image-icon')) return;
        if (appState.batchSelected.has(promptKey)) {
          appState.batchSelected.delete(promptKey);
          item.classList.remove('batch-selected');
        } else {
          appState.batchSelected.add(promptKey);
          item.classList.add('batch-selected');
        }
        updateBatchInfo();
      });
    } else {
      // 正常模式：选用复选框 + 点击切换选用
      item.className = `prompt-item ${handlers.isPromptSelected(category.id, prompt) ? 'selected' : ''}`;

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'prompt-checkbox';
      cb.checked = handlers.isPromptSelected(category.id, prompt);
      cb.addEventListener('change', () => handlePromptToggle(category.id, prompt));

      item.appendChild(cb);
      item.appendChild(textContainer);
      item.addEventListener('click', e => {
        if (e.target !== cb && !e.target.closest('.editable-translation') && !e.target.closest('.inline-translate-btn') && !e.target.closest('.translation-edit-input') && !e.target.closest('.prompt-image-icon')) {
          cb.checked = !cb.checked;
          handlePromptToggle(category.id, prompt);
        }
      });
    }

    if (appState.settings.rightClickCopyEnabled) {
      item.addEventListener('contextmenu', e => {
        e.preventDefault();
        const text = buildRightClickCopyText(prompt);
        navigator.clipboard.writeText(text)
          .then(() => showNotification(`已复制: ${text.length > 30 ? text.substring(0, 30) + '...' : text}`, 'success'))
          .catch(() => showNotification('复制失败', 'error'));
      });
    } else {
      item.addEventListener('contextmenu', e => {
        e.preventDefault();
        _hideHoverPreview();
        showPromptContextMenu(category.id, prompt, e.clientX, e.clientY);
      });
    }
    if (hasImage) {
      attachHoverPreview(item, prompt);
    }
    frag.appendChild(item);
  });
  elements.promptList.appendChild(frag);
}

export function renderFrequentPrompts(categoryId) {
  const frequent = handlers.getFrequentPrompts ? handlers.getFrequentPrompts(categoryId, appState.settings.frequentCount || 10) : [];
  if (frequent.length === 0) {
    elements.frequentSection.classList.add('hidden');
    return;
  }
  elements.frequentSection.classList.remove('hidden');
  elements.frequentList.innerHTML = '';
  const frag = document.createDocumentFragment();
  frequent.forEach(item => {
    const el = document.createElement('div');
    const isSelected = handlers.isPromptSelected(categoryId, { text: item.text });
    el.className = `frequent-item ${isSelected ? 'selected' : ''}`;
    const textSpan = document.createElement('span');
    textSpan.textContent = item.text;
    const countSpan = document.createElement('span');
    countSpan.className = 'frequent-count';
    countSpan.textContent = item.count;
    el.appendChild(textSpan);
    el.appendChild(countSpan);
    el.addEventListener('click', () => {
      const category = getCategoryById(appState.categories, categoryId);
      if (!category) return;
      const prompt = findPromptInCategory(category, item.text);
      if (prompt) {
        handlers.togglePrompt(categoryId, prompt);
        renderPromptList(categoryId);
      }
    });
    frag.appendChild(el);
  });
  elements.frequentList.appendChild(frag);
}

export function createTranslationUI(categoryId, prompt) {
  const row = document.createElement('div');
  row.className = 'translation-edit-row';
  const translation = document.createElement('span');
  translation.className = 'prompt-translation editable-translation';
  translation.textContent = getPromptTranslation(prompt);
  translation.title = '点击编辑翻译';
  translation.addEventListener('click', e => { e.stopPropagation(); startEditTranslation(categoryId, prompt, translation); });
  const translateBtn = document.createElement('button');
  translateBtn.className = 'inline-translate-btn';
  translateBtn.innerHTML = '<i class="fa fa-language"></i>';
  translateBtn.title = '一键翻译';
  translateBtn.addEventListener('click', async e => { e.stopPropagation(); await inlineTranslatePrompt(categoryId, prompt, translation); });
  row.appendChild(translation);
  row.appendChild(translateBtn);
  return row;
}

export function startEditTranslation(categoryId, prompt, translationElement) {
  if (translationElement.querySelector('input')) return;
  const currentTranslation = getPromptTranslation(prompt);
  const currentText = getPromptText(prompt);
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'translation-edit-input';
  input.value = currentTranslation;
  input.placeholder = '输入翻译...';
  let editSaved = false;

  const saveEdit = () => {
    if (editSaved) return;
    editSaved = true;
    const newTranslation = input.value.trim();
    handlers.updatePromptTranslation(categoryId, currentText, newTranslation);
    translationElement.textContent = newTranslation;
    handlers.saveData();
    handlers.renderSelectedPrompts();
    handlers.renderPreview();
    if (newTranslation) showNotification('翻译已更新', 'success');
  };

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveEdit(); }
    else if (e.key === 'Escape') { editSaved = true; translationElement.textContent = currentTranslation; }
  });
  input.addEventListener('blur', saveEdit);
  input.addEventListener('click', e => e.stopPropagation());
  input.addEventListener('mousedown', e => e.stopPropagation());
  translationElement.textContent = '';
  translationElement.appendChild(input);
  input.focus();
  input.select();
}

export async function inlineTranslatePrompt(categoryId, prompt, translationElement) {
  const currentText = getPromptText(prompt);
  translationElement.textContent = '翻译中...';
  translationElement.style.opacity = '0.5';
  try {
    const translation = await handlers.translateText(currentText);
    if (translation) {
      handlers.updatePromptTranslation(categoryId, currentText, translation);
      translationElement.textContent = translation;
      translationElement.style.opacity = '';
      handlers.saveData();
      handlers.renderSelectedPrompts();
      handlers.renderPreview();
      showNotification(`"${currentText}" 翻译成功`, 'success');
    } else {
      translationElement.textContent = getPromptTranslation(prompt);
      translationElement.style.opacity = '';
      showNotification(`"${currentText}" 翻译失败，请手动编辑`, 'warning');
    }
  } catch (error) {
    translationElement.textContent = getPromptTranslation(prompt);
    translationElement.style.opacity = '';
    showNotification(`翻译失败: ${error.message}`, 'error');
  }
}

export function renderSelectedPrompts() {
  const count = Object.values(appState.selectedPrompts).flat().length;
  if (count === 0) {
    elements.selectedPrompts.innerHTML = '<div class="no-selected">暂无选中的提示词</div>';
    return;
  }
  elements.selectedPrompts.innerHTML = '';
  const frag = document.createDocumentFragment();
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = getCategoryById(appState.categories, categoryId);
    if (!category) return;
    const group = document.createElement('div');
    group.className = 'selected-category-group';
    const title = document.createElement('h4');
    title.className = 'selected-category-title';
    title.textContent = category.name;
    group.appendChild(title);

    appState.selectedPrompts[categoryId].forEach(prompt => {
      const item = document.createElement('div');
      item.className = 'selected-prompt-item';
      const textContainer = document.createElement('div');
      textContainer.className = 'selected-prompt-text-container';
      const text = document.createElement('span');
      text.className = 'selected-prompt-text';
      text.textContent = getPromptText(prompt);
      const translation = document.createElement('span');
      translation.className = 'selected-prompt-translation';
      translation.textContent = getPromptTranslation(prompt);
      textContainer.appendChild(text);
      if (appState.settings.translationEnabled && translation.textContent.trim()) {
        textContainer.appendChild(translation);
      }
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-prompt-btn';
      removeBtn.innerHTML = '<i class="fa fa-times"></i>';
      removeBtn.title = '移除提示词';
      removeBtn.addEventListener('click', () => { handlers.togglePrompt(categoryId, prompt); handlers.renderPromptList(categoryId); });
      item.appendChild(textContainer);
      item.appendChild(removeBtn);
      group.appendChild(item);
    });
    frag.appendChild(group);
  });
  elements.selectedPrompts.appendChild(frag);
}

export function renderPreview() {
  const count = Object.values(appState.selectedPrompts).flat().length;
  if (count === 0) {
    elements.previewOutput.innerHTML = '<p class="placeholder">请选择提示词以预览组合效果</p>';
    return;
  }
  elements.previewOutput.innerHTML = '';
  const allPrompts = [];
  Object.values(appState.selectedPrompts).forEach(arr => {
    arr.forEach(p => allPrompts.push(getPromptText(p)));
  });
  const promptSpan = document.createElement('span');
  promptSpan.textContent = allPrompts.join(', ');
  elements.previewOutput.appendChild(promptSpan);
  if (appState.settings.translationEnabled && appState.settings.showTranslationInPreview) {
    const allTranslations = Object.values(appState.selectedPrompts)
      .flat()
      .map(p => getPromptTranslation(p))
      .filter(Boolean);
    if (allTranslations.length > 0) {
      elements.previewOutput.appendChild(document.createElement('br'));
      const div = document.createElement('div');
      div.className = 'preview-translation';
      div.textContent = allTranslations.join('，');
      elements.previewOutput.appendChild(div);
    }
  }
}

export function renderRandomCategorySelector() {
  if (!elements.randomCategorySelector) return;
  const existingChecked = new Set();
  elements.randomCategorySelector.querySelectorAll('input[type="checkbox"]:checked').forEach(cb => {
    existingChecked.add(cb.value);
  });
  const frag = document.createDocumentFragment();
  appState.categories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'category-checkbox-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `random-cat-${category.id}`;
    cb.value = category.id;
    cb.className = 'random-category-checkbox';
    if (existingChecked.has(category.id)) cb.checked = true;
    const label = document.createElement('label');
    label.htmlFor = `random-cat-${category.id}`;
    label.textContent = category.name;
    item.appendChild(cb);
    item.appendChild(label);
    frag.appendChild(item);
  });
  elements.randomCategorySelector.innerHTML = '';
  elements.randomCategorySelector.appendChild(frag);
}

export function showNotification(message, type = 'success') {
  const existing = document.querySelectorAll('.notification');
  if (existing.length >= NOTIFICATION_MAX_COUNT) existing[0].remove();
  const icons = { success: '\u2713', error: '\u2717', warning: '\u26A0', info: '\u2139' };
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;

  const content = document.createElement('div');
  content.className = 'notification-content';
  const iconSpan = document.createElement('span');
  iconSpan.className = 'notification-icon';
  iconSpan.textContent = icons[type] || icons.info;
  const textSpan = document.createElement('span');
  textSpan.className = 'notification-text';
  textSpan.textContent = message;
  content.appendChild(iconSpan);
  content.appendChild(textSpan);

  const progress = document.createElement('div');
  progress.className = 'notification-progress';

  notification.appendChild(content);
  notification.appendChild(progress);

  const currentNotifications = document.querySelectorAll('.notification');
  const offset = 16 + currentNotifications.length * 56;
  Object.assign(notification.style, { position: 'fixed', top: offset + 'px', right: '16px', zIndex: '10000' });
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('hiding');
    setTimeout(() => {
      if (notification.parentNode) document.body.removeChild(notification);
      repositionNotifications();
    }, 300);
  }, NOTIFICATION_DURATION);
}

function repositionNotifications() {
  const notifications = document.querySelectorAll('.notification');
  notifications.forEach((n, i) => {
    n.style.top = (16 + i * 56) + 'px';
  });
}

export function showConfirmDialog(title, message, icon, onConfirm) {
  return new Promise((resolve) => {
    elements.confirmIcon.textContent = icon || '⚠️';
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmDialog.classList.add('active');

    const cleanup = () => {
      elements.confirmDialog.removeEventListener('keydown', keyHandler);
    };

    const keyHandler = (e) => {
      if (e.key === 'Escape') {
        elements.confirmDialog.classList.remove('active');
        cleanup();
        resolve(false);
      }
    };

    elements.confirmOkBtn.onclick = () => {
      elements.confirmDialog.classList.remove('active');
      cleanup();
      if (onConfirm) onConfirm();
      resolve(true);
    };
    elements.confirmCancelBtn.onclick = () => {
      elements.confirmDialog.classList.remove('active');
      cleanup();
      resolve(false);
    };
    elements.confirmDialog.addEventListener('keydown', keyHandler);
  });
}

export function showInputDialog(title, defaultValue = '', placeholder = '') {
  return new Promise((resolve) => {
    let dialog = document.getElementById('input-dialog');
    if (!dialog) {
      dialog = document.createElement('div');
      dialog.id = 'input-dialog';
      dialog.className = 'confirm-dialog';
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-modal', 'true');
      dialog.innerHTML = `
        <div class="confirm-content">
          <h3 class="input-dialog-title"></h3>
          <input type="text" class="form-input input-dialog-input">
          <div class="confirm-actions">
            <button class="btn btn-secondary input-dialog-cancel">取消</button>
            <button class="btn btn-primary input-dialog-ok">确定</button>
          </div>
        </div>
      `;
      document.body.appendChild(dialog);
    }
    dialog.querySelector('.input-dialog-title').textContent = title;
    const input = dialog.querySelector('.input-dialog-input');
    input.value = defaultValue;
    input.placeholder = placeholder || '';

    const okBtn = dialog.querySelector('.input-dialog-ok');
    const cancelBtn = dialog.querySelector('.input-dialog-cancel');

    const cleanup = (value) => {
      dialog.classList.remove('active');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      input.removeEventListener('keydown', onKeydown);
      resolve(value);
    };

    const onOk = () => cleanup(input.value);
    const onCancel = () => cleanup(null);
    const onKeydown = (e) => {
      if (e.key === 'Enter') cleanup(input.value);
      else if (e.key === 'Escape') cleanup(null);
    };

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    input.addEventListener('keydown', onKeydown);

    dialog.classList.add('active');
    setTimeout(() => { input.focus(); input.select(); }, 100);
  });
}

export function renderCategoryPromptsList(categoryId) {
  const category = getCategoryById(appState.categories, categoryId);
  if (!category) return;
  elements.categoryPromptsList.innerHTML = '';
  if (category.prompts.length === 0) {
    const emptyItem = document.createElement('li');
    emptyItem.className = 'empty-list';
    emptyItem.textContent = '暂无提示词';
    elements.categoryPromptsList.appendChild(emptyItem);
    return;
  }
  const frag = document.createDocumentFragment();
  category.prompts.forEach((prompt, index) => {
    const item = document.createElement('li');
    item.className = 'category-prompt-item';
    item.draggable = true;
    item.dataset.index = index;

    const dragHandle = document.createElement('span');
    dragHandle.className = 'drag-handle';
    dragHandle.innerHTML = '<i class="fa fa-bars"></i>';

    const textContainer = document.createElement('div');
    textContainer.className = 'prompt-text-container';
    const text = document.createElement('span');
    text.className = 'prompt-text';
    text.textContent = getPromptText(prompt);
    textContainer.appendChild(text);
    if (appState.settings.translationEnabled) textContainer.appendChild(createTranslationUI(categoryId, prompt));

    const actions = document.createElement('div');
    actions.className = 'prompt-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'category-action-btn';
    editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
    editBtn.title = '编辑提示词';
    editBtn.addEventListener('click', () => handlers.editPrompt(categoryId, index));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'category-action-btn';
    deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
    deleteBtn.title = '删除提示词';
    deleteBtn.addEventListener('click', () => handlers.deletePrompt(categoryId, index));
    actions.appendChild(editBtn);
    actions.appendChild(deleteBtn);

    item.appendChild(dragHandle);
    item.appendChild(textContainer);
    item.appendChild(actions);

    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', index.toString());
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => item.classList.remove('dragging'));
    item.addEventListener('dragover', e => {
      e.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', e => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
      const toIndex = parseInt(item.dataset.index);
      if (fromIndex !== toIndex) {
        const moved = category.prompts.splice(fromIndex, 1)[0];
        category.prompts.splice(toIndex, 0, moved);
        renderCategoryPromptsList(categoryId);
        if (appState.selectedCategoryId === categoryId) handlers.renderPromptList(categoryId);
        handlers.saveData();
      }
    });

    frag.appendChild(item);
  });
  elements.categoryPromptsList.appendChild(frag);
}

function updateBatchInfo() {
  if (elements.batchInfo) elements.batchInfo.textContent = `已选择 ${appState.batchSelected.size} 项`;
}

function _updateCategoryBatchInfo() {
  if (elements.categoryBatchInfo) {
    elements.categoryBatchInfo.textContent = `已选择 ${_categoryBatchSelected.size} 项`;
  }
}

export function toggleCategoryBatchMode() {
  _categoryBatchMode = !_categoryBatchMode;
  if (_categoryBatchMode) {
    _categoryBatchSelected = new Set();
    if (elements.categoryBatchBar) elements.categoryBatchBar.classList.add('active');
  } else {
    _categoryBatchSelected = new Set();
    if (elements.categoryBatchBar) elements.categoryBatchBar.classList.remove('active');
  }
  renderCategoryList();
  _updateCategoryBatchInfo();
}

export function exitCategoryBatchMode() {
  _categoryBatchMode = false;
  _categoryBatchSelected = new Set();
  if (elements.categoryBatchBar) elements.categoryBatchBar.classList.remove('active');
  renderCategoryList();
}

export async function categoryBatchDelete() {
  if (_categoryBatchSelected.size === 0) {
    showNotification('请先勾选要删除的分类', 'warning');
    return;
  }
  const ids = [..._categoryBatchSelected];
  let confirmed = false;
  try {
    confirmed = await showConfirmDialog('批量删除分类', `确定要删除选中的 ${ids.length} 个分类及其所有提示词吗？`, '⚠️');
  } catch (e) {
    console.error('categoryBatchDelete confirm error:', e);
    return;
  }
  if (!confirmed) return;

  if (window.electronAPI && window.electronAPI.deleteCategoryImages) {
    for (const id of ids) {
      const cat = getCategoryById(appState.categories, id);
      try { await window.electronAPI.deleteCategoryImages(cat ? cat.name : id); } catch (e) {}
    }
  }

  for (const id of ids) {
    delete appState.selectedPrompts[id];
  }
  appState.categories = appState.categories.filter(cat => !ids.includes(cat.id));
  if (ids.includes(appState.selectedCategoryId)) {
    appState.selectedCategoryId = appState.categories.length > 0 ? appState.categories[0].id : null;
  }

  saveDataImmediate();

  exitCategoryBatchMode();
  renderCategoryList();
  renderRandomCategorySelector();
  renderCustomCategoryList();
  if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
  renderSelectedPrompts();
  renderPreview();
  showNotification(`已删除 ${ids.length} 个分类`, 'success');
}

export { _categoryBatchMode };

export function buildRightClickCopyText(prompt) {
  const config = appState.settings.rightClickCopyConfig || {
    includeOriginal: true, includeTranslation: true, connector: ', ', order: 'original-first', appendConnector: false
  };
  const original = getPromptText(prompt);
  const translation = getPromptTranslation(prompt);
  const parts = [];
  if (config.order === 'translation-first') {
    if (config.includeTranslation && translation) parts.push(translation);
    if (config.includeOriginal) parts.push(original);
  } else {
    if (config.includeOriginal) parts.push(original);
    if (config.includeTranslation && translation) parts.push(translation);
  }
  let connector = config.connector;
  if (connector === 'custom') connector = config.customConnector || ', ';
  let result;
  if (parts.length === 0) result = original;
  else if (parts.length === 1) result = parts[0];
  else result = parts.join(connector);
  if (config.appendConnector) result += connector;
  return result;
}

// ================================
// Prompt Image Preview Feature
// ================================

let _promptImageEditTarget = null;
let _hoverPreviewTimer = null;
// LRU 图片缓存，限制最大 20 条（每条 50-200KB base64），避免内存无限增长
const _IMAGE_CACHE_MAX = 20;
const _imageCache = new Map();

function _cacheImage(key, value) {
  if (_imageCache.size >= _IMAGE_CACHE_MAX) {
    // 删除最旧条目（Map 保持插入顺序，第一个即最旧）
    const oldestKey = _imageCache.keys().next().value;
    _imageCache.delete(oldestKey);
  }
  _imageCache.set(key, value);
}

function _getCachedImage(key) {
  if (!_imageCache.has(key)) return null;
  // LRU：移动到末尾（最近使用）
  const value = _imageCache.get(key);
  _imageCache.delete(key);
  _imageCache.set(key, value);
  return value;
}

function _closePromptContextMenu() {
  const existing = document.querySelector('.prompt-context-menu');
  if (existing) existing.remove();
}

export function showPromptContextMenu(categoryId, prompt, x, y) {
  _closePromptContextMenu();
  const hasImage = typeof prompt === 'object' && prompt !== null && prompt.imagePath;
  const menu = document.createElement('div');
  menu.className = 'prompt-context-menu';
  menu.style.left = x + 'px';
  menu.style.top = y + 'px';

  const addOrReplace = document.createElement('div');
  addOrReplace.className = 'context-menu-item primary';
  addOrReplace.innerHTML = `<i class="fa fa-camera"></i> ${hasImage ? '更换预览图' : '添加预览图'}`;
  addOrReplace.addEventListener('click', () => {
    _closePromptContextMenu();
    _promptImageEditTarget = { categoryId, prompt };
    if (elements.promptImageFileInput) {
      elements.promptImageFileInput.value = '';
      elements.promptImageFileInput.click();
    }
  });
  menu.appendChild(addOrReplace);

  if (hasImage) {
    const enlargeItem = document.createElement('div');
    enlargeItem.className = 'context-menu-item';
    enlargeItem.innerHTML = '<i class="fa fa-search-plus"></i> 放大看看';
    enlargeItem.addEventListener('click', () => {
      _closePromptContextMenu();
      _showEnlargedPreview(prompt);
    });
    menu.appendChild(enlargeItem);

    const deleteItem = document.createElement('div');
    deleteItem.className = 'context-menu-item';
    deleteItem.innerHTML = '<i class="fa fa-trash"></i> 删除预览图';
    deleteItem.addEventListener('click', () => {
      _closePromptContextMenu();
      handleDeletePromptImage(categoryId, prompt);
    });
    menu.appendChild(deleteItem);
  }

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener('click', _closePromptContextMenuOnce, { once: true });
  }, 0);
}

function _closePromptContextMenuOnce() {
  _closePromptContextMenu();
}

export async function handleDeletePromptImage(categoryId, prompt) {
  if (!prompt.imagePath) return;
  const confirmed = await showConfirmDialog('删除预览图', '确定要删除此提示词的预览图吗？', '⚠️');
  if (!confirmed) return;
  if (window.electronAPI && window.electronAPI.deletePromptImage) {
    await window.electronAPI.deletePromptImage(prompt.imagePath);
  }
  _imageCache.delete(prompt.imagePath);
  prompt.imagePath = '';
  handlers.saveData();
  renderPromptList(categoryId);
  showNotification('预览图已删除', 'success');
}


async function _computeImageFilename(categoryName, text) {
  const cat = sanitizeFilename(categoryName) || 'category';
  const prompt = sanitizeFilename(text) || 'prompt';
  return `${cat}_${prompt}.jpg`;
}

async function _compressImageWithCanvas(base64Data, maxDimension) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (maxDimension && (width > maxDimension || height > maxDimension)) {
        if (width >= height) {
          height = Math.round(height * maxDimension / width);
          width = maxDimension;
        } else {
          width = Math.round(width * maxDimension / height);
          height = maxDimension;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => reject(new Error('Image load failed'));
    img.src = base64Data;
  });
}

export async function handlePromptImageFileSelect(event) {
  const file = event.target.files[0];
  if (!file || !_promptImageEditTarget) return;
  const { categoryId, prompt } = _promptImageEditTarget;
  _promptImageEditTarget = null;

  if (!file.type.startsWith('image/')) {
    showNotification('请选择图片文件', 'error');
    return;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      let base64Data = e.target.result;
      const config = appState.settings.previewImage || { limitEnabled: true, maxDimension: 200 };
      if (config.limitEnabled !== false) {
        base64Data = await _compressImageWithCanvas(base64Data, config.maxDimension || 200);
      }
      const category = getCategoryById(appState.categories, categoryId);
      const categoryName = category ? category.name : categoryId;
      const filename = await _computeImageFilename(categoryName, getPromptText(prompt));
      if (window.electronAPI && window.electronAPI.savePromptImage) {
        const result = await window.electronAPI.savePromptImage(filename, base64Data);
        if (!result.success) {
          showNotification('图片保存失败: ' + (result.error || ''), 'error');
          return;
        }
        if (prompt.imagePath && prompt.imagePath !== result.filename) {
          await window.electronAPI.deletePromptImage(prompt.imagePath);
          _imageCache.delete(prompt.imagePath);
        }
        prompt.imagePath = result.filename;
      } else {
        prompt.imagePath = filename;
      }
      _cacheImage(prompt.imagePath, base64Data);
      handlers.saveData();
      renderPromptList(categoryId);
      showNotification('预览图已设置', 'success');
    } catch (err) {
      showNotification('图片处理失败: ' + err.message, 'error');
    }
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

export function attachHoverPreview(item, prompt) {
  let hoverTimer = null;
  let hoverRafId = null;
  // 持续跟踪最新鼠标位置，确保 300ms 延迟后显示预览图时使用最新位置
  let lastMouseX = 0;
  let lastMouseY = 0;

  item.addEventListener('mouseenter', (e) => {
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    hoverTimer = setTimeout(() => _showHoverPreview(prompt, lastMouseX, lastMouseY), 300);
  });
  item.addEventListener('mouseleave', () => {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    _hideHoverPreview();
  });
  item.addEventListener('mousemove', (e) => {
    // 始终更新最新鼠标位置（即使预览图未显示）
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    if (!elements.promptImagePreview || elements.promptImagePreview.style.display !== 'block') return;
    if (hoverRafId) return;
    hoverRafId = requestAnimationFrame(() => {
      hoverRafId = null;
      _positionHoverPreview(lastMouseX, lastMouseY);
    });
  });
}

async function _showHoverPreview(prompt, x, y) {
  if (!prompt.imagePath || !elements.promptImagePreview) return;
  const preview = elements.promptImagePreview;
  const img = elements.promptImagePreviewImg;
  const config = appState.settings.previewImage || {};
  const displaySize = (config.displaySize && config.displaySize >= 100 && config.displaySize <= 500) ? config.displaySize : 220;
  preview.style.maxWidth = displaySize + 'px';
  preview.style.maxHeight = displaySize + 'px';
  img.style.maxHeight = (displaySize - 12) + 'px';

  // 使用传入的最新鼠标位置定位
  _positionHoverPreview(x, y, displaySize);
  preview.style.display = 'block';

  const cached = _getCachedImage(prompt.imagePath);
  if (cached) {
    img.src = cached;
    return;
  }

  img.src = '';
  if (window.electronAPI && window.electronAPI.readPromptImage) {
    try {
      const result = await window.electronAPI.readPromptImage(prompt.imagePath);
      if (result.success) {
        img.src = result.data;
        _cacheImage(prompt.imagePath, result.data);
      } else {
        img.alt = '图片不存在';
        preview.style.display = 'none';
        showNotification('预览图文件不存在', 'warning');
      }
    } catch (err) {
      preview.style.display = 'none';
    }
  }
}

function _positionHoverPreview(x, y, displaySize) {
  const preview = elements.promptImagePreview;
  if (!preview) return;
  const offset = 16;
  const previewWidth = displaySize || 220;
  const previewHeight = displaySize || 220;
  let left = x + offset;
  let top = y + offset;
  if (left + previewWidth > window.innerWidth) left = x - previewWidth - offset;
  if (top + previewHeight > window.innerHeight) top = y - previewHeight - offset;
  preview.style.left = left + 'px';
  preview.style.top = top + 'px';
}

function _hideHoverPreview() {
  if (elements.promptImagePreview) {
    elements.promptImagePreview.style.display = 'none';
  }
}

async function _showEnlargedPreview(prompt) {
  if (!prompt.imagePath || !elements.promptImageEnlargedModal) return;
  const modal = elements.promptImageEnlargedModal;
  const img = elements.promptImageEnlargedImg;
  const config = appState.settings.previewImage || {};
  const displaySize = (config.displaySize && config.displaySize >= 100 && config.displaySize <= 500) ? config.displaySize : 220;
  const enlargedSize = Math.min(displaySize * 2, Math.floor(window.innerWidth * 0.8), Math.floor(window.innerHeight * 0.8));
  const content = modal.querySelector('.prompt-image-enlarged-content');
  if (content) {
    content.style.maxWidth = enlargedSize + 'px';
    content.style.maxHeight = enlargedSize + 'px';
  }
  img.style.maxWidth = (enlargedSize - 32) + 'px';
  img.style.maxHeight = (enlargedSize - 32) + 'px';
  img.src = '';

  const cachedEnlarged = _getCachedImage(prompt.imagePath);
  if (cachedEnlarged) {
    img.src = cachedEnlarged;
    modal.classList.add('active');
    return;
  }

  if (window.electronAPI && window.electronAPI.readPromptImage) {
    try {
      const result = await window.electronAPI.readPromptImage(prompt.imagePath);
      if (result.success) {
        img.src = result.data;
        _cacheImage(prompt.imagePath, result.data);
        modal.classList.add('active');
      } else {
        showNotification('预览图文件不存在', 'warning');
      }
    } catch (err) {
      showNotification('预览图读取失败', 'error');
    }
  }
}

function _hideEnlargedPreview() {
  if (elements.promptImageEnlargedModal) {
    elements.promptImageEnlargedModal.classList.remove('active');
  }
}

export function initPromptImageUpload() {
  if (elements.promptImageFileInput) {
    elements.promptImageFileInput.addEventListener('change', handlePromptImageFileSelect);
  }
  document.addEventListener('click', () => {
    if (elements.promptImagePreview) {
      elements.promptImagePreview.style.display = 'none';
    }
  }, true);
  if (elements.promptImageEnlargedClose) {
    elements.promptImageEnlargedClose.addEventListener('click', _hideEnlargedPreview);
  }
  if (elements.promptImageEnlargedModal) {
    elements.promptImageEnlargedModal.addEventListener('click', (e) => {
      if (e.target === elements.promptImageEnlargedModal) _hideEnlargedPreview();
    });
  }
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.promptImageEnlargedModal && elements.promptImageEnlargedModal.classList.contains('active')) {
      _hideEnlargedPreview();
    }
  });
}

// ================================
// Local Tokenizer Classifier
// ================================

/**
 * 打开本地分词分类器弹窗
 * - 清空输入区、结果区、统计文本
 * - 添加 modal-active 类显示弹窗
 * - 自动聚焦输入框
 */
export function openTokenizerModal() {
  if (!elements.tokenizerModal) return;
  if (elements.tokenizerInput) elements.tokenizerInput.value = '';
  if (elements.tokenizerResults) elements.tokenizerResults.innerHTML = '';
  if (elements.tokenizerStats) elements.tokenizerStats.textContent = '';
  elements.tokenizerModal.classList.add('modal-active');
  // 兼容 .modal 默认 display:none，确保弹窗可见
  elements.tokenizerModal.style.display = 'block';
  if (elements.tokenizerInput) {
    setTimeout(() => elements.tokenizerInput.focus(), 50);
  }
}

/**
 * 关闭本地分词分类器弹窗
 * - 移除 modal-active 类
 * - 隐藏弹窗
 */
export function closeTokenizerModal() {
  if (!elements.tokenizerModal) return;
  elements.tokenizerModal.classList.remove('modal-active');
  elements.tokenizerModal.style.display = 'none';
}

/**
 * 渲染分词分类结果
 * - 接收 results 数组，每项 {tag, category, subgroup, matched, source, selected, imported}
 * - 按 category 分组，general 类别内再按 subgroup 二级分组
 * - 每组渲染组标题（色点 + label + 计数）+ chips 容器
 * - 类别颜色优先从 appState.tokenizerCache.dictionary.categories[cat].color 获取，找不到用 #64748b
 * @param {Array<{tag:string, category:string, subgroup?:string, matched:boolean, source:string, selected?:boolean, imported?:boolean}>} results - 分类结果数组
 */
export function renderTokenizerResults(results) {
  if (!elements.tokenizerResults) return;
  elements.tokenizerResults.innerHTML = '';
  if (!results || results.length === 0) return;

  // 获取类别元信息（label + color）
  const dict = (appState.tokenizerCache && appState.tokenizerCache.dictionary) || {};
  const categories = dict.categories || {};

  /**
   * 内部辅助：获取类别 label 与 color
   * @param {string} cat - 类别 id
   * @returns {{label:string, color:string}}
   */
  const getCategoryMeta = (cat) => {
    const meta = categories[cat] || {};
    return {
      label: meta.label || cat,
      color: meta.color || '#64748b'
    };
  };

  // 一级分组：按 category 聚合
  const grouped = {};
  results.forEach(item => {
    const cat = item.category || 'general';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(item);
  });

  // general 类别放到最后（与其他 danbooru 体系一致：character/artist/copyright/meta 优先）
  const categoryOrder = Object.keys(grouped).sort((a, b) => {
    if (a === 'general' && b !== 'general') return 1;
    if (b === 'general' && a !== 'general') return -1;
    return a.localeCompare(b);
  });

  const frag = document.createDocumentFragment();

  categoryOrder.forEach(cat => {
    const items = grouped[cat];
    const meta = getCategoryMeta(cat);

    const groupEl = document.createElement('div');
    groupEl.className = 'tokenizer-group';

    // 组标题（色点 + label + 计数）
    const header = document.createElement('div');
    header.className = 'tokenizer-group-header';
    const dot = document.createElement('span');
    dot.className = 'group-color-dot';
    dot.style.backgroundColor = meta.color;
    const label = document.createElement('span');
    label.className = 'group-label';
    label.textContent = meta.label;
    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = `(${items.length})`;
    header.appendChild(dot);
    header.appendChild(label);
    header.appendChild(count);
    groupEl.appendChild(header);

    if (cat === 'general') {
      // general 类别内按 subgroup 二级分组
      const subGrouped = {};
      items.forEach(it => {
        const sub = it.subgroup || 'other';
        if (!subGrouped[sub]) subGrouped[sub] = [];
        subGrouped[sub].push(it);
      });
      // 获取 subgroup label 映射
      const subgroups = (categories.general && categories.general.subgroups) || {};

      Object.keys(subGrouped).forEach(sub => {
        const subItems = subGrouped[sub];
        const subHeader = document.createElement('div');
        subHeader.className = 'tokenizer-subgroup-header';
        subHeader.textContent = subgroups[sub] || sub;
        groupEl.appendChild(subHeader);

        const chips = document.createElement('div');
        chips.className = 'tokenizer-chips';
        subItems.forEach(it => chips.appendChild(_buildTokenizerChip(it, meta.color)));
        groupEl.appendChild(chips);
      });
    } else {
      // 非 general 类别直接平铺 chips
      const chips = document.createElement('div');
      chips.className = 'tokenizer-chips';
      items.forEach(it => chips.appendChild(_buildTokenizerChip(it, meta.color)));
      groupEl.appendChild(chips);
    }

    frag.appendChild(groupEl);
  });

  elements.tokenizerResults.appendChild(frag);
  updateTokenizerToolbar();
}

/**
 * 内部辅助：构造单个 chip 元素
 * @param {{tag:string, category:string, subgroup?:string, matched:boolean, selected?:boolean, imported?:boolean}} item
 * @param {string} categoryColor - 类别色
 * @returns {HTMLElement}
 */
function _buildTokenizerChip(item, categoryColor) {
  const chip = document.createElement('div');
  const selected = !!item.selected;
  const imported = !!item.imported;
  const matched = item.matched !== false;
  const learned = item.source === 'learned';
  const fromDict = item.source === 'dictionary';
  const fromRule = item.source === 'rule';
  chip.className = `tokenizer-chip ${selected ? 'selected' : ''} ${imported ? 'imported' : ''} ${!matched ? 'unmatched' : ''} ${learned ? 'learned' : ''} ${fromDict ? 'from-dict' : ''} ${fromRule ? 'from-rule' : ''}`.replace(/\s+/g, ' ').trim();
  chip.dataset.tag = item.tag;
  chip.dataset.category = item.category || '';
  chip.dataset.subgroup = item.subgroup || '';
  chip.dataset.source = item.source || 'fallback';
  chip.style.setProperty('--chip-color', categoryColor || '#64748b');

  const text = document.createElement('span');
  text.className = 'chip-text';
  text.textContent = item.tag;
  chip.appendChild(text);

  // 来源徽章：词典命中 📖 / 规则命中 ⚙（学习模型用 chip-confidence，未识别用 .unmatched 样式）
  if (fromDict) {
    const badge = document.createElement('span');
    badge.className = 'chip-source-badge chip-source-dict';
    badge.textContent = '📖';
    badge.title = '词典命中';
    chip.appendChild(badge);
  } else if (fromRule) {
    const badge = document.createElement('span');
    badge.className = 'chip-source-badge chip-source-rule';
    badge.textContent = '⚙';
    badge.title = '规则命中';
    chip.appendChild(badge);
  }

  // 学习模型预测来源：追加 🧠 置信度标记
  if (learned && item.confidence != null) {
    const conf = document.createElement('span');
    conf.className = 'chip-confidence';
    conf.textContent = `🧠 ${Math.round(item.confidence * 100)}%`;
    chip.appendChild(conf);
  }

  if (imported) {
    const icon = document.createElement('i');
    icon.className = 'fas fa-check chip-imported-icon';
    chip.appendChild(icon);
  } else {
    const del = document.createElement('i');
    del.className = 'fas fa-times chip-delete';
    chip.appendChild(del);
  }
  return chip;
}

/**
 * 更新分词分类器底部工具栏状态
 * - 计算 appState.tokenizerResults 中 selected=true && imported=false 的数量
 * - 全选按钮：仅当无任何可选 chip（未导入）时禁用
 * - 删除/移动/导入 3 个按钮：无选中时禁用
 * - 更新 tokenizerStats 显示"已选 N 项 / 共 M 项"
 */
export function updateTokenizerToolbar() {
  const list = (appState.tokenizerResults) || [];
  const total = list.length;
  const selectedCount = list.filter(it => it.selected && !it.imported).length;

  if (elements.tokenizerStats) {
    if (total > 0) {
      const stats = { dictionary: 0, rule: 0, learned: 0, fallback: 0 };
      list.forEach(it => {
        const src = it.source || 'fallback';
        if (Object.prototype.hasOwnProperty.call(stats, src)) stats[src]++;
        else stats.fallback++;
      });
      elements.tokenizerStats.innerHTML =
        `已选 ${selectedCount} / 共 ${total} · ` +
        `<span class="stat-dict" title="词典命中">📖${stats.dictionary}</span>` +
        `<span class="stat-rule" title="规则命中">⚙${stats.rule}</span>` +
        `<span class="stat-learned" title="模型预测">🧠${stats.learned}</span>` +
        `<span class="stat-unmatched" title="未识别">?${stats.fallback}</span>`;
    } else {
      elements.tokenizerStats.textContent = '';
    }
  }

  const hasSelected = selectedCount > 0;
  const hasSelectable = list.filter(r => !r.imported).length > 0;
  // 全选按钮：仅当无任何可选 chip 时禁用
  if (elements.tokenizerSelectAllBtn) {
    elements.tokenizerSelectAllBtn.disabled = !hasSelectable;
  }
  // 其他 3 个按钮：无选中时禁用
  const btns = [
    elements.tokenizerDeleteSelectedBtn,
    elements.tokenizerMoveBtn,
    elements.tokenizerImportBtn
  ];
  btns.forEach(btn => {
    if (!btn) return;
    btn.disabled = !hasSelected;
  });
}

/* ================================
   学习中心渲染函数
   ================================ */

/**
 * 渲染学习中心左侧类别列表
 * - 区分内置类别（BUILTIN_CATEGORY_IDS）与自定义类别（samples.customCategories）
 * - 每项显示色点 + label + 样本数 + 内置标记
 * @param {Object} samples - { categories: {catId: [tag,...]}, customCategories: {catId: {label,color,...}} }
 */
export function renderLearningCategoryList(samples) {
  if (!elements.learningCategoryList) return;
  elements.learningCategoryList.innerHTML = '';
  if (!samples || !samples.categories) return;

  // 获取词典类别元信息（label + color），用于内置类别显示
  const dict = (appState.tokenizerCache && appState.tokenizerCache.dictionary) || {};
  const dictCategories = dict.categories || {};
  const customCategories = samples.customCategories || {};

  const catIds = Object.keys(samples.categories);
  const frag = document.createDocumentFragment();

  catIds.forEach(catId => {
    const isBuiltin = BUILTIN_CATEGORY_IDS.includes(catId);
    const customDef = customCategories[catId];
    const dictDef = dictCategories[catId] || {};

    let label, color;
    if (isBuiltin) {
      label = dictDef.label || catId;
      color = dictDef.color || '#64748b';
    } else if (customDef) {
      label = customDef.label || catId;
      color = customDef.color || '#64748b';
    } else {
      label = catId;
      color = '#64748b';
    }

    const tags = samples.categories[catId];
    const count = Array.isArray(tags) ? tags.length : 0;

    const item = document.createElement('div');
    item.className = 'learning-category-item' + (isBuiltin ? ' builtin' : '');
    item.dataset.catId = catId;

    const dot = document.createElement('span');
    dot.className = 'learning-category-color';
    dot.style.backgroundColor = color;

    const labelEl = document.createElement('span');
    labelEl.className = 'learning-category-label';
    labelEl.textContent = label;

    const countEl = document.createElement('span');
    countEl.className = 'learning-category-count';
    countEl.textContent = String(count);

    item.appendChild(dot);
    item.appendChild(labelEl);
    item.appendChild(countEl);
    frag.appendChild(item);
  });

  elements.learningCategoryList.appendChild(frag);
}

/**
 * 渲染学习中心右侧样本编辑区
 * - 将 samples.categories[catId] 标签数组填入 textarea（每行一个）
 * - 更新当前类别 label 与样本数显示
 * @param {string} catId - 类别 id
 * @param {Object} samples - 样本对象
 */
export function renderLearningSamples(catId, samples) {
  if (!samples || !samples.categories) return;
  const tags = samples.categories[catId] || [];
  const tagArray = Array.isArray(tags) ? tags : [];

  if (elements.learningSamplesTextarea) {
    elements.learningSamplesTextarea.value = tagArray.join('\n');
  }

  // 解析类别 label
  const dict = (appState.tokenizerCache && appState.tokenizerCache.dictionary) || {};
  const dictCategories = dict.categories || {};
  const customCategories = samples.customCategories || {};
  let label;
  if (BUILTIN_CATEGORY_IDS.includes(catId)) {
    label = (dictCategories[catId] && dictCategories[catId].label) || catId;
  } else if (customCategories[catId]) {
    label = customCategories[catId].label || catId;
  } else {
    label = catId;
  }

  if (elements.learningCurrentCatLabel) {
    elements.learningCurrentCatLabel.textContent = label;
  }
  if (elements.learningSampleCount) {
    elements.learningSampleCount.textContent = `${tagArray.length} 个样本`;
  }
}

/**
 * 渲染学习模型状态
 * - 更新学习中心底部的模型状态文本
 * - 同步设置面板中的 3 个 info-value（模型状态/样本数/类别数）
 */
export function renderLearningModelStatus() {
  const ll = appState.settings.localLearning;
  if (!ll) return;

  const trained = ll.modelTrained === true;
  const sampleCount = ll.sampleCount || 0;
  const categoryCount = ll.categoryCount || 0;

  // 学习中心底部状态文本
  if (elements.learningModelStatusText) {
    if (trained) {
      let text = `✓ 已训练 · ${sampleCount} 样本 · ${categoryCount} 类别`;
      if (ll.lastTrainedAt) {
        try {
          const d = new Date(ll.lastTrainedAt);
          text += ` · ${d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) { /* 忽略时间格式化错误 */ }
      }
      elements.learningModelStatusText.textContent = text;
      elements.learningModelStatusText.classList.add('trained');
      elements.learningModelStatusText.classList.remove('untrained');
    } else {
      elements.learningModelStatusText.textContent = '模型未训练';
      elements.learningModelStatusText.classList.add('untrained');
      elements.learningModelStatusText.classList.remove('trained');
    }
  }

  // 设置面板 info-value 同步
  if (elements.learningModelStatusInfo) {
    elements.learningModelStatusInfo.textContent = trained ? '已训练' : '未训练';
  }
  if (elements.learningSampleCountInfo) {
    elements.learningSampleCountInfo.textContent = String(sampleCount);
  }
  if (elements.learningCategoryCountInfo) {
    elements.learningCategoryCountInfo.textContent = String(categoryCount);
  }
}

