const defaultCategories = [
  {
    id: 'perspective', name: '视角', isDefault: true,
    prompts: [
      {text: 'from above', translation: '从上方'}, {text: 'three-quarter view', translation: '四分之三视图'},
      {text: 'front view', translation: '正面视图'}, {text: 'side view', translation: '侧面视图'},
      {text: 'back view', translation: '背面视图'}, {text: 'overhead view', translation: '俯视视图'},
      {text: 'bird\'s eye view', translation: '鸟瞰图'}, {text: 'worm\'s eye view', translation: '虫眼视图'}
    ]
  },
  {
    id: 'height', name: '高度', isDefault: true,
    prompts: [
      {text: 'high angle', translation: '高角度'}, {text: 'eye level', translation: '眼睛水平'},
      {text: 'low angle', translation: '低角度'}, {text: 'ground level', translation: '地面水平'},
      {text: 'aerial view', translation: '空中视图'}, {text: 'elevated view', translation: '高架视图'},
      {text: 'close-up', translation: '特写'}, {text: 'extreme close-up', translation: '极度特写'}
    ]
  },
  {
    id: 'composition', name: '构图', isDefault: true,
    prompts: [
      {text: 'rule of thirds', translation: '三分法则'}, {text: 'centered composition', translation: '居中构图'},
      {text: 'symmetrical composition', translation: '对称构图'}, {text: 'asymmetrical composition', translation: '不对称构图'},
      {text: 'leading lines', translation: '引导线'}, {text: 'frame within a frame', translation: '画中画'},
      {text: 'negative space', translation: '负空间'}, {text: 'golden ratio', translation: '黄金比例'}
    ]
  },
  {
    id: 'perspective_type', name: '透视', isDefault: true,
    prompts: [
      {text: 'linear perspective', translation: '线性透视'}, {text: 'atmospheric perspective', translation: '大气透视'},
      {text: 'one-point perspective', translation: '一点透视'}, {text: 'two-point perspective', translation: '两点透视'},
      {text: 'three-point perspective', translation: '三点透视'}, {text: 'isometric view', translation: '等轴视图'},
      {text: 'orthographic view', translation: '正交视图'}, {text: 'foreshortening', translation: '缩短透视'}
    ]
  },
  {
    id: 'lens_effect', name: '镜头效果', isDefault: true,
    prompts: [
      {text: 'shallow depth of field', translation: '浅景深'}, {text: 'cinematic lighting', translation: '电影照明'},
      {text: 'soft focus', translation: '柔焦'}, {text: 'sharp focus', translation: '锐焦'},
      {text: 'bokeh effect', translation: '散景效果'}, {text: 'vintage effect', translation: '复古效果'},
      {text: 'dramatic lighting', translation: '戏剧性照明'}, {text: 'natural lighting', translation: '自然照明'}
    ]
  },
  {
    id: 'lens_params', name: '镜头参数', isDefault: true,
    prompts: [
      {text: 'wide angle', translation: '广角'}, {text: 'telephoto lens', translation: '长焦镜头'},
      {text: 'fisheye lens', translation: '鱼眼镜头'}, {text: 'macro lens', translation: '微距镜头'},
      {text: 'portrait lens', translation: '人像镜头'}, {text: 'zoom lens', translation: '变焦镜头'},
      {text: 'prime lens', translation: '定焦镜头'}, {text: 'tilt-shift lens', translation: '移轴镜头'}
    ]
  }
];

const examples = [
  {
    name: '电影风格场景',
    combinations: {
      'perspective': ['from above', 'three-quarter view'],
      'height': ['high angle', 'eye level'],
      'lens_effect': ['shallow depth of field', 'cinematic lighting']
    }
  },
  {
    name: '产品摄影',
    combinations: {
      'perspective': ['three-quarter view', 'front view'],
      'height': ['eye level', 'close-up'],
      'composition': ['centered composition', 'negative space'],
      'lens_effect': ['sharp focus', 'natural lighting']
    }
  },
  {
    name: '建筑摄影',
    combinations: {
      'perspective': ['aerial view', 'front view'],
      'height': ['elevated view', 'ground level'],
      'perspective_type': ['two-point perspective', 'linear perspective'],
      'lens_params': ['wide angle', 'tilt-shift lens']
    }
  }
];

function pt(prompt) {
  return typeof prompt === 'object' && prompt !== null ? prompt.text : String(prompt);
}

function ptrans(prompt) {
  return typeof prompt === 'object' && prompt !== null ? (prompt.translation || '') : '';
}

function findPromptInCategory(category, text) {
  return category.prompts.find(p => pt(p) === text);
}

function findPromptIndex(arr, text) {
  return arr.findIndex(p => pt(p) === text);
}

let appState = {
  categories: [],
  selectedCategoryId: null,
  selectedPrompts: {},
  nextCategoryId: 1,
  translations: {},
  settings: {
    translationEnabled: true,
    useOnlineTranslation: true,
    translationAPI: 'https://api.mymemory.translated.net/get',
    showTranslationInPreview: true,
    autoTranslateNewWords: true,
    backgroundImage: '',
    panelOpacity: 95,
    panelStyle: 'frosted'
  },
  _addingPrompt: false
};

const elements = {
  categoryList: document.getElementById('category-list'),
  currentCategoryTitle: document.getElementById('current-category-title'),
  promptList: document.getElementById('prompt-list'),
  selectedPrompts: document.getElementById('selected-prompts'),
  previewOutput: document.getElementById('preview-output'),
  addCategoryBtn: document.getElementById('add-category-btn'),
  selectAllBtn: document.getElementById('select-all-btn'),
  deselectAllBtn: document.getElementById('deselect-all-btn'),
  editPromptsBtn: document.getElementById('edit-prompts-btn'),
  clearSelectedBtn: document.getElementById('clear-selected-btn'),
  exportBtn: document.getElementById('export-btn'),
  categoryModal: document.getElementById('category-modal'),
  promptModal: document.getElementById('prompt-modal'),
  exportModal: document.getElementById('export-modal'),
  newCategoryName: document.getElementById('new-category-name'),
  saveCategoryBtn: document.getElementById('save-category-btn'),
  customCategoryList: document.getElementById('custom-category-list'),
  promptModalTitle: document.getElementById('prompt-modal-title'),
  newPromptText: document.getElementById('new-prompt-text'),
  savePromptBtn: document.getElementById('save-prompt-btn'),
  batchImport: document.getElementById('batch-import'),
  batchImportBtn: document.getElementById('batch-import-btn'),
  categoryPromptsList: document.getElementById('category-prompts-list'),
  exportPreview: document.getElementById('export-preview'),
  copyToClipboardBtn: document.getElementById('copy-to-clipboard-btn'),
  downloadFileBtn: document.getElementById('download-file-btn'),
  mobileToggle: document.getElementById('mobile-toggle'),
  categoryPanel: document.querySelector('.category-panel'),
  randomCategorySelector: document.getElementById('random-category-selector'),
  randomGenerateBtn: document.getElementById('random-generate-btn'),
  randomResult: document.getElementById('random-result'),
  settingsBtn: document.getElementById('settings-btn'),
  settingsModal: document.getElementById('settings-modal'),
  translationEnabled: document.getElementById('translation-enabled'),
  onlineTranslation: document.getElementById('online-translation'),
  autoTranslateNew: document.getElementById('auto-translate-new'),
  showTranslationPreview: document.getElementById('show-translation-preview'),
  translationAPI: document.getElementById('translation-api'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  cancelSettingsBtn: document.getElementById('cancel-settings-btn'),
  cleanDuplicatesBtn: document.getElementById('clean-duplicates-btn'),
  exportAllDataBtn: document.getElementById('export-all-data-btn'),
  importDataBtn: document.getElementById('import-data-btn'),
  importFileInput: document.getElementById('import-file-input'),
  exportCsvBtn: document.getElementById('export-csv-btn'),
  importCsvBtn: document.getElementById('import-csv-btn'),
  importCsvFileInput: document.getElementById('import-csv-file-input'),
  translateAllBtn: document.getElementById('translate-all-btn'),
  bgUploadBtn: document.getElementById('bg-upload-btn'),
  bgClearBtn: document.getElementById('bg-clear-btn'),
  bgFileInput: document.getElementById('bg-file-input'),
  bgPreviewContainer: document.getElementById('bg-preview-container'),
  bgPreviewPlaceholder: document.getElementById('bg-preview-placeholder'),
  panelOpacitySlider: document.getElementById('panel-opacity-slider'),
  panelOpacityValue: document.getElementById('panel-opacity-value'),
  bgImageOverlay: document.getElementById('bg-image-overlay'),
  panelStyleFrosted: document.getElementById('panel-style-frosted'),
  panelStyleTransparent: document.getElementById('panel-style-transparent')
};

async function initApp() {
  try {
    loadData();
    loadTranslations();
    loadSettings();
    await migrateData();
    renderCategoryList();
    renderRandomCategorySelector();
    bindEvents();
    bindSettingsEvents();
    applyBackgroundSettings();
    renderExamples();
    initPreviewPanelResize();
  } catch (error) {
    console.error('Init failed:', error);
    if (!appState.categories || appState.categories.length === 0) {
      appState.categories = JSON.parse(JSON.stringify(defaultCategories));
    }
    if (!appState.selectedPrompts) appState.selectedPrompts = {};
    if (!appState.nextCategoryId) appState.nextCategoryId = 1;
    saveData();
    renderCategoryList();
    renderRandomCategorySelector();
    bindEvents();
    bindSettingsEvents();
  }
}

function loadData() {
  const savedData = localStorage.getItem('aiPromptToolData');
  if (savedData) {
    try {
      const parsedData = JSON.parse(savedData);
      appState.categories = parsedData.categories || defaultCategories;
      appState.selectedPrompts = parsedData.selectedPrompts || {};
      appState.nextCategoryId = parsedData.nextCategoryId || 1;
      ensureDefaultCategories();
    } catch (error) {
      console.error('Load data failed:', error);
      appState.categories = JSON.parse(JSON.stringify(defaultCategories));
    }
  } else {
    appState.categories = JSON.parse(JSON.stringify(defaultCategories));
  }
}

function ensureDefaultCategories() {
  defaultCategories.forEach(defaultCategory => {
    const existingCategory = appState.categories.find(cat => cat.id === defaultCategory.id);
    if (!existingCategory) {
      appState.categories.push(JSON.parse(JSON.stringify(defaultCategory)));
      return;
    }
    if (!existingCategory.isDefault) return;

    existingCategory.prompts = existingCategory.prompts.map(p => {
      if (typeof p === 'string') {
        const dp = defaultCategory.prompts.find(d => d.text === p);
        return { text: p, translation: dp ? dp.translation : '' };
      }
      if (typeof p === 'object' && p !== null) {
        if (!p.translation) {
          const dp = defaultCategory.prompts.find(d => d.text === p.text);
          if (dp && dp.translation) return { text: p.text, translation: dp.translation };
        }
        if (p.translation === undefined) return { text: p.text, translation: '' };
      }
      return p;
    });

    const existingTexts = new Set(existingCategory.prompts.map(p => pt(p)));
    const missing = defaultCategory.prompts.filter(d => !existingTexts.has(d.text));
    if (missing.length > 0) existingCategory.prompts.push(...missing);
  });
}

async function migrateData() {
  let hasChanges = false;
  for (const category of appState.categories) {
    const defaultCategory = defaultCategories.find(dc => dc.id === category.id);
    for (let i = 0; i < category.prompts.length; i++) {
      const prompt = category.prompts[i];
      if (typeof prompt === 'string') {
        let translation = '';
        if (defaultCategory) {
          const dp = defaultCategory.prompts.find(d => d.text === prompt);
          if (dp) translation = dp.translation;
        }
        if (!translation) translation = await translateText(prompt);
        category.prompts[i] = { text: prompt, translation };
        hasChanges = true;
      } else if (typeof prompt === 'object' && prompt !== null && (!prompt.translation || prompt.translation === '')) {
        let translation = '';
        if (defaultCategory) {
          const dp = defaultCategory.prompts.find(d => d.text === prompt.text);
          if (dp) translation = dp.translation;
        }
        if (!translation) translation = await translateText(prompt.text);
        if (translation) { prompt.translation = translation; hasChanges = true; }
      }
    }
  }
  if (hasChanges) saveData();
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

async function translateText(text, targetLanguage = 'zh') {
  if (!appState.settings.translationEnabled) return '';
  const cacheKey = `${text}_${targetLanguage}`;
  if (appState.translations[cacheKey]) return appState.translations[cacheKey];

  const fallback = getFallbackTranslation(text);
  if (fallback) {
    appState.translations[cacheKey] = fallback;
    saveTranslations();
    return fallback;
  }

  if (!appState.settings.useOnlineTranslation) return '';
  let translation = '';

  try { translation = await translateViaMyMemory(text, targetLanguage); } catch (e) { /* ignore */ }
  if (!translation) {
    try { translation = await translateViaCustomAPI(text, targetLanguage); } catch (e) { /* ignore */ }
  }

  if (translation) {
    appState.translations[cacheKey] = translation;
    saveTranslations();
  }
  return translation;
}

async function translateViaMyMemory(text, targetLanguage = 'zh') {
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    const data = await response.json();
    if (data.responseStatus === 200 && data.responseData && data.responseData.translatedText) {
      let translated = data.responseData.translatedText;
      if (translated.toLowerCase() === text.toLowerCase() && data.matches && data.matches.length > 1) {
        for (const match of data.matches) {
          if (match.translation && match.translation.toLowerCase() !== text.toLowerCase()) {
            translated = match.translation;
            break;
          }
        }
      }
      if (translated.toLowerCase() !== text.toLowerCase()) return translated;
    }
    return '';
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

async function translateViaCustomAPI(text, targetLanguage = 'zh') {
  const apiURL = appState.settings.translationAPI;
  if (!apiURL || apiURL === 'https://api.mymemory.translated.net/get') return '';
  const response = await fetch(apiURL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text, source: 'auto', target: targetLanguage, format: 'text' })
  });
  if (!response.ok) throw new Error(`Custom API error: ${response.status}`);
  const data = await response.json();
  const translation = data.translatedText || '';
  return (translation && translation.toLowerCase() !== text.toLowerCase()) ? translation : '';
}

