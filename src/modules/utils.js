export function getPromptText(prompt) {
  return typeof prompt === 'object' && prompt !== null ? prompt.text : String(prompt);
}

export function getPromptTranslation(prompt) {
  return typeof prompt === 'object' && prompt !== null ? (prompt.translation || '') : '';
}

export function getCategoryById(categories, id) {
  return categories.find(cat => cat.id === id);
}

export function findPromptInCategory(category, text) {
  return category.prompts.find(p => getPromptText(p) === text);
}

export function findPromptIndex(arr, text) {
  return arr.findIndex(p => getPromptText(p) === text);
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function sanitizeFilename(s, maxLen = 80) {
  return String(s).replace(/[\\/:*?"<>|]/g, '_').trim().substring(0, maxLen);
}

export function iterateBatchSelected(batchSelected, callback) {
  batchSelected.forEach(key => {
    const separatorIndex = key.indexOf('::');
    if (separatorIndex === -1) return;
    const categoryId = key.substring(0, separatorIndex);
    const text = key.substring(separatorIndex + 2);
    callback(categoryId, text, key);
  });
}

export function createPromptKey(categoryId, text) {
  return `${categoryId}::${text}`;
}

export function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current);
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
  return result;
}

export function parseCategoryHierarchy(categoryName) {
  return categoryName.split('-').map(s => s.trim()).filter(s => s);
}

export function getCategoryFullPath(categories, categoryOrId) {
  if (!categoryOrId) return '';
  let category = typeof categoryOrId === 'object' ? categoryOrId : getCategoryById(categories, categoryOrId);
  if (!category) return '';
  const path = [category.name];
  let parentId = category.parentId;
  while (parentId) {
    const parent = getCategoryById(categories, parentId);
    if (!parent) break;
    path.unshift(parent.name);
    parentId = parent.parentId;
  }
  return path.join('-');
}

export function getSubcategories(categories, parentId) {
  return categories.filter(cat => cat.parentId === parentId);
}

export function getAllPromptsInHierarchy(categories, categoryId) {
  const category = getCategoryById(categories, categoryId);
  if (!category) return [];
  const prompts = category.prompts.map(p => ({ prompt: p, categoryId }));
  const collectPrompts = (pid) => {
    const subs = getSubcategories(categories, pid);
    subs.forEach(sub => {
      prompts.push(...sub.prompts.map(p => ({ prompt: p, categoryId: sub.id })));
      collectPrompts(sub.id);
    });
  };
  collectPrompts(categoryId);
  return prompts;
}
