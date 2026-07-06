/**
 * 本地分词分类器业务模块
 *
 * 职责：
 *  - 依赖注入接收全局 handlers / elements / appState
 *  - 绑定 #tokenizer-modal 内所有按钮事件
 *  - 通过 IPC（window.electronAPI.tokenizer*）与主进程交互
 *  - 维护 appState.tokenizerResults（每项 {tag, category, subgroup, matched, source, selected, imported}）
 *  - 提供"加载词典 / 分类 / 删除 / 全选 / 移动分组 / 导入到分类 / 编辑自定义规则"等操作
 *
 * 依赖注入模式参考 batch.js：所有外部依赖通过 initTokenizer(handlers) 注入，
 * 模块内部不直接 import 其他业务模块，避免循环依赖。
 *
 * 优雅降级：所有 window.electronAPI.tokenizer* 调用使用可选链 ?.，防止 preload 未就绪时报错。
 */

// 模块内部状态：handlers（注入的依赖）、elements（DOM 缓存）、appState（全局状态）
let handlers = {};
let elements = null;
let appState = null;

/**
 * 初始化 tokenizer 模块，注入依赖并绑定事件
 * @param {Object} h - handlers 依赖
 * @param {Object} h.appState - 全局状态（含 settings.localTokenizer / tokenizerCache / tokenizerResults）
 * @param {Object} h.elements - DOM 元素缓存（render.js 的 cacheElements 产物）
 * @param {Function} [h.showConfirmDialog] - 确认弹窗 (title, message, icon) => Promise<boolean>
 * @param {Function} [h.showNotification] - 通知 (message, type) => void
 * @param {Function} [h.batchImportPrompts] - 批量导入到分类 (categoryId, text) => Promise<void>
 * @param {Function} [h.renderCategoryList] - 重新渲染分类列表
 * @param {Function} [h.renderPromptList] - 重新渲染提示词列表 (categoryId) => void
 * @param {Function} [h.openTokenizerModal] - 打开 modal（来自 render.js）
 * @param {Function} [h.closeTokenizerModal] - 关闭 modal（来自 render.js）
 * @param {Function} [h.renderTokenizerResults] - 渲染结果（来自 render.js）
 * @param {Function} [h.updateTokenizerToolbar] - 更新工具栏（来自 render.js）
 */
export function initTokenizer(h) {
  handlers = h || {};
  elements = h?.elements || null;
  appState = h?.appState || null;
  bindTokenizerEvents();
}

/**
 * 绑定 #tokenizer-modal 内的所有按钮事件
 * - 元素可能不存在（如旧版 HTML），统一用 ?. 安全绑定
 */
function bindTokenizerEvents() {
  if (!elements) return;
  // 开始分类
  elements.tokenizerClassifyBtn?.addEventListener('click', handleClassify);
  // 工具栏按钮
  elements.tokenizerSelectAllBtn?.addEventListener('click', toggleSelectAll);
  elements.tokenizerDeleteSelectedBtn?.addEventListener('click', deleteSelected);
  elements.tokenizerMoveBtn?.addEventListener('click', openMoveGroupModal);
  elements.tokenizerImportBtn?.addEventListener('click', openImportTargetModal);
  // 结果区事件委托：chip 点击 / 删除
  elements.tokenizerResults?.addEventListener('click', handleResultsClick);
  // 设置面板"编辑自定义规则"按钮
  elements.tokenizerEditRulesBtn?.addEventListener('click', openRulesEditor);
}

/**
 * 加载词典到 appState.tokenizerCache.dictionary
 * 调用主进程 IPC `tokenizerLoadDictionary`，返回合并后的词典对象 + stats
 * @returns {Promise<Object|null>} 词典对象；失败时返回 null
 */
export async function loadDictionary() {
  if (!appState) return null;
  try {
    const res = await window.electronAPI?.tokenizerLoadDictionary?.();
    if (res && res.success) {
      appState.tokenizerCache.dictionary = res.dictionary;
      appState.tokenizerCache.lastLoadAt = Date.now();
      appState.settings.localTokenizer.customRulesLoaded = true;
      appState.settings.localTokenizer.lastDictVersion = res.stats?.version || null;
      return res.dictionary;
    } else {
      console.error('Tokenizer: loadDictionary failed', res?.error);
      return null;
    }
  } catch (e) {
    console.error('Tokenizer: loadDictionary error', e);
    return null;
  }
}

/**
 * 处理"开始分类"按钮点击
 * 1. 读取输入框文本，空则提示
 * 2. 确保词典已加载（懒加载）
 * 3. 调用 IPC `tokenizerClassify` 获取分类结果
 * 4. 写入 appState.tokenizerResults（补充 selected=false, imported=false）
 * 5. 调用 renderTokenizerResults 渲染
 */