const FALLBACK_TRANSLATIONS = {
  'man': '男人', 'woman': '女人', 'boy': '男孩', 'girl': '女孩', 'child': '儿童',
  'baby': '婴儿', 'elderly': '老年人', 'old man': '老人', 'old woman': '老妇人',
  'young man': '年轻男子', 'young woman': '年轻女子', 'gentleman': '绅士', 'lady': '女士',
  'king': '国王', 'queen': '女王', 'prince': '王子', 'princess': '公主',
  'knight': '骑士', 'warrior': '战士', 'samurai': '武士', 'ninja': '忍者',
  'wizard': '巫师', 'witch': '女巫', 'mage': '法师', 'priest': '牧师',
  'monk': '僧侣', 'pirate': '海盗', 'soldier': '士兵', 'hunter': '猎人',
  'archer': '弓箭手', 'assassin': '刺客', 'thief': '小偷', 'merchant': '商人',
  'farmer': '农民', 'chef': '厨师', 'doctor': '医生', 'nurse': '护士',
  'teacher': '教师', 'student': '学生', 'artist': '艺术家', 'musician': '音乐家',
  'dancer': '舞者', 'singer': '歌手', 'athlete': '运动员', 'robot': '机器人',
  'cyborg': '半机械人', 'alien': '外星人', 'zombie': '丧尸', 'vampire': '吸血鬼',
  'werewolf': '狼人', 'dragon': '龙', 'unicorn': '独角兽', 'angel': '天使',
  'demon': '恶魔', 'fairy': '仙女', 'elf': '精灵', 'dwarf': '矮人',
  'orc': '兽人', 'goblin': '哥布林', 'mermaid': '美人鱼', 'centaur': '半人马',
  'male': '男性', 'female': '女性', 'portrait': '肖像', 'landscape': '风景',
  'digital art': '数字艺术', 'oil painting': '油画', 'watercolor': '水彩画',
  'anime': '动漫', 'cartoon': '卡通', 'realistic': '写实', 'abstract': '抽象',
  'fantasy': '奇幻', 'sci-fi': '科幻', 'futuristic': '未来主义', 'vintage': '复古',
  'modern': '现代', 'minimalist': '极简主义', 'detailed': '详细的', 'colorful': '色彩丰富的',
  'monochrome': '单色的', 'bright': '明亮的', 'dark': '黑暗的', 'mysterious': '神秘的',
  'peaceful': '宁静的', 'dynamic': '动态的', 'static': '静态的', 'morning': '早晨',
  'night': '夜晚', 'sunset': '日落', 'sunrise': '日出', 'indoor': '室内', 'outdoor': '室外',
  'forest': '森林', 'mountain': '山脉', 'ocean': '海洋', 'city': '城市', 'village': '村庄',
  'space': '太空', 'close-up': '特写', 'wide shot': '广角镜头', 'full body': '全身',
  'upper body': '上半身', 'profile': '侧面', 'front view': '正面视图', 'back view': '背面视图',
  '3d': '三维', '2d': '二维', 'isometric': '等距', 'pixel art': '像素艺术',
  'vector': '矢量', 'line art': '线描艺术', 'sketch': '素描', 'concept art': '概念艺术',
  'character design': '角色设计', 'environment design': '环境设计', 'lighting': '光照',
  'shadows': '阴影', 'texture': '纹理', 'background': '背景', 'foreground': '前景',
  'focus': '焦点', 'blur': '模糊', 'depth of field': '景深', 'motion blur': '动态模糊',
  'high resolution': '高分辨率', '4k': '4K', '8k': '8K', 'hd': '高清', 'ultra hd': '超高清',
  'masterpiece': '杰作', 'best quality': '最佳质量', 'professional': '专业的', 'amateur': '业余的',
  'style': '风格', 'theme': '主题', 'mood': '情绪', 'atmosphere': '氛围', 'tone': '色调',
  'color scheme': '配色方案', 'composition': '构图', 'perspective': '透视', 'symmetry': '对称',
  'asymmetry': '不对称', 'balance': '平衡', 'contrast': '对比', 'harmony': '和谐', 'unity': '统一',
  'variety': '多样性', 'emphasis': '强调', 'rhythm': '节奏', 'pattern': '图案', 'repetition': '重复',
  'movement': '运动', 'direction': '方向', 'scale': '比例', 'proportion': '比例', 'size': '尺寸',
  'shape': '形状', 'form': '形式', 'positive space': '正空间', 'negative space': '负空间',
  'volume': '体积', 'mass': '质量', 'weight': '重量', 'gravity': '重力', 'light': '光',
  'value': '明度', 'hue': '色相', 'saturation': '饱和度', 'intensity': '强度', 'temperature': '色温',
  'warm': '温暖的', 'cool': '凉爽的', 'complementary colors': '互补色', 'analogous colors': '类似色',
  'triadic colors': '三色组', 'grayscale': '灰度', 'sepia': '棕褐色', 'vibrant': '鲜艳的',
  'muted': '柔和的', 'pastel': '柔和的', 'neon': '霓虹', 'natural': '自然的', 'artificial': '人工的',
  'organic': '有机的', 'inorganic': '无机的', 'geometric': '几何的', 'curved': '弯曲的',
  'straight': '直的', 'angular': '有角的', 'rounded': '圆形的', 'sharp': '尖锐的',
  'smooth': '平滑的', 'rough': '粗糙的', 'soft': '柔软的', 'hard': '坚硬的',
  'solid': '固体的', 'liquid': '液体的', 'gas': '气体的', 'transparent': '透明的',
  'translucent': '半透明的', 'opaque': '不透明的', 'reflective': '反光的', 'shiny': '闪亮的',
  'matte': '哑光的', 'glossy': '光泽的', 'textured': '有纹理的', 'fuzzy': '模糊的',
  'hairy': '多毛的', 'scaly': '有鳞的', 'feathery': '羽毛状的', 'leafy': '叶子的',
  'woody': '木质的', 'metallic': '金属的', 'plastic': '塑料的', 'glass': '玻璃的',
  'ceramic': '陶瓷的', 'stone': '石头的', 'marble': '大理石的', 'granite': '花岗岩的',
  'sand': '沙子的', 'water': '水的', 'fire': '火的', 'earth': '土的', 'air': '空气的',
  'lightning': '闪电的', 'ice': '冰的', 'snow': '雪的', 'rain': '雨的', 'cloud': '云的',
  'fog': '雾的', 'smoke': '烟的', 'dust': '灰尘的', 'sparkle': '闪耀的', 'glow': '发光的',
  'shine': '照耀的', 'dim': '昏暗的', 'shadowy': '阴暗的', 'gloomy': '阴郁的',
  'cheerful': '愉快的', 'happy': '快乐的', 'sad': '悲伤的', 'angry': '愤怒的',
  'scared': '害怕的', 'excited': '兴奋的', 'calm': '平静的', 'serene': '安详的',
  'tranquil': '宁静的', 'chaotic': '混乱的', 'orderly': '有序的', 'messy': '凌乱的',
  'clean': '干净的', 'dirty': '肮脏的', 'new': '新的', 'old': '旧的', 'ancient': '古老的',
  'retro': '复古的', 'classic': '经典的', 'contemporary': '当代的', 'traditional': '传统的',
  'cultural': '文化的', 'ethnic': '民族的', 'religious': '宗教的', 'spiritual': '精神的',
  'mythical': '神话的', 'legendary': '传奇的', 'horror': '恐怖的', 'mystery': '神秘的',
  'thriller': '惊悚的', 'comedy': '喜剧的', 'drama': '戏剧的', 'romance': '浪漫的',
  'action': '动作的', 'adventure': '冒险的', 'war': '战争的', 'historical': '历史的',
  'biographical': '传记的', 'documentary': '纪录片的', 'fictional': '虚构的',
  'non-fictional': '非虚构的', 'surrealistic': '超现实的', 'symbolic': '象征的',
  'metaphorical': '隐喻的', 'literal': '字面的', 'figurative': '比喻的', 'allegorical': '寓言的',
  'symbolism': '象征主义', 'metaphor': '隐喻', 'simile': '明喻', 'personification': '拟人化',
  'hyperbole': '夸张', 'irony': '讽刺', 'sarcasm': '讽刺', 'humor': '幽默', 'wit': '机智',
  'satire': '讽刺', 'parody': '模仿', 'caricature': '漫画', 'exaggeration': '夸张',
  'understatement': '轻描淡写', 'euphemism': '委婉语', 'dysphemism': '粗话', 'jargon': '行话',
  'slang': '俚语', 'idiom': '成语', 'proverb': '谚语', 'saying': '谚语', 'quote': '引语',
  'citation': '引用', 'reference': '参考', 'allusion': '典故', 'homage': '致敬',
  'tribute': '致敬', 'inspiration': '灵感', 'influence': '影响', 'original': '原创的',
  'derivative': '衍生的', 'unique': '独特的', 'rare': '稀有的', 'common': '常见的',
  'popular': '流行的', 'trendy': '时尚的', 'fashionable': '时尚的', 'stylish': '时髦的',
  'elegant': '优雅的', 'sophisticated': '复杂的', 'simple': '简单的', 'plain': '朴素的',
  'ornate': '华丽的', 'decorative': '装饰性的', 'functional': '功能性的', 'practical': '实用的',
  'theoretical': '理论的', 'concrete': '具体的', 'general': '一般的', 'specific': '具体的',
  'vague': '模糊的', 'clear': '清晰的', 'ambiguous': '模棱两可的', 'precise': '精确的',
  'accurate': '准确的', 'correct': '正确的', 'incorrect': '错误的', 'right': '对的',
  'wrong': '错的', 'true': '真实的', 'false': '虚假的', 'real': '真实的', 'fake': '假的',
  'genuine': '真正的', 'authentic': '真实的', 'counterfeit': '伪造的', 'replica': '复制品',
  'copy': '副本', 'work of art': '艺术品', 'creation': '创作', 'design': '设计',
  'invention': '发明', 'innovation': '创新', 'imitation': '模仿', 'emulation': '仿真',
  'adaptation': '改编', 'interpretation': '解释', 'expression': '表达',
  'representation': '表现', 'depiction': '描绘', 'portrayal': '描绘',
  'characterization': '刻画', 'description': '描述', 'narrative': '叙述',
  'storytelling': '讲故事', 'plot': '情节', 'setting': '背景', 'character': '角色',
  'protagonist': '主角', 'antagonist': '反派', 'hero': '英雄', 'heroine': '女英雄',
  'villain': '恶棍', 'sidekick': '助手', 'mentor': '导师', 'parent': '父母',
  'friend': '朋友', 'enemy': '敌人', 'lover': '爱人', 'family': '家人',
  'community': '社区', 'society': '社会', 'culture': '文化', 'civilization': '文明',
  'human': '人类', 'person': '人', 'individual': '个人', 'people': '人们', 'crowd': '人群',
  'mob': '暴民', 'group': '群体', 'team': '团队', 'organization': '组织', 'company': '公司',
  'business': '企业', 'industry': '工业', 'economy': '经济', 'politics': '政治',
  'government': '政府', 'nation': '国家', 'country': '国家', 'state': '州', 'town': '城镇',
  'neighborhood': '邻里', 'home': '家', 'house': '房子', 'building': '建筑',
  'structure': '结构', 'architecture': '建筑', 'planning': '规划', 'construction': '建设',
  'development': '发展', 'growth': '增长', 'progress': '进步', 'improvement': '改进',
  'change': '变化', 'transformation': '转变', 'evolution': '进化', 'revolution': '革命',
  'discovery': '发现', 'exploration': '探索', 'journey': '旅程', 'trip': '旅行',
  'voyage': '航行', 'expedition': '探险', 'quest': '追求', 'mission': '使命',
  'goal': '目标', 'objective': '目标', 'purpose': '目的', 'intention': '意图',
  'motivation': '动机', 'passion': '激情', 'enthusiasm': '热情', 'dedication': '奉献',
  'commitment': '承诺', 'determination': '决心', 'perseverance': '毅力', 'persistence': '坚持',
  'hard work': '努力工作', 'success': '成功', 'failure': '失败', 'achievement': '成就',
  'accomplishment': '成就', 'victory': '胜利', 'defeat': '失败', 'challenge': '挑战',
  'problem': '问题', 'solution': '解决方案', 'difficulty': '困难', 'obstacle': '障碍',
  'hurdle': '障碍', 'setback': '挫折', 'delay': '延迟', 'advance': '前进',
  'activity': '活动', 'behavior': '行为', 'conduct': '行为', 'manner': '方式',
  'method': '方法', 'technique': '技术', 'skill': '技能', 'ability': '能力',
  'talent': '天赋', 'gift': '礼物', 'aptitude': '才能', 'proficiency': '熟练',
  'expertise': '专业知识', 'knowledge': '知识', 'wisdom': '智慧', 'intelligence': '智力',
  'understanding': '理解', 'comprehension': '理解', 'learning': '学习', 'education': '教育',
  'training': '培训', 'practice': '练习', 'experience': '经验', 'experiment': '实验',
  'research': '研究', 'study': '学习', 'investigation': '调查', 'production': '生产',
  'manufacturing': '制造', 'management': '管理', 'leadership': '领导', 'teamwork': '团队合作',
  'collaboration': '合作', 'cooperation': '合作', 'communication': '沟通',
  'articulation': '表达', 'speech': '演讲', 'writing': '写作', 'reading': '阅读',
  'listening': '倾听', 'viewing': '观看', 'observing': '观察', 'perception': '感知',
  'sensation': '感觉', 'emotion': '情感', 'feeling': '感觉', 'attitude': '态度',
  'opinion': '意见', 'belief': '信仰', 'conviction': '信念', 'doubt': '怀疑',
  'uncertainty': '不确定性', 'confidence': '信心', 'trust': '信任', 'faith': '信仰',
  'hope': '希望', 'desire': '欲望', 'longing': '渴望', 'yearning': '渴望',
  'ambition': '野心', 'aspiration': '愿望', 'dream': '梦想',
  'standing': '站立', 'sitting': '坐着', 'walking': '行走', 'running': '奔跑',
  'jumping': '跳跃', 'flying': '飞行', 'swimming': '游泳', 'dancing': '跳舞',
  'fighting': '战斗', 'sleeping': '睡觉', 'painting': '绘画', 'playing': '玩耍',
  'singing': '唱歌', 'laughing': '大笑', 'crying': '哭泣', 'smiling': '微笑',
  'thinking': '思考', 'meditating': '冥想', 'eating': '进食', 'drinking': '喝水',
  'talking': '说话', 'whispering': '低语', 'shouting': '呐喊', 'looking up': '抬头看',
  'looking down': '低头看', 'looking away': '看向别处', 'turning around': '转身',
  'reaching out': '伸手', 'pointing': '指向', 'holding': '握着', 'carrying': '搬运',
  'pushing': '推', 'pulling': '拉', 'kneeling': '跪着', 'lying down': '躺下',
  'leaning': '倚靠', 'stretching': '伸展', 'bending': '弯曲', 'crouching': '蹲下',
  'climbing': '攀爬', 'falling': '坠落', 'floating': '漂浮', 'glowing': '发光',
  'sparkling': '闪烁', 'burning': '燃烧', 'freezing': '冰冻', 'melting': '融化',
  'flowing': '流动', 'blowing': '吹', 'raining': '下雨', 'snowing': '下雪',
  'storming': '暴风雨', 'sunny': '晴朗', 'cloudy': '多云', 'foggy': '有雾',
  'windy': '有风', 'turbulent': '湍急', 'epic': '史诗', 'grand': '宏伟',
  'intimate': '亲密', 'vast': '广阔', 'tiny': '微小', 'massive': '巨大',
  'delicate': '精致', 'wet': '湿润', 'dry': '干燥', 'hot': '炎热', 'cold': '寒冷',
  'ruins': '废墟', 'castle': '城堡', 'temple': '神殿', 'church': '教堂',
  'palace': '宫殿', 'tower': '塔', 'bridge': '桥', 'garden': '花园',
  'waterfall': '瀑布', 'lake': '湖泊', 'river': '河流', 'desert': '沙漠',
  'island': '岛屿', 'beach': '海滩', 'cave': '洞穴', 'cliff': '悬崖',
  'valley': '山谷', 'meadow': '草地', 'field': '田野', 'road': '道路',
  'street': '街道', 'alley': '小巷', 'market': '市场', 'library': '图书馆',
  'museum': '博物馆', 'theater': '剧院', 'stadium': '体育场', 'hospital': '医院',
  'school': '学校', 'prison': '监狱', 'dungeon': '地牢', 'laboratory': '实验室',
  'workshop': '工坊', 'tavern': '酒馆', 'inn': '客栈', 'cottage': '小屋',
  'mansion': '豪宅', 'apartment': '公寓', 'skyscraper': '摩天大楼',
  'spaceship': '宇宙飞船', 'station': '空间站', 'armor': '盔甲', 'sword': '剑',
  'shield': '盾牌', 'bow': '弓', 'arrow': '箭', 'spear': '长矛', 'axe': '斧头',
  'hammer': '锤子', 'staff': '法杖', 'wand': '魔杖', 'potion': '药水',
  'scroll': '卷轴', 'book': '书', 'crown': '王冠', 'cloak': '斗篷', 'robe': '长袍',
  'dress': '连衣裙', 'suit': '西装', 'uniform': '制服', 'helmet': '头盔',
  'mask': '面具', 'gloves': '手套', 'boots': '靴子', 'hat': '帽子', 'cape': '披风',
  'wings': '翅膀', 'horns': '角', 'tail': '尾巴', 'claws': '爪子', 'fangs': '獠牙',
  'scales': '鳞片', 'feathers': '羽毛', 'fur': '毛皮', 'skin': '皮肤', 'hair': '头发',
  'eyes': '眼睛', 'face': '脸', 'hands': '手', 'feet': '脚', 'body': '身体',
  'head': '头', 'arms': '手臂', 'legs': '腿', 'chest': '胸', 'back': '背',
  'shoulders': '肩膀', 'neck': '脖子', 'waist': '腰', 'hips': '臀部', 'muscles': '肌肉',
  'tattoo': '纹身', 'scar': '疤痕', 'wrinkles': '皱纹', 'freckles': '雀斑',
  'beard': '胡须', 'mustache': '八字胡', 'ponytail': '马尾辫', 'braid': '辫子',
  'curly hair': '卷发', 'straight hair': '直发', 'short hair': '短发', 'long hair': '长发',
  'blonde': '金发', 'brunette': '棕发', 'redhead': '红发', 'black hair': '黑发',
  'white hair': '白发', 'blue eyes': '蓝眼睛', 'green eyes': '绿眼睛',
  'brown eyes': '棕眼睛', 'gray eyes': '灰眼睛'
};

