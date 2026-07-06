/**
 * 学习模型业务模块
 *
 * 职责：
 *  - 依赖注入接收全局 handlers / elements / appState
 *  - 通过 IPC（window.electronAPI.tokenizer*）与主进程交互
 *  - 管理用户学习样本（按类别组织）+ 自定义类别
 *  - 触发模型训练 / 删除 / 状态查询
 *  - 维护当前选中类别 currentCategoryId
 *
 * 依赖注入模式参考 tokenizer.js / batch.js：所有外部依赖通过 initLearning(handlers) 注入。
 * 优雅降级：所有 window.electronAPI.tokenizer* 调用使用可选链 ?.。
 */

// 预设色板（新增自定义类别时选择）
export const PRESET_COLORS = [
  '#ec4899', '#f59e0b', '#10b981', '#6366f1',
  '#64748b', '#0ea5e9', '#a855f7', '#ef4444'
];

// 内置类别 id 清单（5 大类 + general 下 8 子组），这些不可删除/重命名
export const BUILTIN_CATEGORY_IDS = [
  'character', 'artist', 'copyright', 'meta',
  'people', 'clothing', 'action', 'scene', 'body', 'expression', 'object', 'other'
];

// 模块内部状态
let handlers = {};
let elements = null;
let appState = null;
let currentCategoryId = null;  // 学习中心当前选中的类别

/**
 * 初始化 learning 模块，注入依赖并绑定事件
 * @param {Object} h - handlers 依赖
 */
export function initLearning(h) {
  handlers = h || {};
  elements = h?.elements || null;
  appState = h?.appState || null;
  bindLearningEvents();
}

/**
 * 绑定学习中心所有按钮事件
 */
function bindLearningEvents() {
  if (!elements) return;
  // 学习中心按钮（设置面板 / 工具栏入口）
  elements.learningOpenBtn?.addEventListener('click', openLearningModal);
  // 学习中心内部按钮
  elements.learningTrainBtn?.addEventListener('click', trainModel);
  elements.learningDeleteModelBtn?.addEventListener('click', deleteModel);
  elements.learningSaveSamplesBtn?.addEventListener('click', saveSamples);
  elements.learningImportFileBtn?.addEventListener('click', () => {
    elements.learningImportFileInput?.click();
  });
  elements.learningImportFileInput?.addEventListener('change', handleImportFile);
  elements.learningAddCategoryBtn?.addEventListener('click', addCustomCategory);
  elements.learningRenameCategoryBtn?.addEventListener('click', () => {
    if (currentCategoryId) renameCustomCategory(currentCategoryId);
  });
  elements.learningDeleteCategoryBtn?.addEventListener('click', () => {
    if (currentCategoryId) deleteCustomCategory(currentCategoryId);
  });
  // 类别列表点击委托
  elements.learningCategoryList?.addEventListener('click', handleCategoryListClick);
  // 诊断按钮
  elements.tokenizerDiagnosticBtn?.addEventListener('click', runDiagnostic);
  // modal 关闭按钮（×）
  elements.learningCloseBtn?.addEventListener('click', closeLearningModal);
  // 从分类导入
  elements.learningImportCategoryBtn?.addEventListener('click', openImportCategoryModal);
  elements.learningImportCategoryCancelBtn?.addEventListener('click', closeImportCategoryModal);
  // backdrop click-outside 关闭
  elements.learningImportCategoryModal?.addEventListener('click', (e) => {
    if (e.target === elements.learningImportCategoryModal) closeImportCategoryModal();
  });
}

/**
 * 打开学习中心 modal
 * 1. 加载样本 + 模型状态
 * 2. 渲染类别列表 + 默认选中第一个类别
 * 3. 显示 modal
 */
export async function openLearningModal() {
  if (!elements?.learningModal) {
    handlers.showNotification?.('学习中心未初始化', 'warning');
    return;
  }
  // 显示 modal（先显示，让用户看到加载状态）
  elements.learningModal.classList.add('active');
  elements.learningModal.classList.add('modal-active');
  elements.learningModal.style.display = 'block';

  // 加载样本
  await loadSamples();
  // 加载模型状态
  await loadModelStats();
  // 渲染类别列表
  handlers.renderLearningCategoryList?.(appState?.learningCache?.samples);
  // 默认选中第一个类别
  const samples = appState?.learningCache?.samples;
  if (samples && samples.categories) {
    const firstCat = Object.keys(samples.categories)[0];
    if (firstCat) {
      selectCategory(firstCat);
    } else {
      // 无类别，清空编辑区
      if (elements.learningSamplesTextarea) elements.learningSamplesTextarea.value = '';
      if (elements.learningCurrentCatLabel) elements.learningCurrentCatLabel.textContent = '请选择或新增类别';
      if (elements.learningSampleCount) elements.learningSampleCount.textContent = '0 个样本';
    }
  }
}