async function handleClassify() {
  if (!elements || !appState) return;
  const text = elements.tokenizerInput?.value?.trim() || '';
  if (!text) {
    handlers.showNotification?.('请输入待分类的标签', 'warning');
    return;
  }
  // 确保词典已加载
  if (!appState.tokenizerCache.dictionary) {
    if (elements.tokenizerClassifyBtn) elements.tokenizerClassifyBtn.disabled = true;
    await loadDictionary();
    if (elements.tokenizerClassifyBtn) elements.tokenizerClassifyBtn.disabled = false;
    if (!appState.tokenizerCache.dictionary) {
      handlers.showNotification?.('词典加载失败，请检查设置', 'error');
      return;
    }
  }
  try {
    const res = await window.electronAPI?.tokenizerClassify?.(text);
    if (!res || !res.success) {
      handlers.showNotification?.('分类失败：' + (res?.error || '未知错误'), 'error');
      return;
    }
    // 写入 appState.tokenizerResults，补充 UI 字段
    appState.tokenizerResults = (res.results || []).map(r => ({
      tag: r.tag,
      category: r.category,
      subgroup: r.subgroup || (r.category === 'general' ? 'other' : null),
      matched: r.matched,
      source: r.source,
      confidence: r.confidence != null ? r.confidence : null,
      selected: false,
      imported: false
    }));
    handlers.renderTokenizerResults?.(appState.tokenizerResults);
  } catch (e) {
    handlers.showNotification?.('分类出错：' + e.message, 'error');
  }
}

/**
 * 结果区点击事件委托
 * - 点击 .chip-delete：删除该 chip
 * - 点击 chip 主体（非已导入态）：切换选中
 * @param {Event} e - click 事件
 */
function handleResultsClick(e) {
  const chip = e.target.closest('.tokenizer-chip');
  if (!chip) return;
  const tag = chip.dataset.tag;
  if (!tag) return;
  // 删除图标
  if (e.target.closest('.chip-delete')) {
    deleteChip(tag);
    return;
  }
  // 已导入的不可选
  const item = appState.tokenizerResults.find(r => r.tag === tag);
  if (!item || item.imported) return;
  // 切换选中
  item.selected = !item.selected;
  chip.classList.toggle('selected', item.selected);
  handlers.updateTokenizerToolbar?.();
}

/**
 * 切换全选/取消全选（仅对未导入的项生效）
 */
function toggleSelectAll() {
  if (!appState) return;
  const selectable = appState.tokenizerResults.filter(r => !r.imported);
  if (selectable.length === 0) return;
  const allSelected = selectable.every(r => r.selected);
  selectable.forEach(r => { r.selected = !allSelected; });
  handlers.renderTokenizerResults?.(appState.tokenizerResults);
}

/**
 * 删除单个 chip（按 tag 过滤）
 * @param {string} tag - 待删除的标签文本
 */
function deleteChip(tag) {
  if (!appState) return;
  appState.tokenizerResults = appState.tokenizerResults.filter(r => r.tag !== tag);
  handlers.renderTokenizerResults?.(appState.tokenizerResults);
}

/**
 * 删除选中的（未导入）chip，带二次确认
 */
async function deleteSelected() {
  if (!appState) return;
  const selected = appState.tokenizerResults.filter(r => r.selected && !r.imported);
  if (selected.length === 0) return;
  const ok = await handlers.showConfirmDialog?.('确认删除', `确定要删除选中的 ${selected.length} 个标签吗？`, '🗑️');
  if (!ok) return;
  appState.tokenizerResults = appState.tokenizerResults.filter(r => !(r.selected && !r.imported));
  handlers.renderTokenizerResults?.(appState.tokenizerResults);
}

/**
 * 移动到分组：仅 UI 层重组（不修改词典）
 * 收集当前结果区所有 (category, subgroup) 组合作为目标选项，
 * 用 window.prompt 让用户选择目标分组，更新 appState.tokenizerResults 中选中项的 category/subgroup
 */