function getFallbackTranslation(text) {
  return FALLBACK_TRANSLATIONS[text.toLowerCase()] || null;
}

function saveTranslations() {
  try {
    const entries = Object.entries(appState.translations);
    if (entries.length > 500) {
      appState.translations = Object.fromEntries(entries.slice(-500));
    }
    localStorage.setItem('aiPromptToolTranslations', JSON.stringify(appState.translations));
  } catch (e) { /* ignore */ }
}

function loadTranslations() {
  try {
    const saved = localStorage.getItem('aiPromptToolTranslations');
    if (saved) appState.translations = JSON.parse(saved);
  } catch (e) { /* ignore */ }
}

const saveData = function() {
  try {
    localStorage.setItem('aiPromptToolData', JSON.stringify({
      categories: appState.categories,
      selectedPrompts: appState.selectedPrompts,
      nextCategoryId: appState.nextCategoryId
    }));
  } catch (error) {
    if (error.name === 'QuotaExceededError') showNotification('存储空间不足，请清理浏览器缓存', 'error');
  }
};

function saveSettingsToStorage() {
  try {
    localStorage.setItem('aiPromptToolSettings', JSON.stringify(appState.settings));
  } catch (e) { /* ignore */ }
}

function loadSettings() {
  try {
    const savedSettings = localStorage.getItem('aiPromptToolSettings');
    if (savedSettings) appState.settings = { ...appState.settings, ...JSON.parse(savedSettings) };
  } catch (e) { /* ignore */ }
}