/**
 * 关闭学习中心 modal
 */
export function closeLearningModal() {
  if (!elements?.learningModal) return;
  elements.learningModal.classList.remove('active');
  elements.learningModal.classList.remove('modal-active');
  elements.learningModal.style.display = 'none';
}

/**
 * 加载学习样本到 appState.learningCache.samples
 */
export async function loadSamples() {
  if (!appState) return null;
  try {
    const res = await window.electronAPI?.tokenizerLoadSamples?.();
    if (res && res.success) {
      appState.learningCache.samples = res.samples;
      appState.learningCache.lastLoadAt = Date.now();
      // 同步 stats 到 settings
      if (appState.settings.localLearning) {
        appState.settings.localLearning.sampleCount = res.stats?.totalSamples || 0;
        appState.settings.localLearning.categoryCount = (res.stats?.categoryCount || 0) + (res.stats?.customCategoryCount || 0);
      }
      return res.samples;
    } else {
      console.error('Learning: loadSamples failed', res?.error);
      return null;
    }
  } catch (e) {
    console.error('Learning: loadSamples error', e);
    return null;
  }
}

/**
 * 保存样本（收集 textarea 内容 + 当前 samples 结构 → IPC 保存）
 */
async function saveSamples() {
  if (!appState?.learningCache?.samples) {
    handlers.showNotification?.('样本未加载', 'warning');
    return;
  }
  const samples = appState.learningCache.samples;
  // 收集当前类别 textarea 内容
  if (currentCategoryId && elements.learningSamplesTextarea) {
    const text = elements.learningSamplesTextarea.value;
    const tags = parseTagsFromText(text);
    if (!samples.categories) samples.categories = {};
    samples.categories[currentCategoryId] = tags;
  }
  try {
    const res = await window.electronAPI?.tokenizerSaveSamples?.(samples);
    if (res && res.success) {
      appState.settings.localLearning.sampleCount = res.stats?.totalSamples || 0;
      handlers.showNotification?.(`样本已保存（${res.stats?.totalSamples || 0} 个标签）`, 'success');
      handlers.renderLearningCategoryList?.(samples);
      handlers.renderLearningModelStatus?.();
    } else {
      handlers.showNotification?.('保存失败：' + (res?.error || '未知错误'), 'error');
    }
  } catch (e) {
    handlers.showNotification?.('保存出错：' + e.message, 'error');
  }
}

/**
 * 训练模型
 */
async function trainModel() {
  // 先保存当前编辑的样本
  if (currentCategoryId && elements?.learningSamplesTextarea && appState?.learningCache?.samples) {
    const text = elements.learningSamplesTextarea.value;
    const tags = parseTagsFromText(text);
    appState.learningCache.samples.categories[currentCategoryId] = tags;
    // 先 IPC 保存
    try {
      await window.electronAPI?.tokenizerSaveSamples?.(appState.learningCache.samples);
    } catch (e) {
      // 保存失败仍尝试训练
    }
  }
  try {
    if (elements.learningTrainBtn) {
      elements.learningTrainBtn.disabled = true;
      elements.learningTrainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 训练中...';
    }
    const res = await window.electronAPI?.tokenizerTrain?.();
    if (res && res.success) {
      appState.settings.localLearning.modelTrained = true;
      appState.settings.localLearning.lastTrainedAt = res.trainedAt;
      appState.settings.localLearning.sampleCount = res.stats?.sampleCount || 0;
      appState.settings.localLearning.categoryCount = res.stats?.categoryCount || 0;
      handlers.showNotification?.(`模型训练完成（${res.stats?.sampleCount || 0} 样本，${res.stats?.categoryCount || 0} 类别）`, 'success');
      await loadModelStats();
    } else {
      handlers.showNotification?.('训练失败：' + (res?.error || '未知错误'), 'error');
    }
  } catch (e) {
    handlers.showNotification?.('训练出错：' + e.message, 'error');
  } finally {
    if (elements.learningTrainBtn) {
      elements.learningTrainBtn.disabled = false;
      elements.learningTrainBtn.innerHTML = '<i class="fas fa-brain"></i> 一键学习';
    }
  }
}

