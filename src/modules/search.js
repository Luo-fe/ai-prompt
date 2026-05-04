import { appState } from './state.js';
import { getPromptText, getPromptTranslation, debounce } from './utils.js';
import { SEARCH_RESULT_LIMIT } from './constants.js';

let _elements = {};
let _togglePrompt = () => {};
let _isPromptSelected = () => false;
let _recordPromptUsage = () => {};
let _renderPromptList = () => {};
let _renderSelectedPrompts = () => {};
let _renderPreview = () => {};
let _saveData = () => {};
let _getCategoryById = () => null;
let _selectedSearchIndex = -1;
let _searchResultItems = [];

export function initSearch(elements, handlers) {
  _elements = elements;
  _togglePrompt = handlers.togglePrompt;
  _isPromptSelected = handlers.isPromptSelected;
  _recordPromptUsage = handlers.recordPromptUsage;
  _renderPromptList = handlers.renderPromptList;
  _renderSelectedPrompts = handlers.renderSelectedPrompts || _renderSelectedPrompts;
  _renderPreview = handlers.renderPreview || _renderPreview;
  _saveData = handlers.saveData || _saveData;
  _getCategoryById = handlers.getCategoryById;
}

export function initSearchEvents() {
  const searchInput = _elements.searchInput;
  const searchClearBtn = _elements.searchClearBtn;
  const searchResultsDropdown = _elements.searchResultsDropdown;
  const searchContainer = document.getElementById('search-container');

  searchInput.addEventListener('input', debounce(handleSearch, 150));

  searchInput.addEventListener('focus', () => {
    if (searchInput.value.trim()) {
      handleSearch();
    }
  });

  searchClearBtn.addEventListener('click', () => {
    searchInput.value = '';
    searchClearBtn.classList.add('hidden');
    searchResultsDropdown.classList.add('hidden');
    searchInput.focus();
  });

  document.addEventListener('click', (e) => {
    if (searchContainer && !searchContainer.contains(e.target)) {
      searchResultsDropdown.classList.add('hidden');
    }
  });

  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      searchInput.blur();
      searchResultsDropdown.classList.add('hidden');
      _selectedSearchIndex = -1;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      navigateSearchResults(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      navigateSearchResults(-1);
    } else if (e.key === 'Enter' && _selectedSearchIndex >= 0) {
      e.preventDefault();
      if (_searchResultItems[_selectedSearchIndex]) {
        _searchResultItems[_selectedSearchIndex].click();
      }
    }
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
  });
}

function navigateSearchResults(direction) {
  if (_searchResultItems.length === 0) return;
  if (_selectedSearchIndex >= 0 && _selectedSearchIndex < _searchResultItems.length) {
    _searchResultItems[_selectedSearchIndex].classList.remove('search-result-keyboard-active');
  }
  _selectedSearchIndex += direction;
  if (_selectedSearchIndex < 0) _selectedSearchIndex = _searchResultItems.length - 1;
  if (_selectedSearchIndex >= _searchResultItems.length) _selectedSearchIndex = 0;
  const item = _searchResultItems[_selectedSearchIndex];
  if (item) {
    item.classList.add('search-result-keyboard-active');
    item.scrollIntoView({ block: 'nearest' });
  }
}

export function handleSearch() {
  const searchInput = _elements.searchInput;
  const searchClearBtn = _elements.searchClearBtn;
  const searchResultsDropdown = _elements.searchResultsDropdown;
  const query = searchInput.value.trim();

  if (query) {
    searchClearBtn.classList.remove('hidden');
  } else {
    searchClearBtn.classList.add('hidden');
    searchResultsDropdown.classList.add('hidden');
    return;
  }

  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const category of appState.categories) {
    for (const prompt of category.prompts) {
      const text = getPromptText(prompt);
      const translation = getPromptTranslation(prompt);
      const textMatch = text.toLowerCase().includes(lowerQuery);
      const transMatch = translation && translation.toLowerCase().includes(lowerQuery);
      if (textMatch || transMatch) {
        results.push({
          prompt,
          category,
          textMatch,
          transMatch,
          exactMatch: text.toLowerCase() === lowerQuery
        });
      }
    }
  }

  results.sort((a, b) => {
    if (a.exactMatch !== b.exactMatch) return b.exactMatch ? 1 : -1;
    if (a.textMatch !== b.textMatch) return b.textMatch ? 1 : -1;
    return 0;
  });

  renderSearchResults(results, query);
}