function openMoveGroupModal() {
  if (!appState) return;
  const selected = appState.tokenizerResults.filter(r => r.selected && !r.imported);
  if (selected.length === 0) return;
  // 收集当前结果区所有 (category, subgroup) 组合
  const groups = new Set();
  appState.tokenizerResults.forEach(r => {
    groups.add(`${r.category}::${r.subgroup || ''}`);
  });
  const dict = appState.tokenizerCache.dictionary || {};
  const categories = dict.categories || {};
  // 构建下拉选项
  const groupList = Array.from(groups).map(g => {
    const [cat, sub] = g.split('::');
    const catInfo = categories[cat];
    const subLabel = catInfo?.subgroups?.[sub] || sub || '';
    return {
      value: g,
      label: `${catInfo?.label || cat}${subLabel ? ' / ' + subLabel : ''}`
    };
  });
  if (groupList.length === 0) return;
  // 简单实现：用 window.prompt 列出所有可选分组
  const choice = window.prompt?.(
    `选择目标分组（共 ${selected.length} 个标签）:\n${groupList.map((g, i) => `${i + 1}. ${g.label}`).join('\n')}\n\n请输入序号或分组名称：`,
    groupList[0].label
  );
  if (choice === null || choice === undefined) return;
  const trimmed = String(choice).trim();
  if (!trimmed) return;
  // 优先按序号匹配，其次按 label 完全匹配，再按 label 包含匹配
  let target = null;
  const idx = parseInt(trimmed, 10);
  if (!isNaN(idx) && idx >= 1 && idx <= groupList.length) {
    target = groupList[idx - 1];
  } else {
    target = groupList.find(g => g.label === trimmed)
      || groupList.find(g => g.label.includes(trimmed));
  }
  if (!target) {
    handlers.showNotification?.('未找到匹配的目标分组', 'warning');
    return;
  }
  const [targetCat, targetSub] = target.value.split('::');
  // 更新 appState.tokenizerResults
  appState.tokenizerResults.forEach(r => {
    if (r.selected && !r.imported) {
      r.category = targetCat;
      r.subgroup = targetSub || null;
      // 移动后取消选中
      r.selected = false;
    }
  });
  handlers.renderTokenizerResults?.(appState.tokenizerResults);
}

/**
 * 打开"导入到分类"目标选择弹窗
 * 复用现有 #batch-move-modal（结构与 batch.batchMovePrompts 一致）：
 *  - 把分类列表渲染到 .batch-move-list
 *  - 点击某项 → 调用 importSelectedToCategory(catId) → 关闭弹窗
 * 若 batch-move-modal 不存在，则 fallback 用 window.prompt 输入分类名
 */
function openImportTargetModal() {
  if (!appState) return;
  const selected = appState.tokenizerResults.filter(r => r.selected && !r.imported);
  if (selected.length === 0) return;
  if (!appState.categories || appState.categories.length === 0) {
    handlers.showNotification?.('暂无可用分类', 'warning');
    return;
  }
  const batchMoveModal = document.getElementById('batch-move-modal');
  const batchMoveList = batchMoveModal?.querySelector('.batch-move-list') || document.getElementById('batch-move-list');
  if (!batchMoveModal || !batchMoveList) {
    // fallback：用 prompt 输入分类名
    const catName = window.prompt?.(
      `选择目标分类（共 ${selected.length} 个标签）:\n${appState.categories.map(c => c.name).join('\n')}\n\n请输入分类名称：`,
      appState.categories[0]?.name
    );
    if (!catName) return;
    const targetCat = appState.categories.find(c => c.name === catName);
    if (!targetCat) {
      handlers.showNotification?.('未找到该分类', 'warning');
      return;
    }
    importSelectedToCategory(targetCat.id);
    return;
  }
  // 渲染分类列表到 batch-move-modal（与 batch.js batchMovePrompts 风格一致）
  batchMoveList.innerHTML = '';
  appState.categories.forEach(cat => {
    const item = document.createElement('div');
    item.className = 'batch-move-item';
    item.dataset.catId = cat.id;
    const icon = document.createElement('i');
    icon.className = 'fas fa-folder';
    item.appendChild(icon);
    item.appendChild(document.createTextNode(' ' + cat.name));
    item.addEventListener('click', () => {
      importSelectedToCategory(cat.id);
      batchMoveModal.classList.remove('active');
      batchMoveModal.style.display = 'none';
    }, { once: true });
    batchMoveList.appendChild(item);
  });
  batchMoveModal.classList.add('active');
  batchMoveModal.style.display = 'block';
}

/**
 * 批量导入选中的标签到指定分类
 * 调用 handlers.batchImportPrompts(categoryId, text)，导入成功后标记为 imported=true
 * @param {string} targetCategoryId - 目标分类 ID
 */
async function importSelectedToCategory(targetCategoryId) {
  if (!appState) return;
  const selected = appState.tokenizerResults.filter(r => r.selected && !r.imported);
  if (selected.length === 0) return;
  const targetCat = appState.categories.find(c => c.id === targetCategoryId);
  if (!targetCat) return;
  try {
    const tagsText = selected.map(r => r.tag).join('\n');
    await handlers.batchImportPrompts?.(targetCategoryId, tagsText);
    // 标记为已导入
    selected.forEach(s => {
      s.imported = true;
      s.selected = false;
    });
    handlers.renderTokenizerResults?.(appState.tokenizerResults);
    handlers.renderCategoryList?.();
    handlers.renderPromptList?.(appState.selectedCategoryId);
    handlers.showNotification?.(`已导入 ${selected.length} 个标签到 ${targetCat.name}`, 'success');
  } catch (e) {
    handlers.showNotification?.('导入失败：' + e.message, 'error');
  }
}