/**
 * 删除模型
 */
async function deleteModel() {
  const ok = await handlers.showConfirmDialog?.('确认删除', '确定要删除已训练的模型吗？此操作不可恢复。', '🗑️');
  if (!ok) return;
  try {
    const res = await window.electronAPI?.tokenizerDeleteModel?.();
    if (res && res.success) {
      appState.settings.localLearning.modelTrained = false;
      appState.settings.localLearning.lastTrainedAt = null;
      handlers.showNotification?.('模型已删除', 'success');
      await loadModelStats();
    } else {
      handlers.showNotification?.('删除失败：' + (res?.error || '未知错误'), 'error');
    }
  } catch (e) {
    handlers.showNotification?.('删除出错：' + e.message, 'error');
  }
}

/**
 * 加载模型状态并更新 UI
 */
export async function loadModelStats() {
  try {
    const res = await window.electronAPI?.tokenizerLoadModel?.();
    if (res && res.success) {
      if (appState?.settings?.localLearning) {
        appState.settings.localLearning.modelTrained = res.usable;
        appState.settings.localLearning.lastTrainedAt = res.stats?.trainedAt || null;
        if (res.stats) {
          appState.settings.localLearning.sampleCount = res.stats.sampleCount || 0;
          appState.settings.localLearning.categoryCount = res.stats.categoryCount || 0;
        }
      }
      handlers.renderLearningModelStatus?.();
    }
  } catch (e) {
    console.error('Learning: loadModelStats error', e);
  }
}

/**
 * 选择类别（左侧列表点击）
 */
function selectCategory(catId) {
  if (!catId) return;
  currentCategoryId = catId;
  // 先保存上一个类别的编辑内容（如果有的话）
  // 这里不自动保存，避免频繁 IO；用户需点"保存样本"按钮
  // 渲染右侧样本编辑区
  handlers.renderLearningSamples?.(catId, appState?.learningCache?.samples);
  // 高亮左侧选中项
  if (elements?.learningCategoryList) {
    elements.learningCategoryList.querySelectorAll('.learning-category-item').forEach(item => {
      item.classList.toggle('active', item.dataset.catId === catId);
    });
  }
}

/**
 * 类别列表点击委托
 */
function handleCategoryListClick(e) {
  const item = e.target.closest('.learning-category-item');
  if (!item) return;
  const catId = item.dataset.catId;
  if (catId) selectCategory(catId);
}

/**
 * 新增自定义类别
 */
async function addCustomCategory() {
  const name = window.prompt?.('请输入类别名称（如：背景、姿势、构图）', '');
  if (!name || !name.trim()) return;
  const trimmed = name.trim();
  // 生成 catId（英文/数字用原值，中文转拼音或用 hash）
  const catId = generateCatId(trimmed);
  const samples = appState?.learningCache?.samples;
  if (!samples) return;
  if (!samples.customCategories) samples.customCategories = {};
  if (!samples.categories) samples.categories = {};
  // 检查重名
  if (samples.categories[catId] || BUILTIN_CATEGORY_IDS.includes(catId)) {
    handlers.showNotification?.('该类别已存在', 'warning');
    return;
  }
  // 选色（循环用预设色板）
  const colorIndex = Object.keys(samples.customCategories).length % PRESET_COLORS.length;
  samples.customCategories[catId] = { label: trimmed, color: PRESET_COLORS[colorIndex], subgroups: null };
  samples.categories[catId] = [];
  // 保存
  try {
    const res = await window.electronAPI?.tokenizerSaveSamples?.(samples);
    if (res && res.success) {
      handlers.showNotification?.(`类别"${trimmed}"已新增`, 'success');
      handlers.renderLearningCategoryList?.(samples);
      selectCategory(catId);
    } else {
      handlers.showNotification?.('新增失败：' + (res?.error || '未知错误'), 'error');
    }
  } catch (e) {
    handlers.showNotification?.('新增出错：' + e.message, 'error');
  }
}

