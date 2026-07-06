/**
 * 本地学习模型 — 多项式朴素贝叶斯（Multinomial Naive Bayes）
 *
 * 纯函数模块，零依赖，可在主进程（dynamic import）与渲染进程共用。
 *
 * 特征提取：整词 + 子词（按下划线拆分）+ 字符 3-gram（带 ^$ 边界标记）
 * 训练：统计每类特征频次 + 全局词汇表 + 拉普拉斯平滑
 * 预测：log 后验 + softmax 归一化，返回 top-1 类别与置信度
 *
 * 与 classifier-engine.js 的关系：
 *   - 本模块不依赖 classifier-engine（避免循环依赖），自带 normalizeTagLocal 副本
 *   - classifier-engine 通过 options.predictor 注入 predictTag，保持零依赖
 */

/**
 * @typedef {Object} LearnedModel
 * @property {number} version
 * @property {number} trainedAt           训练时间戳（ms）
 * @property {number} alpha               拉普拉斯平滑参数
 * @property {string[]} categories        参与训练的类别 id 列表
 * @property {Object<string, number>} categoryDocCount   每类样本（标签）数
 * @property {Object<string, number>} categoryTokenTotal 每类特征总频次
 * @property {Object<string, Object<string, number>>} categoryTokenFreq 每类每个特征的频次
 * @property {number} vocabSize           词汇表大小（去重后）
 * @property {number} totalDocs           总样本数
 * @property {Object<string, number>} categoryPrior  类别先验（log）
 * @property {Object} stats               { sampleCount, categoryCount, featureCount }
 * @property {string} [samplesHash]       样本哈希，用于检测是否需重新训练
 */

/**
 * 规范化标签文本（与 classifier-engine.normalizeTag 保持一致）
 * 流程：trim → 压缩多空格为单空格 → 空格转下划线 → 小写
 *
 * @param {string} tag
 * @returns {string}
 */
function normalizeTagLocal(tag) {
  return String(tag)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ /g, '_')
    .toLowerCase();
}

/**
 * 特征提取：整词 + 子词 + 字符 3-gram
 *
 * - 整词特征对短标签（1girl, thighhighs）保留强信号
 * - 子词（按 _ 拆分）应对复合标签如 white_thighhighs
 * - 字符 3-gram 用 ^...$ 边界标记，覆盖错拼/词形变化/前缀后缀
 *
 * @param {string} tag - 已规范化的标签
 * @returns {string[]} 特征数组（含重复，用于词频统计）
 */
export function extractFeatures(tag) {
  const t = String(tag || '').toLowerCase();
  const feats = [];
  // 整词
  feats.push(t);
  // 子词（按下划线拆分）
  t.split('_').forEach(w => {
    if (w) feats.push(w);
  });
  // 字符 3-gram（移除下划线后加边界标记）
  const padded = '^' + t.replace(/_/g, '') + '$';
  for (let i = 0; i + 3 <= padded.length; i++) {
    feats.push('g3:' + padded.slice(i, i + 3));
  }
  return feats;
}

/**
 * 训练多项式朴素贝叶斯模型
 *
 * @param {Object} samples - { categories: {catId: [tag,...]}, customCategories: {...} }
 * @param {Object} [opts]
 * @param {number} [opts.alpha=1.0]          拉普拉斯平滑参数
 * @param {number} [opts.minSamples=3]       每类最少样本数，不足则跳过该类
 * @returns {LearnedModel} 训练好的模型（可直接序列化为 JSON）
 */
export function trainModel(samples, opts = {}) {
  const alpha = opts.alpha ?? 1.0;
  const minSamples = opts.minSamples ?? 3;

  const model = {
    version: 1,
    trainedAt: Date.now(),
    alpha,
    categories: [],
    categoryDocCount: {},
    categoryTokenTotal: {},
    categoryTokenFreq: {},
    vocabSize: 0,
    totalDocs: 0,
    categoryPrior: {},
    stats: { sampleCount: 0, categoryCount: 0, featureCount: 0 }
  };

  if (!samples || typeof samples !== 'object') {
    return model;
  }

  // 合并内置类别与自定义类别的样本
  const allCats = new Set();
  const sampleCats = samples.categories || {};
  const customCats = samples.customCategories || {};
  Object.keys(sampleCats).forEach(c => allCats.add(c));
  Object.keys(customCats).forEach(c => allCats.add(c));

  const vocabSet = new Set();

  for (const catId of allCats) {
    const tags = (sampleCats[catId] || []).filter(t => t && typeof t === 'string');
    if (tags.length < minSamples) continue;  // 样本不足，跳过该类

    model.categories.push(catId);
    model.categoryDocCount[catId] = tags.length;
    model.categoryTokenFreq[catId] = {};
    model.categoryTokenTotal[catId] = 0;

    for (const tag of tags) {
      const feats = extractFeatures(normalizeTagLocal(tag));
      for (const f of feats) {
        model.categoryTokenFreq[catId][f] = (model.categoryTokenFreq[catId][f] || 0) + 1;
        model.categoryTokenTotal[catId] += 1;
        vocabSet.add(f);
      }
      model.totalDocs += 1;
    }
  }

  model.vocabSize = vocabSet.size;

  // 计算先验（log，避免下溢）；仅当 totalDocs > 0 时
  if (model.totalDocs > 0) {
    for (const catId of model.categories) {
      model.categoryPrior[catId] = Math.log(model.categoryDocCount[catId] / model.totalDocs);
    }
  }

  model.stats.sampleCount = model.totalDocs;
  model.stats.categoryCount = model.categories.length;
  model.stats.featureCount = model.vocabSize;
  return model;
}