export function renderSearchResults(results, query) {
  const searchResultsDropdown = _elements.searchResultsDropdown;
  searchResultsDropdown.innerHTML = '';
  _selectedSearchIndex = -1;
  _searchResultItems = [];

  if (results.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.className = 'search-empty';
    emptyDiv.textContent = '未找到匹配的提示词';
    searchResultsDropdown.appendChild(emptyDiv);
  } else {
    const countDiv = document.createElement('div');
    countDiv.className = 'search-results-count';
    const total = results.length;
    const showing = Math.min(total, SEARCH_RESULT_LIMIT);
    countDiv.textContent = `找到 ${total} 个结果${total > SEARCH_RESULT_LIMIT ? `，显示前 ${showing} 个` : ''}`;
    searchResultsDropdown.appendChild(countDiv);

    const limited = results.slice(0, SEARCH_RESULT_LIMIT);
    for (const { prompt, category } of limited) {
      const item = document.createElement('div');
      const isSelected = _isPromptSelected(category.id, prompt);
      item.className = `search-result-item${isSelected ? ' search-result-selected' : ''}`;

      const mainRow = document.createElement('div');
      mainRow.className = 'search-result-main';

      const checkIcon = document.createElement('span');
      checkIcon.className = `search-result-check${isSelected ? ' checked' : ''}`;
      checkIcon.innerHTML = isSelected ? '<i class="fa fa-check-square"></i>' : '<i class="fa fa-square-o"></i>';
      mainRow.appendChild(checkIcon);

      const textContainer = document.createElement('div');
      textContainer.className = 'search-result-text-container';

      const textDiv = document.createElement('div');
      textDiv.className = 'search-result-text';
      textDiv.appendChild(highlightMatchNodes(getPromptText(prompt), query));
      textContainer.appendChild(textDiv);

      const translation = getPromptTranslation(prompt);
      if (translation) {
        const translationDiv = document.createElement('div');
        translationDiv.className = 'search-result-translation';
        translationDiv.appendChild(highlightMatchNodes(translation, query));
        textContainer.appendChild(translationDiv);
      }

      mainRow.appendChild(textContainer);

      const categoryTag = document.createElement('span');
      categoryTag.className = 'search-result-category';
      categoryTag.textContent = category.name;
      mainRow.appendChild(categoryTag);

      item.appendChild(mainRow);

      item.addEventListener('click', () => {
        _togglePrompt(category.id, prompt);
        if (appState.selectedCategoryId === category.id) {
          _renderPromptList(category.id);
        }
        _renderSelectedPrompts();
        _renderPreview();
        _saveData();
        renderSearchResults(results, query);
      });

      _searchResultItems.push(item);
      searchResultsDropdown.appendChild(item);
    }
  }

  searchResultsDropdown.classList.remove('hidden');
}

export function highlightMatchNodes(text, query) {
  const fragment = document.createDocumentFragment();
  if (!query) {
    fragment.appendChild(document.createTextNode(text));
    return fragment;
  }
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  let lastIndex = 0;
  let index = lowerText.indexOf(lowerQuery, lastIndex);
  while (index !== -1) {
    if (index > lastIndex) {
      fragment.appendChild(document.createTextNode(text.substring(lastIndex, index)));
    }
    const mark = document.createElement('mark');
    mark.textContent = text.substring(index, index + query.length);
    fragment.appendChild(mark);
    lastIndex = index + query.length;
    index = lowerText.indexOf(lowerQuery, lastIndex);
  }
  if (lastIndex < text.length) {
    fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
  }
  return fragment;
}