function renderRandomCategorySelector() {
  if (!elements.randomCategorySelector) return;
  const frag = document.createDocumentFragment();
  appState.categories.forEach(category => {
    const item = document.createElement('div');
    item.className = 'category-checkbox-item';
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.id = `random-cat-${category.id}`; cb.value = category.id;
    cb.className = 'random-category-checkbox';
    const label = document.createElement('label');
    label.htmlFor = `random-cat-${category.id}`; label.textContent = category.name;
    item.appendChild(cb); item.appendChild(label);
    frag.appendChild(item);
  });
  elements.randomCategorySelector.innerHTML = '';
  elements.randomCategorySelector.appendChild(frag);
}

function renderCategoryList() {
  elements.categoryList.innerHTML = '';
  const frag = document.createDocumentFragment();
  appState.categories.forEach(category => {
    const item = document.createElement('li');
    item.className = `category-item ${appState.selectedCategoryId === category.id ? 'active' : ''}`;
    item.dataset.categoryId = category.id;

    const actions = document.createElement('div');
    actions.className = 'category-actions';

    if (!category.isDefault) {
      const editBtn = document.createElement('button');
      editBtn.className = 'category-action-btn';
      editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
      editBtn.title = '编辑分类';
      editBtn.addEventListener('click', e => { e.stopPropagation(); editCategory(category.id); });
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'category-action-btn';
      deleteBtn.innerHTML = '<i class="fa fa-trash"></i>';
      deleteBtn.title = '删除分类';
      deleteBtn.addEventListener('click', e => { e.stopPropagation(); deleteCategory(category.id); });
      actions.appendChild(editBtn); actions.appendChild(deleteBtn);
    } else {
      const editBtn = document.createElement('button');
      editBtn.className = 'category-action-btn';
      editBtn.innerHTML = '<i class="fa fa-pencil"></i>';
      editBtn.title = '编辑提示词';
      editBtn.addEventListener('click', e => { e.stopPropagation(); openPromptModal(category.id); });
      actions.appendChild(editBtn);
    }

    const nameSpan = document.createElement('span');
    nameSpan.className = 'category-name'; nameSpan.textContent = category.name;
    item.appendChild(nameSpan); item.appendChild(actions);
    item.addEventListener('click', () => selectCategory(category.id));
    frag.appendChild(item);
  });
  elements.categoryList.appendChild(frag);
}

function selectCategory(categoryId) {
  appState.selectedCategoryId = categoryId;
  renderCategoryList();
  renderPromptList(categoryId);
  if (window.innerWidth <= 768) {
    elements.categoryPanel.classList.remove('active');
    const overlay = document.querySelector('.overlay');
    if (overlay) overlay.classList.remove('active');
  }
}

function createTranslationUI(categoryId, prompt, translationElement) {
  const row = document.createElement('div');
  row.className = 'translation-edit-row';
  const translation = document.createElement('span');
  translation.className = 'prompt-translation editable-translation';
  translation.textContent = ptrans(prompt);
  translation.title = '点击编辑翻译';
  translation.addEventListener('click', e => { e.stopPropagation(); startEditTranslation(categoryId, prompt, translation); });
  const translateBtn = document.createElement('button');
  translateBtn.className = 'inline-translate-btn';
  translateBtn.innerHTML = '<i class="fa fa-language"></i>';
  translateBtn.title = '一键翻译';
  translateBtn.addEventListener('click', async e => { e.stopPropagation(); await inlineTranslatePrompt(categoryId, prompt, translation); });
  row.appendChild(translation); row.appendChild(translateBtn);
  return row;
}

function renderPromptList(categoryId) {
  const targetId = categoryId || appState.selectedCategoryId;
  const category = appState.categories.find(cat => cat.id === targetId);
  if (!category) {
    elements.currentCategoryTitle.textContent = '请选择分类';
    elements.promptList.innerHTML = '<div class="no-prompts">请从左侧选择一个分类</div>';
    return;
  }
  elements.currentCategoryTitle.textContent = category.name;
  if (category.prompts.length === 0) {
    elements.promptList.innerHTML = '<div class="no-prompts">此分类下暂无提示词</div>';
    return;
  }

  elements.promptList.innerHTML = '';
  const frag = document.createDocumentFragment();
  category.prompts.forEach(prompt => {
    const item = document.createElement('div');
    item.className = `prompt-item ${isPromptSelected(category.id, prompt) ? 'selected' : ''}`;
    const cb = document.createElement('input');
    cb.type = 'checkbox'; cb.className = 'prompt-checkbox';
    cb.checked = isPromptSelected(category.id, prompt);
    cb.addEventListener('change', () => {
      togglePrompt(category.id, prompt);
      item.classList.toggle('selected', isPromptSelected(category.id, prompt));
      item.classList.add('pulse');
      setTimeout(() => item.classList.remove('pulse'), 300);
    });

    const textContainer = document.createElement('div');
    textContainer.className = 'prompt-text-container';
    const text = document.createElement('span');
    text.className = 'prompt-text'; text.textContent = pt(prompt);
    textContainer.appendChild(text);

    if (appState.settings.translationEnabled) {
      textContainer.appendChild(createTranslationUI(category.id, prompt));
    }

    item.appendChild(cb); item.appendChild(textContainer);
    item.addEventListener('click', e => {
      if (e.target !== cb && !e.target.closest('.editable-translation') && !e.target.closest('.inline-translate-btn') && !e.target.closest('.translation-edit-input')) {
        cb.checked = !cb.checked;
        togglePrompt(category.id, prompt);
        item.classList.toggle('selected', isPromptSelected(category.id, prompt));
        item.classList.add('pulse');
        setTimeout(() => item.classList.remove('pulse'), 300);
      }
    });
    frag.appendChild(item);
  });
  elements.promptList.appendChild(frag);
}

