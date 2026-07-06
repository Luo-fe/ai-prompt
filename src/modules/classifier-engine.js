/**
 * 分类引擎 — 纯函数模块，无副作用。
 *
 * 提供 Danbooru 风格标签的本地分类能力（character / artist / copyright / meta / general），
 * general 下再细分 8 个子组（people / clothing / action / scene / body / expression / object / other）。
 *
 * 本模块不引入任何 npm 依赖，可在主进程与渲染进程共用。
 * 词典对象由调用方注入（通常是 resources/dictionaries/danbooru-tags.json 的解析结果）。
 */

/**
 * @typedef {Object} ClassifyResult
 * @property {string}   tag       用户原始标签文本（不做变形）
 * @property {string}   category  主类别：character / artist / copyright / meta / general
 * @property {string|null} subgroup 仅 general 类别有子组；其他类别为 null
 * @property {boolean}  matched   是否被词典或规则命中（false 表示走回退）
 * @property {string}   source    匹配来源：dictionary / rule / learned / fallback
 * @property {number}   [confidence] 仅 source==='learned' 时存在，学习模型预测置信度（0-1）
 */

/**
 * @typedef {Object} CategoryRule
 * @property {RegExp}    pattern   正则
 * @property {string}    category  主类别
 * @property {string|null} subgroup 子组
 * @property {'rule'}    source    固定为 'rule'
 */

/**
 * 分类规则常量数组。
 *
 * 在 classifyTag 中按数组顺序依次匹配，命中首条即返回。
 * 覆盖 artist 后缀、人数计数、分辨率、年份、rating、meta 前缀等常见 Danbooru 模式。
 *
 * @type {CategoryRule[]}
 */
export const CATEGORY_RULES = [
  { pattern: /\(artist\)$/,                              category: 'artist',   subgroup: null,      source: 'rule' },
  { pattern: /\(cosplay\)$/,                             category: 'artist',   subgroup: null,      source: 'rule' },
  { pattern: /\(style\)$/,                               category: 'artist',   subgroup: null,      source: 'rule' },
  { pattern: /^\d+\s*(girl|boy|other)s?$/,               category: 'general',  subgroup: 'people',  source: 'rule' },
  { pattern: /^\d+\s*(girls|boys|others)$/,              category: 'general',  subgroup: 'people',  source: 'rule' },
  { pattern: /^(highres|lowres|absurdres)$/,             category: 'meta',     subgroup: null,      source: 'rule' },
  { pattern: /^translated/,                              category: 'meta',     subgroup: null,      source: 'rule' },
  { pattern: /^(19|20)\d{2}s?$/,                         category: 'meta',     subgroup: null,      source: 'rule' },
  { pattern: /^(safe|questionable|explicit|sensitive)$/, category: 'meta',     subgroup: null,      source: 'rule' },
  { pattern: /^(scan|digital|media|artistic|request|translation|edit)_/, category: 'meta', subgroup: null, source: 'rule' },
];

/**
 * 规范化标签文本。
 *
 * 流程：去首尾空格 → 内部多空格压缩为单空格 → 空格转下划线 → 转小写。
 * 例如 "On  Bed" → "on_bed"，"Hatsune Miku" → "hatsune_miku"。
 *
 * @param {string} tag - 原始标签
 * @returns {string} 规范化后的标签
 */
function normalizeTag(tag) {
  return String(tag)
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/ /g, '_')
    .toLowerCase();
}

/**
 * 深克隆（仅适用于 JSON 可序列化数据）。
 *
 * @template T
 * @param {T} obj
 * @returns {T}
 */
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * 从词典映射数组中取出 category / subgroup。
 *
 * @param {Array<string>} mapping - 形如 ["general", "people"] 或 ["meta"]
 * @returns {{category: string, subgroup: string|null}}
 */
function resolveMapping(mapping) {
  if (!Array.isArray(mapping) || mapping.length === 0) {
    return { category: 'general', subgroup: 'other' };
  }
  return { category: mapping[0], subgroup: mapping.length > 1 ? (mapping[1] || null) : null };
}

/**
 * 将学习模型预测的类别 id 解析为 {category, subgroup}
 *
 * 规则（与 learner.resolveLearnedCategory 保持一致，此处内联以保持零依赖）：
 *   - 若 catId 是 general 的子组（在 dictionary.categories.general.subgroups 中）→ {general, catId}
 *   - 若 catId 是顶级类别或自定义类别 → {catId, null}
 *
 * @param {string} catId - 模型预测的类别 id
 * @param {object} dictionary - 词典对象（含 categories）
 * @returns {{category: string, subgroup: string|null}}
 */
function _resolveLearnedCategoryInline(catId, dictionary) {
  const categories = (dictionary && dictionary.categories) || {};
  const generalDef = categories.general;
  if (generalDef && generalDef.subgroups && Object.prototype.hasOwnProperty.call(generalDef.subgroups, catId)) {
    return { category: 'general', subgroup: catId };
  }
  return { category: catId, subgroup: null };
}