/**
 * 打开自定义规则编辑器 modal
 * 异步加载当前 custom-rules.json 内容回填 textarea，保存按钮触发 JSON 校验 + IPC 保存 + 重新 loadDictionary
 */
async function openRulesEditor() {
  const rulesModal = document.getElementById('tokenizer-rules-editor-modal');
  const textarea = document.getElementById('tokenizer-rules-textarea');
  const saveBtn = document.getElementById('tokenizer-rules-save-btn');
  const cancelBtn = document.getElementById('tokenizer-rules-cancel-btn');
  if (!rulesModal || !textarea) {
    // fallback 到 prompt（极少数情况）
    const input = window.prompt?.('编辑自定义规则 JSON', '{\n  "categories": {},\n  "tags": {}\n}');
    if (input === null) return;
    try { JSON.parse(input); } catch (e) {
      handlers.showNotification?.('JSON 格式错误：' + e.message, 'error');
      return;
    }
    await _saveCustomRules(input);
    return;
  }

  // 异步加载当前规则内容
  textarea.value = '加载中...';
  textarea.disabled = true;
  try {
    const res = await window.electronAPI?.tokenizerReadCustomRules?.();
    if (res && res.success) {
      textarea.value = res.content;
      if (res.isEmpty) {
        handlers.showNotification?.('暂无自定义规则，已加载模板', 'info');
      }
    } else {
      textarea.value = '{\n  "categories": {},\n  "tags": {}\n}';
      handlers.showNotification?.('加载失败，使用模板', 'warning');
    }
  } catch (e) {
    textarea.value = '{\n  "categories": {},\n  "tags": {}\n}';
    handlers.showNotification?.('加载出错：' + e.message, 'error');
  }
  textarea.disabled = false;

  // 显示 modal
  rulesModal.classList.add('active');
  rulesModal.classList.add('modal-active');
  rulesModal.style.display = 'block';

  // 绑定保存/取消按钮（一次性，避免重复绑定）
  const onSave = async () => {
    const content = textarea.value;
    try {
      JSON.parse(content);
    } catch (e) {
      // 计算 line 号
      const match = e.message.match(/position (\d+)/);
      let lineInfo = '';
      if (match) {
        const pos = parseInt(match[1]);
        const line = content.slice(0, pos).split('\n').length;
        lineInfo = ` (行 ${line})`;
      }
      handlers.showNotification?.('JSON 格式错误' + lineInfo + '：' + e.message, 'error');
      return;
    }
    saveBtn.removeEventListener('click', onSave);
    cancelBtn.removeEventListener('click', onCancel);
    rulesModal.classList.remove('active');
    rulesModal.classList.remove('modal-active');
    rulesModal.style.display = 'none';
    await _saveCustomRules(content);
  };

  const onCancel = () => {
    saveBtn.removeEventListener('click', onSave);
    cancelBtn.removeEventListener('click', onCancel);
    rulesModal.classList.remove('active');
    rulesModal.classList.remove('modal-active');
    rulesModal.style.display = 'none';
  };

  saveBtn.addEventListener('click', onSave);
  cancelBtn.addEventListener('click', onCancel);
}

/**
 * 保存自定义规则（内部辅助）
 * 调用 IPC `tokenizerSaveCustomRules` 保存，成功后重新加载词典以应用新规则
 * @param {string} content - JSON 字符串内容
 */
async function _saveCustomRules(content) {
  try {
    const res = await window.electronAPI?.tokenizerSaveCustomRules?.(content);
    if (res && res.success) {
      handlers.showNotification?.('自定义规则已保存', 'success');
      await loadDictionary();
    } else {
      handlers.showNotification?.('保存失败：' + (res?.error || '未知错误'), 'error');
    }
  } catch (e) {
    handlers.showNotification?.('保存出错：' + e.message, 'error');
  }
}

/**
 * 应用启用态到导航栏按钮
 * 根据 appState.settings.localTokenizer.enabled 控制 #tokenizer-btn 的 disabled 状态与 title
 */
export function applyTokenizerEnabledState() {
  if (!elements?.tokenizerBtn) return;
  const enabled = appState?.settings?.localTokenizer?.enabled !== false;
  elements.tokenizerBtn.disabled = !enabled;
  elements.tokenizerBtn.title = enabled ? '本地分词分类器' : '请在设置中启用本地分词分类器';
}

/**
 * 延迟初始化（在 app.js 的 deferredInit 中调用）
 * - 应用启用态
 * - 词典懒加载：不在启动时立即加载，仅在首次打开 modal 或 classify 时加载
 */
export async function initTokenizerDeferred() {
  applyTokenizerEnabledState();
}

export { handleClassify };