/**
 * 重命名自定义类别
 */
async function renameCustomCategory(catId) {
  const samples = appState?.learningCache?.samples;
  if (!samples?.customCategories?.[catId]) {
    handlers.showNotification?.('仅可重命名自定义类别', 'warning');
    return;
  }
  const oldLabel = samples.customCategories[catId].label;
  const newLabel = window.prompt?.('请输入新名称', oldLabel);
  if (!newLabel || !newLabel.trim() || newLabel.trim() === oldLabel) return;
  samples.customCategories[catId].label = newLabel.trim();
  try {
    const res = await window.electronAPI?.tokenizerSaveSamples?.(samples);
    if (res && res.success) {
      handlers.showNotification?.('已重命名', 'success');
      handlers.renderLearningCategoryList?.(samples);
      handlers.renderLearningSamples?.(catId, samples);
    }
  } catch (e) {
    handlers.showNotification?.('重命名出错：' + e.message, 'error');
  }
}

/**
 * 删除自定义类别（含样本）
 */
async function deleteCustomCategory(catId) {
  const samples = appState?.learningCache?.samples;
  if (!samples?.customCategories?.[catId]) {
    handlers.showNotification?.('仅可删除自定义类别', 'warning');
    return;
  }
  const label = samples.customCategories[catId].label;
  const ok = await handlers.showConfirmDialog?.('确认删除', `确定要删除类别"${label}"及其所有样本吗？`, '🗑️');
  if (!ok) return;
  delete samples.customCategories[catId];
  delete samples.categories[catId];
  try {
    const res = await window.electronAPI?.tokenizerSaveSamples?.(samples);
    if (res && res.success) {
      handlers.showNotification?.(`类别"${label}"已删除`, 'success');
      // 选第一个剩余类别
      const remaining = Object.keys(samples.categories);
      handlers.renderLearningCategoryList?.(samples);
      if (remaining.length > 0) {
        selectCategory(remaining[0]);
      } else {
        currentCategoryId = null;
        if (elements?.learningSamplesTextarea) elements.learningSamplesTextarea.value = '';
        if (elements?.learningCurrentCatLabel) elements.learningCurrentCatLabel.textContent = '请选择或新增类别';
      }
    }
  } catch (e) {
    handlers.showNotification?.('删除出错：' + e.message, 'error');
  }
}

/**
 * 处理 .txt 文件导入（追加到 textarea，去重）
 */
function handleImportFile(e) {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const text = String(ev.target?.result || '');
    const existing = elements.learningSamplesTextarea?.value || '';
    const existingTags = new Set(parseTagsFromText(existing).map(t => t.toLowerCase()));
    const newTags = parseTagsFromText(text);
    const deduped = newTags.filter(t => !existingTags.has(t.toLowerCase()));
    const combined = existing.trim() + (existing.trim() && deduped.length ? '\n' : '') + deduped.join('\n');
    if (elements.learningSamplesTextarea) elements.learningSamplesTextarea.value = combined;
    handlers.showNotification?.(`已导入 ${deduped.length} 个新标签（去重后）`, 'success');
    // 重置 input 以便重复导入同一文件
    e.target.value = '';
  };
  reader.onerror = () => {
    handlers.showNotification?.('文件读取失败', 'error');
  };
  reader.readAsText(file, 'utf-8');
}

/**
 * 打开"从软件分类导入"弹窗
 * - 校验当前已选中学习类别（currentCategoryId）
 * - 遍历 appState.categories 渲染列表（id + name + 标签数）
 * - 点击某项 → 调用 importCategoryToCurrent(srcCatId) → 关闭弹窗
 */
function openImportCategoryModal() {
  if (!elements?.learningImportCategoryModal) return;
  if (!currentCategoryId) {
    handlers.showNotification?.('请先在左侧选择或新增学习类别', 'warning');
    return;
  }
  const list = elements.learningImportCategoryList;
  if (!list) return;
  list.innerHTML = '';
  const cats = (appState && appState.categories) || [];
  if (cats.length === 0) {
    handlers.showNotification?.('当前没有可导入的软件分类', 'warning');
    return;
  }
  const frag = document.createDocumentFragment();
  cats.forEach(cat => {
    const prompts = Array.isArray(cat.prompts) ? cat.prompts : [];
    const count = prompts.length;
    const item = document.createElement('div');
    item.className = 'batch-move-item learning-import-category-item';
    item.dataset.catId = cat.id || '';
    const label = document.createElement('span');
    label.className = 'learning-import-category-label';
    label.textContent = cat.name || cat.id || '未命名分类';
    const cnt = document.createElement('span');
    cnt.className = 'learning-import-category-count';
    cnt.textContent = `${count} 项`;
    item.appendChild(label);
    item.appendChild(cnt);
    item.addEventListener('click', () => {
      importCategoryToCurrent(cat.id);
      closeImportCategoryModal();
    });
    frag.appendChild(item);
  });
  list.appendChild(frag);
  elements.learningImportCategoryModal.classList.add('active');
}