/**
 * 单标签分类。
 *
 * 匹配优先级：
 *   1. 精确匹配 dictionary.tags[tag]
 *   2. 规范化匹配 dictionary.tags[normalized]
 *   3. 遍历 CATEGORY_RULES，对原始 tag 与规范化 tag 都试一遍正则
 *   3.5 学习模型预测（仅当 options.learningEnabled 且提供 predictor/learnedModel 时介入）
 *   4. 回退 general/other，matched=false，source='fallback'
 *
 * 返回结果中 `tag` 字段保留用户原始文本（仅做 String 转换，不做变形）。
 *
 * @param {string} tag - 待分类的标签文本
 * @param {object} dictionary - 词典对象，需包含 `tags` 字段（{ [tagName]: [category, subgroup?] }）
 * @param {Object} [options] - 可选参数
 * @param {boolean} [options.learningEnabled] - 是否启用学习模型辅助分类
 * @param {Function} [options.predictor] - 学习模型预测函数 (tag, model, minConfidence) => {category, confidence, scores}
 * @param {Object} [options.learnedModel] - 训练好的学习模型
 * @param {number} [options.minConfidence=0.6] - 学习模型置信度阈值
 * @returns {ClassifyResult}
 */
export function classifyTag(tag, dictionary, options = {}) {
  const original = String(tag);
  const normalized = normalizeTag(original);
  const tags = (dictionary && dictionary.tags) || {};

  // Step 1: 精确匹配
  if (Object.prototype.hasOwnProperty.call(tags, original)) {
    const { category, subgroup } = resolveMapping(tags[original]);
    return { tag: original, category, subgroup, matched: true, source: 'dictionary' };
  }

  // Step 2: 规范化匹配
  if (normalized !== original && Object.prototype.hasOwnProperty.call(tags, normalized)) {
    const { category, subgroup } = resolveMapping(tags[normalized]);
    return { tag: original, category, subgroup, matched: true, source: 'dictionary' };
  }

  // Step 3: 规则匹配（原始 + 规范化都试）
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(original) || rule.pattern.test(normalized)) {
      return { tag: original, category: rule.category, subgroup: rule.subgroup, matched: true, source: 'rule' };
    }
  }

  // Step 3.5: 学习模型预测（仅在词典+规则未命中、且学习模型启用时介入）
  if (options.learningEnabled && typeof options.predictor === 'function' && options.learnedModel) {
    const pred = options.predictor(original, options.learnedModel, options.minConfidence != null ? options.minConfidence : 0.6);
    if (pred && pred.category) {
      const { category, subgroup } = _resolveLearnedCategoryInline(pred.category, dictionary);
      return {
        tag: original,
        category,
        subgroup,
        matched: true,
        source: 'learned',
        confidence: pred.confidence
      };
    }
  }

  // Step 4: 回退
  return { tag: original, category: 'general', subgroup: 'other', matched: false, source: 'fallback' };
}

/**
 * 批量分类。
 *
 * 流程：按逗号拆分 → trim → 过滤空字符串 → 去重（保留首次出现顺序）→ 逐个 classifyTag。
 *
 * @param {string} tagsString - 逗号分隔的标签字符串
 * @param {object} dictionary - 词典对象
 * @param {Object} [options] - 透传给 classifyTag 的可选参数（学习模型相关）
 * @returns {{results: ClassifyResult[]}}
 */
export function classifyTags(tagsString, dictionary, options = {}) {
  if (typeof tagsString !== 'string' || tagsString.length === 0) {
    return { results: [] };
  }
  const seen = new Set();
  const results = [];
  const parts = tagsString.split(',');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.length === 0) continue;
    if (seen.has(trimmed)) continue;
    seen.add(trimmed);
    results.push(classifyTag(trimmed, dictionary, options));
  }
  return { results };
}

/**
 * 合并内置词典与用户自定义规则（用户规则优先）。
 *
 * - customRules.tags 中同名标签覆盖 baseDict.tags
 * - customRules.categories 中同名类别覆盖 baseDict.categories，新类别追加
 * - 不修改入参，返回新对象
 *
 * customRules schema：
 * ```
 * {
 *   categories?: { [catId]: { label?: string, color?: string, subgroups?: {...} } },
 *   tags?:       { [tagName]: [category, subgroup?] }
 * }
 * ```
 *
 * @param {object} baseDict - 内置词典
 * @param {object} [customRules] - 用户自定义规则
 * @returns {object} 合并后的新词典对象
 */
export function mergeDictionary(baseDict, customRules) {
  const merged = deepClone(baseDict || { version: 1, categories: {}, tags: {} });
  if (!customRules || typeof customRules !== 'object') {
    return merged;
  }

  // 合并 categories（覆盖同名，追加新增）
  if (customRules.categories && typeof customRules.categories === 'object') {
    if (!merged.categories || typeof merged.categories !== 'object') {
      merged.categories = {};
    }
    for (const [catId, catDef] of Object.entries(customRules.categories)) {
      if (catDef && typeof catDef === 'object') {
        merged.categories[catId] = deepClone(catDef);
      }
    }
  }

  // 合并 tags（覆盖同名，追加新增）
  if (customRules.tags && typeof customRules.tags === 'object') {
    if (!merged.tags || typeof merged.tags !== 'object') {
      merged.tags = {};
    }
    for (const [tag, mapping] of Object.entries(customRules.tags)) {
      if (Array.isArray(mapping)) {
        merged.tags[tag] = mapping.slice();
      }
    }
  }

  return merged;
}