function startEditTranslation(categoryId, prompt, translationElement) {
  if (translationElement.querySelector('input')) return;
  const currentTranslation = ptrans(prompt);
  const currentText = pt(prompt);
  const input = document.createElement('input');
  input.type = 'text'; input.className = 'translation-edit-input';
  input.value = currentTranslation; input.placeholder = '输入翻译...';
  let editSaved = false;

  const saveEdit = () => {
    if (editSaved) return;
    editSaved = true;
    const newTranslation = input.value.trim();
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (category) {
      const cp = findPromptInCategory(category, currentText);
      if (cp && typeof cp === 'object') cp.translation = newTranslation;
    }
    if (appState.selectedPrompts[categoryId]) {
      const idx = findPromptIndex(appState.selectedPrompts[categoryId], currentText);
      if (idx !== -1 && typeof appState.selectedPrompts[categoryId][idx] === 'object') {
        appState.selectedPrompts[categoryId][idx].translation = newTranslation;
      }
    }
    translationElement.textContent = newTranslation;
    saveData(); renderSelectedPrompts(); renderPreview();
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
  input.focus(); input.select();
}

async function inlineTranslatePrompt(categoryId, prompt, translationElement) {
  const currentText = pt(prompt);
  translationElement.textContent = '翻译中...';
  translationElement.style.opacity = '0.5';
  try {
    const translation = await translateText(currentText);
    if (translation) {
      const category = appState.categories.find(cat => cat.id === categoryId);
      if (category) {
        const cp = findPromptInCategory(category, currentText);
        if (cp && typeof cp === 'object') cp.translation = translation;
      }
      if (appState.selectedPrompts[categoryId]) {
        const idx = findPromptIndex(appState.selectedPrompts[categoryId], currentText);
        if (idx !== -1 && typeof appState.selectedPrompts[categoryId][idx] === 'object') {
          appState.selectedPrompts[categoryId][idx].translation = translation;
        }
      }
      translationElement.textContent = translation;
      translationElement.style.opacity = '';
      saveData(); renderSelectedPrompts(); renderPreview();
      showNotification(`"${currentText}" 翻译成功`, 'success');
    } else {
      translationElement.textContent = ptrans(prompt);
      translationElement.style.opacity = '';
      showNotification(`"${currentText}" 翻译失败，请手动编辑`, 'warning');
    }
  } catch (error) {
    translationElement.textContent = ptrans(prompt);
    translationElement.style.opacity = '';
    showNotification(`翻译失败: ${error.message}`, 'error');
  }
}

function isPromptSelected(categoryId, prompt) {
  if (!appState.selectedPrompts[categoryId]) return false;
  const text = pt(prompt);
  return appState.selectedPrompts[categoryId].some(p => pt(p) === text);
}

function togglePrompt(categoryId, prompt) {
  if (!appState.selectedPrompts[categoryId]) appState.selectedPrompts[categoryId] = [];
  const promptText = pt(prompt);
  const index = findPromptIndex(appState.selectedPrompts[categoryId], promptText);

  if (index === -1) {
    const category = appState.categories.find(cat => cat.id === categoryId);
    let translation = ptrans(prompt);
    if (!translation && category) {
      const cp = findPromptInCategory(category, promptText);
      if (cp && typeof cp === 'object' && cp.translation) translation = cp.translation;
    }
    appState.selectedPrompts[categoryId].push({ text: promptText, translation });
  } else {
    appState.selectedPrompts[categoryId].splice(index, 1);
  }
  renderSelectedPrompts(); renderPreview(); saveData();
}

function renderSelectedPrompts() {
  const count = getSelectedPromptsCount();
  if (count === 0) {
    elements.selectedPrompts.innerHTML = '<div class="no-selected">暂无选中的提示词</div>';
    return;
  }
  elements.selectedPrompts.innerHTML = '';
  const frag = document.createDocumentFragment();
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    const group = document.createElement('div');
    group.className = 'selected-category-group';
    const title = document.createElement('h4');
    title.className = 'selected-category-title'; title.textContent = category.name;
    group.appendChild(title);

    appState.selectedPrompts[categoryId].forEach(prompt => {
      const item = document.createElement('div');
      item.className = 'selected-prompt-item';
      const textContainer = document.createElement('div');
      textContainer.className = 'selected-prompt-text-container';
      const text = document.createElement('span');
      text.className = 'selected-prompt-text'; text.textContent = pt(prompt);
      const translation = document.createElement('span');
      translation.className = 'selected-prompt-translation'; translation.textContent = ptrans(prompt);
      textContainer.appendChild(text);
      if (appState.settings.translationEnabled && translation.textContent.trim()) textContainer.appendChild(translation);
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-prompt-btn';
      removeBtn.innerHTML = '<i class="fa fa-times"></i>';
      removeBtn.title = '移除提示词';
      removeBtn.addEventListener('click', () => { togglePrompt(categoryId, prompt); renderPromptList(); });
      item.appendChild(textContainer); item.appendChild(removeBtn);
      group.appendChild(item);
    });
    frag.appendChild(group);
  });
  elements.selectedPrompts.appendChild(frag);
}

function getSelectedPromptsCount() {
  return Object.values(appState.selectedPrompts).reduce((total, prompts) => total + prompts.length, 0);
}

function renderPreview() {
  const count = getSelectedPromptsCount();
  if (count === 0) {
    elements.previewOutput.innerHTML = '<p class="placeholder">请选择提示词以预览组合效果</p>';
    return;
  }
  const allPrompts = getAllSelectedPrompts();
  elements.previewOutput.textContent = allPrompts.join(', ');
  if (appState.settings.translationEnabled && appState.settings.showTranslationInPreview) {
    const allTranslations = [];
    Object.keys(appState.selectedPrompts).forEach(categoryId => {
      appState.selectedPrompts[categoryId].forEach(p => {
        const t = ptrans(p);
        if (t) allTranslations.push(t);
      });
    });
    if (allTranslations.length > 0) {
      const div = document.createElement('div');
      div.className = 'preview-translation'; div.textContent = allTranslations.join('，');
      elements.previewOutput.appendChild(document.createElement('br'));
      elements.previewOutput.appendChild(div);
    }
  }
}

function renderExamples() {
  const section = document.querySelector('.examples-section');
  if (!section) return;
  while (section.children.length > 1) section.removeChild(section.lastChild);
  examples.forEach(example => {
    const item = document.createElement('div');
    item.className = 'example-item';
    let combinationsHtml = '', previewText = '', first = true;
    Object.keys(example.combinations).forEach(categoryId => {
      const category = appState.categories.find(cat => cat.id === categoryId);
      if (!category) return;
      combinationsHtml += `<p><strong>${category.name}:</strong> ${example.combinations[categoryId].join(', ')}</p>`;
      example.combinations[categoryId].forEach(p => {
        if (!first) previewText += ', ';
        previewText += p; first = false;
      });
    });
    item.innerHTML = `<h4>${example.name}</h4>${combinationsHtml}<p class="example-combination">"${previewText}"</p><button class="btn btn-small apply-example" data-example="${example.name}">应用此示例</button>`;
    section.appendChild(item);
    item.querySelector('.apply-example').addEventListener('click', () => applyExample(example));
  });
}

function applyExample(example) {
  appState.selectedPrompts = {};
  Object.keys(example.combinations).forEach(categoryId => {
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    appState.selectedPrompts[categoryId] = [];
    example.combinations[categoryId].forEach(promptText => {
      const found = category.prompts.find(p => pt(p) === promptText);
      appState.selectedPrompts[categoryId].push(found && typeof found === 'object' ? { ...found } : { text: promptText, translation: '' });
    });
  });
  renderPromptList(); renderSelectedPrompts(); renderPreview(); saveData();
  showNotification('示例已应用');
}

function selectAllPrompts() {
  const category = appState.categories.find(cat => cat.id === appState.selectedCategoryId);
  if (!category) return;
  if (!appState.selectedPrompts[category.id]) appState.selectedPrompts[category.id] = [];
  category.prompts.forEach(prompt => {
    const text = pt(prompt);
    if (!appState.selectedPrompts[category.id].some(p => pt(p) === text)) {
      appState.selectedPrompts[category.id].push(typeof prompt === 'object' && prompt !== null ? { ...prompt } : { text: String(prompt), translation: '' });
    }
  });
  renderPromptList(); renderSelectedPrompts(); renderPreview(); saveData();
}

function deselectAllPrompts() {
  const category = appState.categories.find(cat => cat.id === appState.selectedCategoryId);
  if (!category) return;
  appState.selectedPrompts[category.id] = [];
  renderPromptList(); renderSelectedPrompts(); renderPreview(); saveData();
}

function clearAllSelectedPrompts() {
  appState.selectedPrompts = {};
  renderPromptList(); renderSelectedPrompts(); renderPreview(); saveData();
  showNotification('已清空所有选中的提示词');
}

function addCategory(name) {
  if (!name.trim()) { showNotification('分类名称不能为空', 'error'); return; }
  if (appState.categories.some(cat => cat.name === name.trim())) { showNotification('分类名称已存在', 'error'); return; }
  const newCategory = { id: `custom_${appState.nextCategoryId++}`, name: name.trim(), isDefault: false, prompts: [] };
  appState.categories.push(newCategory);
  renderCategoryList(); saveData(); renderRandomCategorySelector();
  selectCategory(newCategory.id);
  elements.newCategoryName.value = '';
  closeModal('category-modal');
  showNotification(`分类 "${name}" 已添加`);
}

function editCategory(categoryId) {
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category || category.isDefault) return;
  const newName = prompt('请输入新的分类名称:', category.name);
  if (newName === null) return;
  if (!newName.trim()) { showNotification('分类名称不能为空', 'error'); return; }
  if (appState.categories.some(cat => cat.id !== categoryId && cat.name === newName.trim())) { showNotification('分类名称已存在', 'error'); return; }
  category.name = newName.trim();
  renderCategoryList(); saveData();
  if (appState.selectedCategoryId === categoryId) elements.currentCategoryTitle.textContent = category.name;
  showNotification(`分类已更新为 "${newName}"`);
}

function deleteCategory(categoryId) {
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category || category.isDefault) return;
  if (!confirm(`确定要删除分类 "${category.name}" 吗？此操作不可撤销。`)) return;
  delete appState.selectedPrompts[categoryId];
  appState.categories = appState.categories.filter(cat => cat.id !== categoryId);
  if (appState.selectedCategoryId === categoryId) appState.selectedCategoryId = null;
  renderCategoryList(); renderRandomCategorySelector(); renderPromptList(); renderSelectedPrompts(); renderPreview(); saveData();
  showNotification(`分类 "${category.name}" 已删除`);
}

function openPromptModal(categoryId) {
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category) return;
  elements.promptModalTitle.textContent = `${category.name} - 提示词管理`;
  renderCategoryPromptsList(categoryId);
  elements.promptModal.style.display = 'block';
  elements.promptModal.dataset.categoryId = categoryId;
}

