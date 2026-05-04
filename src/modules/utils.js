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

export function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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