/**
 * 预测单个标签的类别
 *
 * @param {string} tag - 待预测标签
 * @param {LearnedModel} model - 训练好的模型
 * @param {number} [minConfidence=0.6] - 置信度阈值，低于此值返回 category:null
 * @returns {{category: string|null, confidence: number, scores: Object}}
 *   - 模型不可用/类别为空/置信度 < 阈值时返回 {category: null, confidence: <实际值>, scores}
 */
export function predictTag(tag, model, minConfidence = 0.6) {
  if (!isModelUsable(model)) {
    return { category: null, confidence: 0, scores: {} };
  }
  const feats = extractFeatures(normalizeTagLocal(tag));

  const logScores = {};
  let maxLog = -Infinity;
  for (const catId of model.categories) {
    let logProb = model.categoryPrior[catId] ?? 0;  // log 先验
    const tokenTotal = model.categoryTokenTotal[catId] || 0;
    const denom = tokenTotal + model.alpha * model.vocabSize;
    const catFreq = model.categoryTokenFreq[catId] || {};
    for (const f of feats) {
      const num = (catFreq[f] || 0) + model.alpha;
      logProb += Math.log(num / denom);
    }
    logScores[catId] = logProb;
    if (logProb > maxLog) maxLog = logProb;
  }

  // softmax 转 probabilities（减最大值防溢出）
  const probs = {};
  let sumExp = 0;
  for (const catId of model.categories) {
    const e = Math.exp(logScores[catId] - maxLog);
    probs[catId] = e;
    sumExp += e;
  }
  let topCat = null;
  let topProb = 0;
  for (const catId of model.categories) {
    probs[catId] = probs[catId] / sumExp;
    if (probs[catId] > topProb) {
      topProb = probs[catId];
      topCat = catId;
    }
  }

  if (topProb < minConfidence) {
    return { category: null, confidence: topProb, scores: probs };
  }
  return { category: topCat, confidence: topProb, scores: probs };
}

/**
 * 批量预测
 *
 * @param {string[]} tags
 * @param {LearnedModel} model
 * @param {number} [minConfidence]
 * @returns {Array<{tag: string, category: string|null, confidence: number}>}
 */
export function predictBatch(tags, model, minConfidence) {
  if (!Array.isArray(tags)) return [];
  return tags.map(t => ({ tag: t, ...predictTag(t, model, minConfidence) }));
}

/**
 * 模型有效性自检
 * 至少 2 个类别且词汇表非空才可用
 *
 * @param {LearnedModel} model
 * @returns {boolean}
 */
export function isModelUsable(model) {
  return !!model
    && Array.isArray(model.categories)
    && model.categories.length >= 2
    && model.vocabSize > 0
    && model.totalDocs > 0;
}

/**
 * 将模型预测的类别 id 映射回 {category, subgroup}
 *
 * 规则：
 *   - 若 catId 是 general 的子组（在 dictionary.categories.general.subgroups 中）→ {general, catId}
 *   - 若 catId 是 dictionary.categories 的顶级类别（非 general）→ {catId, null}
 *   - 否则（自定义类别）→ {catId, null}
 *
 * @param {string} catId - 模型预测的类别 id
 * @param {object} dictionary - 词典对象（含 categories）
 * @returns {{category: string, subgroup: string|null}}
 */
export function resolveLearnedCategory(catId, dictionary) {
  const categories = (dictionary && dictionary.categories) || {};

  // 检查是否是 general 的子组
  const generalDef = categories.general;
  if (generalDef && generalDef.subgroups && Object.prototype.hasOwnProperty.call(generalDef.subgroups, catId)) {
    return { category: 'general', subgroup: catId };
  }

  // 顶级类别或自定义类别
  return { category: catId, subgroup: null };
}

/**
 * 计算样本对象的简单哈希（用于检测样本是否变化）
 * 使用 djb2 算法，返回十六进制字符串
 *
 * @param {Object} samples
 * @returns {string}
 */
export function hashSamples(samples) {
  try {
    const str = JSON.stringify(samples);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) >>> 0;
    }
    return hash.toString(16);
  } catch (e) {
    return '';
  }
}