function renderCategoryPromptsList(categoryId) {
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category) return;
  elements.categoryPromptsList.innerHTML = '';
  if (category.prompts.length === 0) {
    elements.categoryPromptsList.innerHTML = '<li class="empty-list">暂无提示词</li>';
    return;
  }
  const frag = document.createDocumentFragment();
  category.prompts.forEach((prompt, index) => {
    const item = document.createElement('li');
    item.className = 'category-prompt-item';
    const textContainer = document.createElement('div');
    textContainer.className = 'prompt-text-container';
    const text = document.createElement('span');
    text.className = 'prompt-text'; text.textContent = pt(prompt);
    textContainer.appendChild(text);
    if (appState.settings.translationEnabled) textContainer.appendChild(createTranslationUI(categoryId, prompt));

    const actions = document.createElement('div');
    actions.className = 'prompt-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'category-action-btn'; editBtn.innerHTML = '<i class="fa fa-pencil"></i>'; editBtn.title = '编辑提示词';
    editBtn.addEventListener('click', () => editPrompt(categoryId, index));
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'category-action-btn'; deleteBtn.innerHTML = '<i class="fa fa-trash"></i>'; deleteBtn.title = '删除提示词';
    deleteBtn.addEventListener('click', () => deletePrompt(categoryId, index));
    actions.appendChild(editBtn); actions.appendChild(deleteBtn);
    item.appendChild(textContainer); item.appendChild(actions);
    frag.appendChild(item);
  });
  elements.categoryPromptsList.appendChild(frag);
}

async function addPrompt(categoryId, promptText) {
  if (appState._addingPrompt) return;
  if (!promptText.trim()) { showNotification('提示词不能为空', 'error'); return; }
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category) return;
  const trimmed = promptText.trim();
  if (category.prompts.some(p => pt(p).toLowerCase() === trimmed.toLowerCase())) { showNotification('提示词已存在', 'error'); return; }

  appState._addingPrompt = true;
  elements.newPromptText.value = '';
  elements.savePromptBtn.disabled = true;

  let translation = '';
  const dc = defaultCategories.find(d => d.id === categoryId);
  if (dc) { const dp = dc.prompts.find(d => d.text === trimmed); if (dp && dp.translation) translation = dp.translation; }
  if (!translation && appState.settings.autoTranslateNewWords) {
    try { translation = await translateText(trimmed); } catch (e) { /* ignore */ }
  }

  category.prompts.push({ text: trimmed, translation });
  renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) renderPromptList(categoryId);
  saveData(); showNotification('提示词已添加');
  appState._addingPrompt = false; elements.savePromptBtn.disabled = false;
}

async function batchImportPrompts(categoryId, text) {
  if (!text.trim()) { showNotification('导入内容不能为空', 'error'); return; }
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category) return;
  const prompts = text.trim().split('\n').map(p => p.trim()).filter(p => p);
  if (prompts.length === 0) { showNotification('未找到有效的提示词', 'error'); return; }

  const existing = new Set(category.prompts.map(p => pt(p)));
  let addedCount = 0;
  showNotification('开始批量导入和翻译，请稍候...', 'warning');

  for (const promptText of prompts) {
    if (!existing.has(promptText)) {
      let translation = '';
      if (appState.settings.autoTranslateNewWords) {
        try { translation = await translateText(promptText); } catch (e) { /* ignore */ }
      }
      category.prompts.push({ text: promptText, translation });
      existing.add(promptText);
      addedCount++;
    }
  }

  if (addedCount === 0) { showNotification('没有新的提示词被添加', 'warning'); return; }
  renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) renderPromptList(categoryId);
  saveData(); elements.batchImport.value = '';
  showNotification(`成功导入并翻译 ${addedCount} 个提示词`);
}

async function editPrompt(categoryId, index) {
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category || index < 0 || index >= category.prompts.length) return;
  const current = category.prompts[index];
  const currentText = pt(current);
  const newPrompt = prompt('请编辑提示词:', currentText);
  if (newPrompt === null) return;
  if (!newPrompt.trim()) { showNotification('提示词不能为空', 'error'); return; }
  const trimmed = newPrompt.trim();
  if (category.prompts.some((p, i) => i !== index && pt(p) === trimmed)) { showNotification('提示词已存在', 'error'); return; }

  let translation = ptrans(current);
  if (trimmed !== currentText) {
    try { const t = await translateText(trimmed); if (t) translation = t; } catch (e) { /* ignore */ }
  }
  category.prompts[index] = { text: trimmed, translation };
  renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) renderPromptList(categoryId);

  if (appState.selectedPrompts[categoryId]) {
    const idx = findPromptIndex(appState.selectedPrompts[categoryId], currentText);
    if (idx !== -1) {
      appState.selectedPrompts[categoryId][idx] = { text: trimmed, translation };
      renderSelectedPrompts(); renderPreview();
    }
  }
  saveData(); showNotification('提示词已更新');
}

function deletePrompt(categoryId, index) {
  const category = appState.categories.find(cat => cat.id === categoryId);
  if (!category || index < 0 || index >= category.prompts.length) return;
  const promptText = pt(category.prompts[index]);
  if (!confirm(`确定要删除提示词 "${promptText}" 吗？`)) return;
  category.prompts.splice(index, 1);
  renderCategoryPromptsList(categoryId);
  if (appState.selectedCategoryId === categoryId) renderPromptList(categoryId);
  if (appState.selectedPrompts[categoryId]) {
    const idx = findPromptIndex(appState.selectedPrompts[categoryId], promptText);
    if (idx !== -1) {
      appState.selectedPrompts[categoryId].splice(idx, 1);
      renderSelectedPrompts(); renderPreview();
    }
  }
  saveData();
}

function openExportModal() {
  if (getSelectedPromptsCount() === 0) { showNotification('请先选择提示词', 'warning'); return; }
  updateExportPreview();
  elements.exportModal.style.display = 'block';
}

function updateExportPreview() {
  const format = document.querySelector('input[name="export-format"]:checked').value;
  let preview = '';
  switch (format) {
    case 'text': preview = getAllSelectedPrompts().join(getDelimiter()); break;
    case 'json': preview = JSON.stringify(getSelectedPromptsAsObject(), null, 2); break;
    case 'markdown': preview = generateMarkdownOutput(); break;
  }
  elements.exportPreview.value = preview;
}

function getDelimiter() {
  const sel = document.getElementById('delimiter').value;
  if (sel === 'custom') return document.getElementById('custom-delimiter').value || ', ';
  if (sel === ',') return ', ';
  return sel === '&#10;' ? '\n' : sel;
}

function getAllSelectedPrompts() {
  const prompts = [];
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    appState.selectedPrompts[categoryId].forEach(p => prompts.push(pt(p)));
  });
  return prompts;
}

function getSelectedPromptsAsObject() {
  const result = {};
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (category) result[category.name] = appState.selectedPrompts[categoryId];
  });
  return result;
}

function generateMarkdownOutput() {
  let md = '# AI文生图提示词\n\n';
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    md += `## ${category.name}\n\n`;
    appState.selectedPrompts[categoryId].forEach(p => { md += `- ${pt(p)}\n`; });
    md += '\n';
  });
  md += '## 组合提示词\n\n';
  md += `"${getAllSelectedPrompts().join(', ')}"`;
  return md;
}

function copyToClipboard() {
  const text = elements.exportPreview.value;
  if (!text) { showNotification('没有可复制的内容', 'warning'); return; }
  navigator.clipboard.writeText(text)
    .then(() => showNotification('已复制到剪贴板'))
    .catch(() => showNotification('复制失败，请手动复制', 'error'));
}

function downloadFile() {
  const text = elements.exportPreview.value;
  if (!text) { showNotification('没有可下载的内容', 'warning'); return; }
  const format = document.querySelector('input[name="export-format"]:checked').value;
  let filename = 'ai-prompt-combination', mimeType = 'text/plain';
  if (format === 'json') { filename += '.json'; mimeType = 'application/json'; }
  else if (format === 'markdown') { filename += '.md'; mimeType = 'text/markdown'; }
  else filename += '.txt';

  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showNotification(`文件 "${filename}" 已下载`);
}

function openSettingsModal() {
  elements.translationEnabled.checked = appState.settings.translationEnabled;
  elements.onlineTranslation.checked = appState.settings.useOnlineTranslation;
  elements.autoTranslateNew.checked = appState.settings.autoTranslateNewWords;
  elements.showTranslationPreview.checked = appState.settings.showTranslationInPreview;
  elements.translationAPI.value = appState.settings.translationAPI;
  if (elements.panelOpacitySlider) elements.panelOpacitySlider.value = appState.settings.panelOpacity;
  if (elements.panelOpacityValue) elements.panelOpacityValue.textContent = appState.settings.panelOpacity + '%';
  if (elements.panelStyleFrosted && elements.panelStyleTransparent) {
    (appState.settings.panelStyle === 'transparent' ? elements.panelStyleTransparent : elements.panelStyleFrosted).checked = true;
  }
  updateBgPreview();
  elements.settingsModal.style.display = 'block';
}

function saveSettings() {
  appState.settings.translationEnabled = elements.translationEnabled.checked;
  appState.settings.useOnlineTranslation = elements.onlineTranslation.checked;
  appState.settings.autoTranslateNewWords = elements.autoTranslateNew.checked;
  appState.settings.showTranslationInPreview = elements.showTranslationPreview.checked;
  appState.settings.translationAPI = elements.translationAPI.value.trim();
  if (elements.panelOpacitySlider) appState.settings.panelOpacity = parseInt(elements.panelOpacitySlider.value);
  if (elements.panelStyleFrosted && elements.panelStyleFrosted.checked) appState.settings.panelStyle = 'frosted';
  else if (elements.panelStyleTransparent && elements.panelStyleTransparent.checked) appState.settings.panelStyle = 'transparent';
  localStorage.setItem('aiPromptToolSettings', JSON.stringify(appState.settings));
  applyBackgroundSettings();
  elements.settingsModal.style.display = 'none';
  showNotification('设置已保存', 'success');
  if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
  renderSelectedPrompts();
}