/**
 * 关闭"从软件分类导入"弹窗
 */
function closeImportCategoryModal() {
  if (!elements?.learningImportCategoryModal) return;
  elements.learningImportCategoryModal.classList.remove('active');
}

/**
 * 将指定软件分类下所有提示词导入到当前学习类别
 * - 提取 prompts[].text（兼容 string 旧格式）
 * - 与 textarea 现有内容去重合并
 * - 更新样本计数显示（标注"未保存"）
 * @param {string} srcCatId - 软件分类 id
 */
function importCategoryToCurrent(srcCatId) {
  if (!srcCatId || !currentCategoryId) return;
  const cats = (appState && appState.categories) || [];
  const srcCat = cats.find(c => c.id === srcCatId);
  if (!srcCat || !Array.isArray(srcCat.prompts)) {
    handlers.showNotification?.('未找到该分类', 'warning');
    return;
  }
  // 提取标签文本（兼容 {text} 对象与 string 旧格式）
  const newTags = srcCat.prompts
    .map(p => (typeof p === 'string' ? p : (p && p.text) || ''))
    .filter(t => t && t.trim());
  if (newTags.length === 0) {
    handlers.showNotification?.('该分类下没有可导入的提示词', 'warning');
    return;
  }
  // 与 textarea 现有内容去重合并（复用 handleImportFile 的模式）
  const existing = elements.learningSamplesTextarea?.value || '';
  const existingTags = new Set(parseTagsFromText(existing).map(t => t.toLowerCase()));
  const deduped = newTags.filter(t => !existingTags.has(t.toLowerCase()));
  if (deduped.length === 0) {
    handlers.showNotification?.(`该分类的提示词已全部存在（共 ${newTags.length} 项，无新增）`, 'info');
    return;
  }
  const combined = existing.trim() + (existing.trim() && deduped.length ? '\n' : '') + deduped.join('\n');
  if (elements.learningSamplesTextarea) elements.learningSamplesTextarea.value = combined;
  // 更新计数显示（标注未保存）
  if (elements.learningSampleCount) {
    const total = parseTagsFromText(combined).length;
    elements.learningSampleCount.textContent = `${total} 个样本（未保存）`;
  }
  handlers.showNotification?.(
    `已从"${srcCat.name || srcCat.id}"导入 ${deduped.length} 个新标签（去重后，共 ${newTags.length} 项，未保存）`,
    'success'
  );
}

/**
 * 运行词典诊断
 */
