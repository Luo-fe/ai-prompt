import { appState } from './state.js';
import { getPromptText, getPromptTranslation, getCategoryById, findPromptInCategory, findPromptIndex, createPromptKey } from './utils.js';
import { EXAMPLES, NOTIFICATION_DURATION, NOTIFICATION_MAX_COUNT } from './constants.js';

let handlers = {};

export function initRender(h) {
  handlers = { ...handlers, ...h };
}

const elements = {};
export { elements };

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
}

export function renderCategoryList() {
  elements.categoryList.innerHTML = '';
  const frag = document.createDocumentFragment();
  appState.categories.forEach((category, index) => {
    const item = document.createElement('li');
    item.className = `category-item ${appState.selectedCategoryId === category.id ? 'active' : ''}`;
    item.dataset.categoryId = category.id;

    const leftSection = document.createElement('div');
    leftSection.className = 'category-item-left';

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

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name';
    nameSpan.textContent = category.name;
    leftSection.appendChild(nameSpan);
    item.appendChild(leftSection);

    const actions = document.createElement('div');
    actions.className = 'category-actions';

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

    item.appendChild(actions);
    item.addEventListener('click', () => handlers.selectCategory(category.id));
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

function handlePromptToggle(categoryId, prompt, item, cb) {
  handlers.togglePrompt(categoryId, prompt);
  const isSelected = handlers.isPromptSelected(categoryId, prompt);
  item.classList.toggle('selected', isSelected);
  item.classList.add('pulse');
  setTimeout(() => item.classList.remove('pulse'), 300);
  if (isSelected) handlers.recordPromptUsage(categoryId, getPromptText(prompt));
}

export function renderPromptList(categoryId) {
  const targetId = categoryId || appState.selectedCategoryId;
  const category = getCategoryById(appState.categories, targetId);
  if (!category) {
    elements.currentCategoryTitle.textContent = '请选择分类';
    elements.promptList.innerHTML = '<div class="no-prompts">请从左侧选择一个分类</div>';
    elements.frequentSection.style.display = 'none';
    return;
  }
  elements.currentCategoryTitle.textContent = category.name;
  if (category.prompts.length === 0) {
    elements.promptList.innerHTML = '<div class="no-prompts">此分类下暂无提示词</div>';
    elements.frequentSection.style.display = 'none';
    return;
  }

  renderFrequentPrompts(targetId);

  elements.promptList.innerHTML = '';
  const frag = document.createDocumentFragment();
  category.prompts.forEach(prompt => {
    const item = document.createElement('div');
    item.className = `prompt-item ${handlers.isPromptSelected(category.id, prompt) ? 'selected' : ''}`;

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'prompt-checkbox';
    cb.checked = handlers.isPromptSelected(category.id, prompt);
    cb.addEventListener('change', () => handlePromptToggle(category.id, prompt, item, cb));

    const batchCb = document.createElement('input');
    batchCb.type = 'checkbox';
    batchCb.className = 'batch-checkbox';
    const promptKey = createPromptKey(category.id, getPromptText(prompt));
    batchCb.checked = appState.batchSelected.has(promptKey);
    batchCb.addEventListener('change', e => {
      e.stopPropagation();
      if (batchCb.checked) appState.batchSelected.add(promptKey);
      else appState.batchSelected.delete(promptKey);
      updateBatchInfo();
    });

    const textContainer = document.createElement('div');
    textContainer.className = 'prompt-text-container';
    const text = document.createElement('span');
    text.className = 'prompt-text';
    text.textContent = getPromptText(prompt);
    textContainer.appendChild(text);

    if (appState.settings.translationEnabled) {
      textContainer.appendChild(createTranslationUI(category.id, prompt));
    }

    item.appendChild(cb);
    item.appendChild(batchCb);
    item.appendChild(textContainer);
    item.addEventListener('click', e => {
      if (e.target !== cb && !e.target.closest('.editable-translation') && !e.target.closest('.inline-translate-btn') && !e.target.closest('.translation-edit-input') && !e.target.closest('.batch-checkbox')) {
        cb.checked = !cb.checked;
        handlePromptToggle(category.id, prompt, item, cb);
      }
    });
    frag.appendChild(item);
  });
  elements.promptList.appendChild(frag);
}

export function renderFrequentPrompts(categoryId) {
  const frequent = handlers.getFrequentPrompts ? handlers.getFrequentPrompts(categoryId, appState.settings.frequentCount || 10) : [];
  if (frequent.length === 0) {
    elements.frequentSection.style.display = 'none';
    return;
  }
  elements.frequentSection.style.display = '';
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
        if (handlers.isPromptSelected(categoryId, prompt)) handlers.recordPromptUsage(categoryId, item.text);
        handlers.renderPromptList(categoryId);
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
  const frag = document.createDocumentFragment();
  appState.categories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'category-checkbox-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.id = `random-cat-${category.id}`;
    cb.value = category.id;
    cb.className = 'random-category-checkbox';
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

export function renderExamples() {
  const section = document.querySelector('.examples-section');
  if (!section) return;
  while (section.children.length > 1) section.removeChild(section.lastChild);
  EXAMPLES.forEach(example => {
    const item = document.createElement('div');
    item.className = 'example-item';

    const nameEl = document.createElement('h4');
    nameEl.textContent = example.name;
    item.appendChild(nameEl);

    Object.keys(example.combinations).forEach(categoryId => {
      const category = getCategoryById(appState.categories, categoryId);
      if (!category) return;
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      strong.textContent = category.name + ':';
      p.appendChild(strong);
      p.appendChild(document.createTextNode(' ' + example.combinations[categoryId].join(', ')));
      item.appendChild(p);
    });

    let previewText = '';
    let first = true;
    Object.keys(example.combinations).forEach(categoryId => {
      example.combinations[categoryId].forEach(p => {
        if (!first) previewText += ', ';
        previewText += p;
        first = false;
      });
    });
    const previewP = document.createElement('p');
    previewP.className = 'example-combination';
    previewP.textContent = `"${previewText}"`;
    item.appendChild(previewP);

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn btn-small apply-example';
    applyBtn.textContent = '应用此示例';
    applyBtn.addEventListener('click', () => handlers.applyExample(example));
    item.appendChild(applyBtn);

    section.appendChild(item);
  });
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

  Object.assign(notification.style, { position: 'fixed', top: '16px', right: '16px', zIndex: '10000' });
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('hiding');
    setTimeout(() => { if (notification.parentNode) document.body.removeChild(notification); }, 300);
  }, NOTIFICATION_DURATION);
}

export function showConfirmDialog(title, message, icon, onConfirm) {
  return new Promise((resolve) => {
    elements.confirmIcon.textContent = icon || '⚠️';
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    elements.confirmDialog.classList.add('active');
    elements.confirmOkBtn.onclick = () => {
      elements.confirmDialog.classList.remove('active');
      if (onConfirm) onConfirm();
      resolve(true);
    };
    elements.confirmCancelBtn.onclick = () => {
      elements.confirmDialog.classList.remove('active');
      resolve(false);
    };
    elements.confirmDialog.addEventListener('keydown', function handler(e) {
      if (e.key === 'Escape') {
        elements.confirmDialog.classList.remove('active');
        elements.confirmDialog.removeEventListener('keydown', handler);
        resolve(false);
      }
    });
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