function cleanDuplicatePrompts() {
  let totalRemoved = 0;
  appState.categories.forEach(category => {
    const unique = new Map();
    category.prompts.forEach(p => {
      const text = pt(p).toLowerCase();
      if (!unique.has(text)) unique.set(text, p);
    });
    const removed = category.prompts.length - unique.size;
    totalRemoved += removed;
    if (removed > 0) category.prompts = Array.from(unique.values());
  });
  if (totalRemoved > 0) {
    saveData();
    if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
    showNotification(`已清理 ${totalRemoved} 个重复提示词`, 'success');
  } else {
    showNotification('没有发现重复的提示词', 'info');
  }
}

function exportAllData() {
  const data = { categories: appState.categories, settings: appState.settings, translations: appState.translations, exportDate: new Date().toISOString() };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `ai-prompt-tool-data-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showNotification('数据导出成功', 'success');
}

function exportCsv() {
  let csv = '\uFEFF分类,提示词,翻译\n';
  appState.categories.forEach(cat => {
    cat.prompts.forEach(p => {
      const text = pt(p), trans = ptrans(p);
      csv += `"${cat.name.replace(/"/g, '""')}","${text.replace(/"/g, '""')}","${trans.replace(/"/g, '""')}"\n`;
    });
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = `ai-prompt-tool-data-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link); link.click(); document.body.removeChild(link);
  URL.revokeObjectURL(url);
  showNotification('CSV导出成功', 'success');
}

function handleCsvImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const lines = e.target.result.split(/\r?\n/).filter(l => l.trim());
      if (lines.length < 2) { showNotification('CSV文件为空或格式不正确', 'error'); return; }
      const header = lines[0].toLowerCase();
      if (!header.includes('分类') && !header.includes('category') && !header.includes('提示词') && !header.includes('prompt')) {
        showNotification('CSV格式不正确，第一行应为：分类,提示词,翻译', 'error'); return;
      }
      let imported = 0, skipped = 0;
      for (let i = 1; i < lines.length; i++) {
        const fields = parseCsvLine(lines[i]);
        if (fields.length < 2) continue;
        const catName = fields[0].trim(), promptText = fields[1].trim(), transText = fields.length >= 3 ? fields[2].trim() : '';
        if (!catName || !promptText) continue;
        let category = appState.categories.find(c => c.name === catName);
        if (!category) {
          category = { id: 'custom_' + appState.nextCategoryId++, name: catName, isDefault: false, prompts: [] };
          appState.categories.push(category);
        }
        const existing = category.prompts.find(p => pt(p) === promptText);
        if (existing) {
          if (typeof existing === 'object' && existing !== null && transText && existing.translation !== transText) {
            existing.translation = transText; imported++;
          } else { skipped++; }
        } else {
          category.prompts.push({ text: promptText, translation: transText }); imported++;
        }
      }
      saveData(); renderCategoryList(); renderRandomCategorySelector();
      if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
      let msg = `CSV导入成功：导入 ${imported} 个提示词`;
      if (skipped > 0) msg += `，跳过 ${skipped} 个已存在的提示词`;
      showNotification(msg, 'success');
    } catch (error) {
      showNotification(`CSV导入失败: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file, 'UTF-8');
  event.target.value = '';
}

function parseCsvLine(line) {
  const fields = []; let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') { if (i + 1 < line.length && line[i + 1] === '"') { current += '"'; i++; } else inQuotes = false; }
      else current += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { fields.push(current); current = ''; }
      else current += ch;
    }
  }
  fields.push(current); return fields;
}

function handleFileImport(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.categories || !Array.isArray(data.categories)) throw new Error('无效的数据格式：缺少分类数据');
      if (confirm('是否替换当前所有数据？取消将合并导入的数据。')) {
        appState.categories = data.categories;
        if (data.settings) appState.settings = { ...appState.settings, ...data.settings };
        if (data.translations) appState.translations = { ...appState.translations, ...data.translations };
      } else {
        data.categories.forEach(importCat => {
          const existing = appState.categories.find(c => c.id === importCat.id);
          if (existing) {
            const existingTexts = new Set(existing.prompts.map(p => pt(p).toLowerCase()));
            const newPrompts = importCat.prompts.filter(p => !existingTexts.has(pt(p).toLowerCase()));
            existing.prompts.push(...newPrompts);
          } else { appState.categories.push(importCat); }
        });
        if (data.settings) appState.settings = { ...appState.settings, ...data.settings };
        if (data.translations) appState.translations = { ...appState.translations, ...data.translations };
      }
      saveData(); saveSettingsToStorage(); saveTranslations();
      renderCategoryList(); renderRandomCategorySelector();
      if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
      showNotification('数据导入成功', 'success');
    } catch (error) {
      showNotification(`导入失败: ${error.message}`, 'error');
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

async function translateAllPrompts() {
  if (!appState.settings.translationEnabled) { showNotification('请先在设置中启用翻译功能', 'warning'); return; }
  let total = 0, failed = 0, skipped = 0;
  showNotification('正在翻译所有提示词...', 'info');
  for (const category of appState.categories) {
    const dc = defaultCategories.find(d => d.id === category.id);
    for (const prompt of category.prompts) {
      if (typeof prompt !== 'object' || prompt === null) continue;
      if (prompt.translation) { skipped++; continue; }
      let translation = '';
      if (dc) { const dp = dc.prompts.find(d => d.text === prompt.text); if (dp && dp.translation) translation = dp.translation; }
      if (!translation) {
        try { translation = await translateText(prompt.text); await new Promise(r => setTimeout(r, 100)); }
        catch (e) { failed++; }
      }
      if (translation) { prompt.translation = translation; total++; }
    }
  }
  if (total > 0) {
    syncSelectedPromptsTranslations(); saveData(); saveTranslations();
    renderCategoryList();
    if (appState.selectedCategoryId) renderPromptList(appState.selectedCategoryId);
    renderSelectedPrompts(); renderPreview();
    let msg = `成功翻译 ${total} 个提示词`;
    if (failed > 0) msg += `，${failed} 个翻译失败`;
    showNotification(msg, 'success');
  } else if (failed === 0) { showNotification('所有提示词都已有翻译', 'info'); }
  else { showNotification(`翻译失败 ${failed} 个提示词`, 'error'); }
}

function syncSelectedPromptsTranslations() {
  Object.keys(appState.selectedPrompts).forEach(categoryId => {
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (!category) return;
    appState.selectedPrompts[categoryId].forEach((sp, index) => {
      const text = pt(sp);
      const cp = findPromptInCategory(category, text);
      if (cp && typeof cp === 'object' && cp.translation) {
        if (typeof sp === 'object' && sp !== null) sp.translation = cp.translation;
        else appState.selectedPrompts[categoryId][index] = { text, translation: cp.translation };
      }
    });
  });
}

function showNotification(message, type = 'success') {
  const existing = document.querySelectorAll('.notification');
  if (existing.length >= 3) existing[0].remove();
  const icons = { success: '\u2713', error: '\u2717', warning: '\u26A0', info: '\u2139' };
  const notification = document.createElement('div');
  notification.className = `notification notification-${type}`;
  notification.innerHTML = `<div class="notification-content"><span class="notification-icon">${icons[type] || icons.info}</span><span class="notification-text">${message}</span></div><div class="notification-progress"></div>`;
  Object.assign(notification.style, { position: 'fixed', top: '16px', right: '16px', zIndex: '10000' });
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.classList.add('hiding');
    setTimeout(() => { if (notification.parentNode) document.body.removeChild(notification); }, 300);
  }, 3000);
}

function closeModal(modalId) {
  document.getElementById(modalId).style.display = 'none';
}

