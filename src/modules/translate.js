import { appState, saveTranslations } from './state.js';
import { FALLBACK_TRANSLATIONS, API_TIMEOUT, BATCH_TRANSLATE_INTERVAL, DEFAULT_CATEGORIES } from './constants.js';

let _syncSelectedPromptsTranslations = () => {};
let _saveData = () => {};
let _showNotification = () => {};
let _translateAllProgressCallback = null;

export function setTranslateAllProgressCallback(cb) {
  _translateAllProgressCallback = cb;
}

export function getFallbackTranslation(text) {
  const lower = text.toLowerCase();
  if (FALLBACK_TRANSLATIONS[lower] !== undefined) {
    return FALLBACK_TRANSLATIONS[lower];
  }
  for (const key of Object.keys(FALLBACK_TRANSLATIONS)) {
    if (key.toLowerCase() === lower) {
      return FALLBACK_TRANSLATIONS[key];
    }
  }
  return null;
}

export async function translateViaMyMemory(text, targetLanguage = 'zh') {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|${targetLanguage}`;
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`MyMemory API error: ${response.status}`);
    }

    const data = await response.json();
    let translated = data.responseData?.translatedText || '';

    if (translated.toLowerCase() === text.toLowerCase()) {
      if (data.matches && data.matches.length > 1) {
        for (const match of data.matches) {
          if (match.translation && match.translation.toLowerCase() !== text.toLowerCase()) {
            translated = match.translation;
            break;
          }
        }
      }
    }

    return translated || '';
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

export async function translateViaCustomAPI(text, targetLanguage = 'zh') {
  const url = appState.settings.translationAPI;
  if (!url || url === 'https://api.mymemory.translated.net/get') {
    return '';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'auto',
        target: targetLanguage,
        format: 'text'
      })
    });

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data.translatedText || data.translation || data.text || '';
  } catch {
    return '';
  }
}

export async function translateText(text, targetLanguage = 'zh') {
  if (!appState.settings.translationEnabled) {
    return '';
  }

  const key = text.toLowerCase();
  if (appState.translations[key]) {
    appState.translations[key]._accessTime = Date.now();
    return appState.translations[key].text;
  }

  const fallback = getFallbackTranslation(text);
  if (fallback) {
    appState.translations[key] = { text: fallback, _accessTime: Date.now() };
    saveTranslations();
    return fallback;
  }

  if (!appState.settings.useOnlineTranslation) {
    return '';
  }

  let translation = '';
  try {
    translation = await translateViaMyMemory(text, targetLanguage);
  } catch {
    // ignore
  }

  if (!translation) {
    try {
      translation = await translateViaCustomAPI(text, targetLanguage);
    } catch {
      // ignore
    }
  }

  if (translation) {
    appState.translations[key] = { text: translation, _accessTime: Date.now() };
    saveTranslations();
  }

  return translation;
}

export async function translateAllPrompts() {
  if (!appState.settings.translationEnabled) {
    return { total: 0, failed: 0, skipped: 0 };
  }

  const tasks = [];
  let skipped = 0;

  for (const category of appState.categories) {
    const dc = DEFAULT_CATEGORIES.find(d => d.id === category.id);
    for (const prompt of category.prompts) {
      if (typeof prompt !== 'object' || prompt === null) continue;
      if (prompt.translation) { skipped++; continue; }

      let translation = '';
      if (dc) {
        const dp = dc.prompts.find(d => d.text === prompt.text);
        if (dp && dp.translation) translation = dp.translation;
      }

      if (translation) {
        prompt.translation = translation;
        tasks.push({ prompt, status: 'resolved' });
      } else {
        tasks.push({ prompt, status: 'pending' });
      }
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending');
  const batchSize = 5;
  let failed = 0;
  let total = tasks.filter(t => t.status === 'resolved').length;
  const totalTasks = tasks.length;

  if (_translateAllProgressCallback) {
    _translateAllProgressCallback(total, failed, skipped, totalTasks);
  }

  for (let i = 0; i < pendingTasks.length; i += batchSize) {
    const batch = pendingTasks.slice(i, i + batchSize);
    const results = await Promise.allSettled(
      batch.map(t => translateText(t.prompt.text))
    );

    for (let j = 0; j < results.length; j++) {
      if (results[j].status === 'fulfilled' && results[j].value) {
        batch[j].prompt.translation = results[j].value;
        total++;
      } else {
        failed++;
      }
    }

    if (_translateAllProgressCallback) {
      _translateAllProgressCallback(total, failed, skipped, totalTasks);
    }

    if (i + batchSize < pendingTasks.length) {
      await new Promise(r => setTimeout(r, BATCH_TRANSLATE_INTERVAL));
    }
  }

  if (total > 0) {
    _syncSelectedPromptsTranslations();
    _saveData();
    saveTranslations();
  }

  return { total, failed, skipped };
}

export function setTranslateHandlers(handlers) {
  if (handlers.syncSelectedPromptsTranslations) {
    _syncSelectedPromptsTranslations = handlers.syncSelectedPromptsTranslations;
  }
  if (handlers.saveData) {
    _saveData = handlers.saveData;
  }
  if (handlers.showNotification) {
    _showNotification = handlers.showNotification;
  }
}