export async function runDiagnostic() {
  if (!elements?.tokenizerDiagnosticInfo) return;
  elements.tokenizerDiagnosticInfo.textContent = '诊断中...';
  try {
    const res = await window.electronAPI?.tokenizerDiagnostic?.();
    if (res && res.success) {
      const lines = [];
      lines.push('=== 词典文件 ===');
      lines.push(`内置词典: ${res.builtinDictExists ? '✓ 存在' : '✗ 缺失'} (${formatSize(res.builtinDictSize)}) - ${res.builtinDictPath}`);
      lines.push(`asar 备份: ${res.asarFallbackExists ? '✓ 存在' : '✗ 缺失'} - ${res.asarFallbackPath}`);
      lines.push('');
      lines.push('=== 词典加载状态（内存）===');
      lines.push(`已加载到内存: ${res.dictLoadedInMemory ? '✓ 是' : '✗ 否（首次分类时加载）'}`);
      if (res.dictLoadedAt) {
        lines.push(`加载时间: ${new Date(res.dictLoadedAt).toLocaleString()}`);
      }
      if (res.dictLoadedInMemory) {
        lines.push(`内存中标签数: ${res.dictTagCount}`);
        lines.push(`内存中类别数: ${res.dictCategoryCount}`);
        lines.push(`使用 fallback: ${res.dictUsedFallback ? '⚠ 是（内置词典不可读，已降级到 asar 备份）' : '✓ 否（主路径正常）'}`);
        if (res.dictMetaPath) lines.push(`实际加载路径: ${res.dictMetaPath}`);
      }
      lines.push('');
      lines.push('=== 自定义规则 ===');
      lines.push(`文件: ${res.customRulesExists ? '✓ 存在' : '✗ 不存在'} - ${res.customRulesPath}`);
      if (res.customRulesExists && res.customRulesTagCount != null) {
        lines.push(`  标签数: ${res.customRulesTagCount}，类别数: ${res.customRulesCategoryCount}`);
      }
      lines.push('');
      lines.push('=== 学习模型设置 ===');
      lines.push(`启用: ${res.learningSettingsEnabled ? '✓ 已启用' : '✗ 未启用'}`);
      lines.push(`置信度阈值: ${res.learningSettingsMinConfidence}`);
      lines.push(`设置缓存已加载: ${res.learningSettingsCacheLoaded ? '✓ 是' : '✗ 否'}`);
      lines.push('');
      lines.push('=== 学习样本 ===');
      lines.push(`文件: ${res.samplesExists ? '✓ 存在 (' + formatSize(res.samplesSize) + ')' : '✗ 不存在'} - ${res.samplesPath}`);
      if (res.samplesExists && res.learnedSamplesTotalTags != null) {
        lines.push(`  样本标签数: ${res.learnedSamplesTotalTags}，类别数: ${res.learnedSamplesCategoryCount}（含 ${res.learnedSamplesCustomCategoryCount} 个自定义）`);
      }
      lines.push('');
      lines.push('=== 学习模型 ===');
      lines.push(`文件: ${res.modelExists ? '✓ 存在 (' + formatSize(res.modelSize) + ')' : '✗ 未训练'} - ${res.modelPath}`);
      if (res.errors && res.errors.length > 0) {
        lines.push('');
        lines.push('=== 错误 ===');
        res.errors.forEach(err => lines.push('⚠ ' + err));
      }
      elements.tokenizerDiagnosticInfo.textContent = lines.join('\n');
    } else {
      elements.tokenizerDiagnosticInfo.textContent = '诊断失败：' + (res?.error || '未知错误');
    }
  } catch (e) {
    elements.tokenizerDiagnosticInfo.textContent = '诊断出错：' + e.message;
  }
}

/**
 * 应用学习模型启用态
 */
export function applyLearningEnabledState() {
  // 学习模型开关由设置面板控制，这里仅同步 UI 显示
  if (appState?.settings?.localLearning) {
    const enabled = appState.settings.localLearning.enabled;
    if (elements?.learningEnabledCheckbox) elements.learningEnabledCheckbox.checked = enabled;
    const minConf = appState.settings.localLearning.minConfidence;
    if (elements?.learningMinConfidenceSelect) elements.learningMinConfidenceSelect.value = String(minConf);
  }
}

/**
 * 延迟初始化
 */
export async function initLearningDeferred() {
  applyLearningEnabledState();
  // 不在启动时加载模型状态，懒加载（打开学习中心或设置面板时加载）
}

// ============ 内部辅助函数 ============

/**
 * 从文本解析标签数组（支持逗号/换行分隔，去重，保留顺序）
 */
function parseTagsFromText(text) {
  if (!text || typeof text !== 'string') return [];
  const parts = text.split(/[,\n\r]/);
  const seen = new Set();
  const result = [];
  for (const p of parts) {
    const trimmed = p.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}

/**
 * 生成类别 id（中文用简单编码，英文直接用）
 */
function generateCatId(label) {
  // 英文/数字/下划线直接用（转小写，空格转下划线）
  if (/^[a-zA-Z0-9_\s]+$/.test(label)) {
    return label.trim().toLowerCase().replace(/\s+/g, '_');
  }
  // 非英文：用 encodeURIComponent 编码后取前 16 字符
  try {
    const encoded = encodeURIComponent(label);
    return 'cat_' + encoded.slice(0, 16).replace(/[^a-zA-Z0-9]/g, '_');
  } catch (e) {
    return 'cat_' + Date.now().toString(36);
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}