function bindEvents() {
  elements.addCategoryBtn.addEventListener('click', () => {
    elements.categoryModal.style.display = 'block'; renderCustomCategoryList();
  });
  elements.saveCategoryBtn.addEventListener('click', () => addCategory(elements.newCategoryName.value));
  elements.newCategoryName.addEventListener('keypress', e => { if (e.key === 'Enter') addCategory(elements.newCategoryName.value); });

  elements.editPromptsBtn.addEventListener('click', () => {
    if (appState.selectedCategoryId) openPromptModal(appState.selectedCategoryId);
    else showNotification('请先选择一个分类', 'warning');
  });

  elements.savePromptBtn.addEventListener('click', async e => {
    e.preventDefault(); e.stopPropagation();
    const categoryId = elements.promptModal.dataset.categoryId;
    const text = elements.newPromptText.value;
    if (!categoryId) { showNotification('请先选择一个分类', 'warning'); return; }
    if (!text.trim()) { showNotification('提示词不能为空', 'error'); return; }
    await addPrompt(categoryId, text);
  });

  elements.newPromptText.addEventListener('keypress', async e => {
    if (e.key === 'Enter') {
      const categoryId = elements.promptModal.dataset.categoryId;
      if (categoryId) await addPrompt(categoryId, elements.newPromptText.value);
    }
  });

  elements.batchImportBtn.addEventListener('click', async () => {
    const categoryId = elements.promptModal.dataset.categoryId;
    if (categoryId) await batchImportPrompts(categoryId, elements.batchImport.value);
  });

  elements.selectAllBtn.addEventListener('click', selectAllPrompts);
  elements.deselectAllBtn.addEventListener('click', deselectAllPrompts);
  elements.clearSelectedBtn.addEventListener('click', clearAllSelectedPrompts);
  elements.randomGenerateBtn.addEventListener('click', generateRandomPrompts);
  elements.exportBtn.addEventListener('click', openExportModal);

  document.querySelectorAll('input[name="export-format"]').forEach(radio => {
    radio.addEventListener('change', () => {
      document.getElementById('delimiter-option').style.display = radio.value === 'text' ? 'block' : 'none';
      updateExportPreview();
    });
  });

  document.getElementById('delimiter').addEventListener('change', e => {
    document.getElementById('custom-delimiter').style.display = e.target.value === 'custom' ? 'inline-block' : 'none';
    updateExportPreview();
  });
  document.getElementById('custom-delimiter').addEventListener('input', updateExportPreview);
  elements.copyToClipboardBtn.addEventListener('click', copyToClipboard);
  elements.downloadFileBtn.addEventListener('click', downloadFile);

  document.querySelectorAll('.modal .close').forEach(btn => {
    btn.addEventListener('click', function() { this.closest('.modal').style.display = 'none'; });
  });
  window.addEventListener('click', e => { if (e.target.classList.contains('modal')) e.target.style.display = 'none'; });

  elements.mobileToggle.addEventListener('click', () => {
    elements.categoryPanel.classList.toggle('active');
    let overlay = document.querySelector('.overlay');
    if (!overlay) {
      overlay = document.createElement('div'); overlay.className = 'overlay';
      overlay.addEventListener('click', () => { elements.categoryPanel.classList.remove('active'); overlay.classList.remove('active'); });
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

  elements.settingsBtn.addEventListener('click', openSettingsModal);
  elements.translateAllBtn.addEventListener('click', translateAllPrompts);

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

function bindSettingsEvents() {
  elements.saveSettingsBtn.addEventListener('click', saveSettings);
  elements.cancelSettingsBtn.addEventListener('click', () => { elements.settingsModal.style.display = 'none'; });
  elements.cleanDuplicatesBtn.addEventListener('click', cleanDuplicatePrompts);
  elements.exportAllDataBtn.addEventListener('click', exportAllData);
  elements.importDataBtn.addEventListener('click', () => elements.importFileInput.click());
  elements.importFileInput.addEventListener('change', handleFileImport);
  elements.exportCsvBtn.addEventListener('click', exportCsv);
  elements.importCsvBtn.addEventListener('click', () => elements.importCsvFileInput.click());
  elements.importCsvFileInput.addEventListener('change', handleCsvImport);

  if (elements.bgUploadBtn) elements.bgUploadBtn.addEventListener('click', () => elements.bgFileInput.click());
  if (elements.bgFileInput) elements.bgFileInput.addEventListener('change', handleBgImageUpload);
  if (elements.bgClearBtn) elements.bgClearBtn.addEventListener('click', clearBgImage);

  if (elements.panelOpacitySlider) {
    elements.panelOpacitySlider.addEventListener('input', e => {
      const val = e.target.value;
      if (elements.panelOpacityValue) elements.panelOpacityValue.textContent = val + '%';
      appState.settings.panelOpacity = parseInt(val);
      applyBackgroundSettings();
    });
  }
  if (elements.panelStyleFrosted) {
    elements.panelStyleFrosted.addEventListener('change', () => { appState.settings.panelStyle = 'frosted'; applyBackgroundSettings(); });
  }
  if (elements.panelStyleTransparent) {
    elements.panelStyleTransparent.addEventListener('change', () => { appState.settings.panelStyle = 'transparent'; applyBackgroundSettings(); });
  }
}

function generateRandomPrompts() {
  const selectedIds = [];
  document.querySelectorAll('#random-category-selector input[type="checkbox"]:checked').forEach(cb => selectedIds.push(cb.value));
  if (selectedIds.length === 0) { showRandomResult('请至少选择一个类别', 'error'); return; }

  const generated = {}, allPrompts = [];
  selectedIds.forEach(categoryId => {
    const category = appState.categories.find(cat => cat.id === categoryId);
    if (category && category.prompts.length > 0) {
      const rp = category.prompts[Math.floor(Math.random() * category.prompts.length)];
      const obj = typeof rp === 'object' && rp !== null ? { ...rp } : { text: String(rp), translation: '' };
      if (!generated[categoryId]) generated[categoryId] = [];
      generated[categoryId].push(obj); allPrompts.push(obj);
    }
  });

  if (allPrompts.length === 0) { showRandomResult('所选类别中没有可用的提示词', 'error'); return; }

  Object.keys(generated).forEach(categoryId => {
    if (!appState.selectedPrompts[categoryId]) {
      appState.selectedPrompts[categoryId] = generated[categoryId];
    } else {
      const existingTexts = new Set(appState.selectedPrompts[categoryId].map(p => pt(p)));
      generated[categoryId].forEach(p => { if (!existingTexts.has(pt(p))) appState.selectedPrompts[categoryId].push(p); });
    }
  });

  renderSelectedPrompts(); renderPreview(); saveData();
  showRandomResult(`成功生成 ${allPrompts.length} 个提示词`, 'success', allPrompts.map(p => pt(p)).join(', '));
}

function showRandomResult(message, type, promptText = '') {
  const result = document.getElementById('random-result');
  if (!result) return;
  let content = `<p class="${type}">${message}</p>`;
  if (promptText) content += `<div class="generated-prompt">"${promptText}"</div>`;
  result.innerHTML = content;
}

function renderCustomCategoryList() {
  elements.customCategoryList.innerHTML = '';
  const custom = appState.categories.filter(cat => !cat.isDefault);
  if (custom.length === 0) { elements.customCategoryList.innerHTML = '<li class="empty-list">暂无自定义分类</li>'; return; }
  const frag = document.createDocumentFragment();
  custom.forEach(category => {
    const item = document.createElement('li'); item.className = 'custom-category-item';
    const text = document.createElement('span'); text.textContent = category.name;
    const actions = document.createElement('div'); actions.className = 'category-actions';
    const editBtn = document.createElement('button');
    editBtn.className = 'category-action-btn'; editBtn.innerHTML = '<i class="fa fa-pencil"></i>'; editBtn.title = '编辑分类';
    editBtn.addEventListener('click', () => { editCategory(category.id); renderCustomCategoryList(); });
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'category-action-btn'; deleteBtn.innerHTML = '<i class="fa fa-trash"></i>'; deleteBtn.title = '删除分类';
    deleteBtn.addEventListener('click', () => { deleteCategory(category.id); renderCustomCategoryList(); });
    actions.appendChild(editBtn); actions.appendChild(deleteBtn);
    item.appendChild(text); item.appendChild(actions);
    frag.appendChild(item);
  });
  elements.customCategoryList.appendChild(frag);
}

function applyBackgroundSettings() {
  const { backgroundImage: bgImage, panelOpacity: opacity, panelStyle: style } = appState.settings;
  const alpha = opacity / 100;
  const isFrosted = (style || 'frosted') === 'frosted';

  const overlay = elements.bgImageOverlay;
  if (overlay) {
    if (bgImage) { overlay.style.backgroundImage = `url(${bgImage})`; document.body.classList.add('has-bg-image'); }
    else { overlay.style.backgroundImage = ''; document.body.classList.remove('has-bg-image'); }
  }

  document.body.classList.remove('panel-style-frosted', 'panel-style-transparent');
  document.body.classList.add('panel-style-' + (style || 'frosted'));

  const root = document.documentElement.style;
  root.setProperty('--panel-alpha', alpha);
  root.setProperty('--panel-blur', isFrosted ? '16px' : '0px');
  root.setProperty('--panel-saturate', isFrosted ? '1.4' : '1');
  root.setProperty('--panel-bg', `rgba(255, 255, 255, ${Math.max(0.05, alpha)})`);
  root.setProperty('--navbar-bg', `rgba(255, 255, 255, ${Math.max(0.05, 0.85 * alpha)})`);
  root.setProperty('--light-bg', `rgba(248, 250, 252, ${Math.max(0.05, alpha)})`);
  root.setProperty('--item-bg', `rgba(255, 255, 255, ${Math.max(0.05, alpha * 0.9)})`);
  root.setProperty('--border-alpha', Math.max(0.15, alpha * 0.6));
  root.setProperty('--dark-bg', `rgba(15, 23, 42, ${Math.max(0.7, alpha)})`);

  const backdrop = isFrosted ? `blur(var(--panel-blur)) saturate(var(--panel-saturate))` : 'none';
  root.setProperty('--panel-backdrop', backdrop);
}

function handleBgImageUpload(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.match(/^image\/(jpeg|png|bmp|webp|gif)$/)) { showNotification('请选择有效的图片文件（JPG、PNG、BMP、WebP、GIF）', 'error'); return; }
  if (file.size > 5 * 1024 * 1024) { showNotification('图片文件不能超过5MB', 'error'); return; }
  const reader = new FileReader();
  reader.onload = e => {
    appState.settings.backgroundImage = e.target.result;
    localStorage.setItem('aiPromptToolSettings', JSON.stringify(appState.settings));
    applyBackgroundSettings(); updateBgPreview();
    showNotification('背景图片已设置', 'success');
  };
  reader.readAsDataURL(file);
  event.target.value = '';
}

function clearBgImage() {
  appState.settings.backgroundImage = '';
  localStorage.setItem('aiPromptToolSettings', JSON.stringify(appState.settings));
  applyBackgroundSettings(); updateBgPreview();
  showNotification('背景图片已清除', 'success');
}

function updateBgPreview() {
  const container = elements.bgPreviewContainer;
  if (!container) return;
  container.innerHTML = appState.settings.backgroundImage
    ? `<img src="${appState.settings.backgroundImage}" alt="背景预览">`
    : '<span class="bg-preview-placeholder">未设置背景图片</span>';
}

function initPreviewPanelResize() {
  const panelHandle = document.getElementById('preview-resize-handle');
  const panel = document.querySelector('.preview-panel');
  const promptsHandle = document.getElementById('selected-prompts-resize-handle');
  const promptsBox = document.getElementById('selected-prompts');

  if (panelHandle && panel) {
    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    panelHandle.addEventListener('mousedown', e => {
      isResizing = true;
      startX = e.clientX;
      startWidth = panel.offsetWidth;
      panelHandle.classList.add('active');
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', e => {
      if (!isResizing) return;
      const diff = e.clientX - startX;
      const newWidth = Math.min(Math.max(startWidth + diff, 240), 500);
      panel.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      panelHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }

  if (promptsHandle && promptsBox) {
    let isResizing = false;
    let startY = 0;
    let startHeight = 0;

    promptsHandle.addEventListener('mousedown', e => {
      isResizing = true;
      startY = e.clientY;
      startHeight = promptsBox.offsetHeight;
      promptsHandle.classList.add('active');
      document.body.style.cursor = 'ns-resize';
      document.body.style.userSelect = 'none';
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', e => {
      if (!isResizing) return;
      const diff = e.clientY - startY;
      const newHeight = Math.min(Math.max(startHeight + diff, 60), 500);
      promptsBox.style.height = newHeight + 'px';
    });

    document.addEventListener('mouseup', () => {
      if (!isResizing) return;
      isResizing = false;
      promptsHandle.classList.remove('active');
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    });
  }
}

document.addEventListener('DOMContentLoaded', initApp);
