export const DEFAULT_CATEGORIES = [
  {
    id: 'perspective', name: '视角', isDefault: true,
    prompts: [
      {text: 'from above', translation: '从上方'}, {text: 'three-quarter view', translation: '四分之三视图'},
      {text: 'front view', translation: '正面视图'}, {text: 'side view', translation: '侧面视图'},
      {text: 'back view', translation: '背面视图'}, {text: 'overhead view', translation: '俯视视图'},
      {text: "bird's eye view", translation: '鸟瞰图'}, {text: "worm's eye view", translation: '虫眼视图'}
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
]

export const FALLBACK_TRANSLATIONS = {
  'man': '男人', 'woman': '女人', 'boy': '男孩', 'girl': '女孩', 'child': '儿童',
  'portrait': '肖像', 'landscape': '风景', 'close-up': '特写', 'wide shot': '广角镜头',
  'full body': '全身', 'upper body': '上半身', 'front view': '正面视图', 'back view': '背面视图',
  'side view': '侧面视图', 'digital art': '数字艺术', 'oil painting': '油画', 'watercolor': '水彩画',
  'anime': '动漫', 'cartoon': '卡通', 'realistic': '写实', 'abstract': '抽象',
  'fantasy': '奇幻', 'sci-fi': '科幻', 'futuristic': '未来主义', 'vintage': '复古',
  'modern': '现代', 'minimalist': '极简主义', 'detailed': '详细的', 'colorful': '色彩丰富的',
  'monochrome': '单色的', 'bright': '明亮的', 'dark': '黑暗的', 'mysterious': '神秘的',
  'peaceful': '宁静的', 'dynamic': '动态的', 'morning': '早晨', 'night': '夜晚',
  'sunset': '日落', 'sunrise': '日出', 'indoor': '室内', 'outdoor': '室外',
  'forest': '森林', 'mountain': '山脉', 'ocean': '海洋', 'city': '城市', 'village': '村庄',
  'space': '太空', '3d': '三维', '2d': '二维', 'pixel art': '像素艺术',
  'sketch': '素描', 'concept art': '概念艺术', 'lighting': '光照', 'shadows': '阴影',
  'texture': '纹理', 'background': '背景', 'focus': '焦点', 'blur': '模糊',
  'depth of field': '景深', 'high resolution': '高分辨率', '4k': '4K', '8k': '8K',
  'masterpiece': '杰作', 'best quality': '最佳质量', 'professional': '专业的',
  'style': '风格', 'mood': '情绪', 'atmosphere': '氛围', 'composition': '构图',
  'perspective': '透视', 'symmetry': '对称', 'contrast': '对比', 'harmony': '和谐',
  'warm': '温暖的', 'cool': '凉爽的', 'grayscale': '灰度', 'vibrant': '鲜艳的',
  'muted': '柔和的', 'neon': '霓虹', 'natural': '自然的', 'geometric': '几何的',
  'smooth': '平滑的', 'rough': '粗糙的', 'soft': '柔软的', 'hard': '坚硬的',
  'transparent': '透明的', 'reflective': '反光的', 'metallic': '金属的', 'glass': '玻璃的',
  'water': '水', 'fire': '火', 'ice': '冰', 'snow': '雪', 'rain': '雨', 'cloud': '云',
  'fog': '雾', 'glow': '发光的', 'calm': '平静的', 'serene': '安详的',
  'epic': '史诗', 'grand': '宏伟', 'vast': '广阔', 'tiny': '微小', 'massive': '巨大',
  'delicate': '精致', 'wet': '湿润', 'dry': '干燥', 'hot': '炎热', 'cold': '寒冷',
  'ruins': '废墟', 'castle': '城堡', 'temple': '神殿', 'palace': '宫殿', 'tower': '塔',
  'bridge': '桥', 'garden': '花园', 'waterfall': '瀑布', 'lake': '湖泊', 'river': '河流',
  'desert': '沙漠', 'island': '岛屿', 'beach': '海滩', 'cave': '洞穴', 'cliff': '悬崖',
  'valley': '山谷', 'meadow': '草地', 'road': '道路', 'street': '街道',
  'standing': '站立', 'sitting': '坐着', 'walking': '行走', 'running': '奔跑',
  'jumping': '跳跃', 'flying': '飞行', 'swimming': '游泳', 'dancing': '跳舞',
  'fighting': '战斗', 'sleeping': '睡觉', 'painting': '绘画', 'playing': '玩耍',
  'singing': '唱歌', 'laughing': '大笑', 'crying': '哭泣', 'smiling': '微笑',
  'thinking': '思考', 'eating': '进食', 'king': '国王', 'queen': '女王',
  'prince': '王子', 'princess': '公主', 'knight': '骑士', 'warrior': '战士',
  'samurai': '武士', 'ninja': '忍者', 'wizard': '巫师', 'witch': '女巫',
  'pirate': '海盗', 'soldier': '士兵', 'hunter': '猎人', 'robot': '机器人',
  'dragon': '龙', 'unicorn': '独角兽', 'angel': '天使', 'demon': '恶魔',
  'fairy': '仙女', 'elf': '精灵', 'dwarf': '矮人', 'vampire': '吸血鬼',
  'zombie': '丧尸', 'armor': '盔甲', 'sword': '剑', 'shield': '盾牌',
  'crown': '王冠', 'cloak': '斗篷', 'mask': '面具', 'wings': '翅膀',
  'tattoo': '纹身', 'scar': '疤痕', 'beard': '胡须', 'ponytail': '马尾辫',
  'curly hair': '卷发', 'straight hair': '直发', 'short hair': '短发', 'long hair': '长发',
  'blonde': '金发', 'redhead': '红发', 'black hair': '黑发', 'white hair': '白发',
  'blue eyes': '蓝眼睛', 'green eyes': '绿眼睛', 'brown eyes': '棕眼睛',
  'male': '男性', 'female': '女性'
}

export const TRANSLATION_CACHE_LIMIT = 500;
export const SEARCH_RESULT_LIMIT = 30;
export const API_TIMEOUT = 10000;
export const NOTIFICATION_DURATION = 3000;
export const NOTIFICATION_MAX_COUNT = 3;
export const BG_IMAGE_MAX_SIZE = 10 * 1024 * 1024;
export const BATCH_TRANSLATE_INTERVAL = 100;
export const SAVE_DATA_DEBOUNCE = 300;
export const DATA_VERSION = 2;
