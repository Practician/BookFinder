// =============================================
//  BookFinder — Frontend Application Logic
// =============================================

const SOURCES = {
  flibusta: { label: 'Флибуста', icon: '📖', color: 'flibusta' },
  annas:    { label: "Anna's Archive", icon: '🏛️', color: 'annas' },
  zlib:     { label: 'Z-Library', icon: '📕', color: 'zlib' },
  librain:  { label: 'Librain', icon: '🧠', color: 'librain' }
};

let allResults = {};
let currentFilter = 'all';

// --- DOM Elements ---
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const searchBox = document.getElementById('search-box');
const loading = document.getElementById('loading');
const loadingText = document.getElementById('loading-text');
const loadingSources = document.getElementById('loading-sources');
const resultsSection = document.getElementById('results-section');
const resultsGrid = document.getElementById('results-grid');
const resultsSummary = document.getElementById('results-summary');
const emptyState = document.getElementById('empty-state');
const tabs = document.querySelectorAll('.tab');

// --- Event Listeners ---
searchBtn.addEventListener('click', performSearch);
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') performSearch();
});

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const source = tab.dataset.source;
    setActiveTab(source);
    renderResults();
  });
});

// --- Search ---
async function performSearch() {
  const query = searchInput.value.trim();
  if (!query) {
    searchBox.style.animation = 'shake 0.4s ease';
    setTimeout(() => searchBox.style.animation = '', 400);
    return;
  }

  // Reset state
  allResults = {};
  currentFilter = 'all';
  setActiveTab('all');
  resetCounts();

  // Show loading
  emptyState.style.display = 'none';
  resultsSection.style.display = 'none';
  loading.style.display = 'flex';
  loadingText.textContent = 'Поиск по библиотекам...';

  // Create source loading indicators
  loadingSources.innerHTML = Object.entries(SOURCES).map(([key, src]) => `
    <div class="loading-source" id="ls-${key}">
      <div class="spinner"></div>
      <span>${src.icon} ${src.label}</span>
    </div>
  `).join('');

  // Search each source independently (parallel)
  const sourceKeys = Object.keys(SOURCES);
  let completed = 0;

  const promises = sourceKeys.map(async (source) => {
    try {
      const response = await fetch(`/api/search/${source}?q=${encodeURIComponent(query)}`);
      const data = await response.json();

      allResults[source] = data;
      completed++;

      // Update source loading indicator
      const lsEl = document.getElementById(`ls-${source}`);
      if (lsEl) {
        if (data.success) {
          lsEl.className = 'loading-source done';
          lsEl.innerHTML = `<span>✓</span><span>${SOURCES[source].icon} ${SOURCES[source].label} (${data.books.length})</span>`;
        } else {
          lsEl.className = 'loading-source error';
          lsEl.innerHTML = `<span>✗</span><span>${SOURCES[source].icon} ${SOURCES[source].label}</span>`;
        }
      }

      // Update counts
      updateCount(source, data.success ? data.books.length : 0);
      updateTotalCount();

      // Show partial results as they come in
      if (completed >= 1) {
        showResultsPartial();
      }

      loadingText.textContent = `Загружено ${completed} из ${sourceKeys.length}...`;
    } catch (err) {
      allResults[source] = { success: false, error: err.message };
      completed++;

      const lsEl = document.getElementById(`ls-${source}`);
      if (lsEl) {
        lsEl.className = 'loading-source error';
        lsEl.innerHTML = `<span>✗</span><span>${SOURCES[source].icon} ${SOURCES[source].label}</span>`;
      }

      updateCount(source, 0);
      loadingText.textContent = `Загружено ${completed} из ${sourceKeys.length}...`;
    }
  });

  await Promise.allSettled(promises);

  // All done
  loading.style.display = 'none';
  showResultsPartial();
}

function showResultsPartial() {
  resultsSection.style.display = 'block';
  renderResults();
}

// --- Tab Management ---
function setActiveTab(source) {
  currentFilter = source;
  tabs.forEach(tab => {
    tab.classList.toggle('active', tab.dataset.source === source);
  });
}

function resetCounts() {
  Object.keys(SOURCES).forEach(key => {
    const el = document.getElementById(`count-${key}`);
    if (el) { el.textContent = ''; el.classList.remove('visible'); }
  });
  const allEl = document.getElementById('count-all');
  if (allEl) { allEl.textContent = ''; allEl.classList.remove('visible'); }
}

function updateCount(source, count) {
  const el = document.getElementById(`count-${source}`);
  if (el) {
    el.textContent = count;
    el.classList.add('visible');
  }
}

function updateTotalCount() {
  let total = 0;
  Object.values(allResults).forEach(r => {
    if (r && r.success) total += r.books.length;
  });
  const el = document.getElementById('count-all');
  if (el) {
    el.textContent = total;
    el.classList.add('visible');
  }
}

// --- Render Results ---
function renderResults() {
  const grid = resultsGrid;
  grid.innerHTML = '';

  let books = [];
  let errors = [];

  if (currentFilter === 'all') {
    Object.entries(allResults).forEach(([source, data]) => {
      if (data.success) {
        books.push(...data.books);
      } else if (data.error) {
        errors.push({ source, error: data.error });
      }
    });
  } else {
    const data = allResults[currentFilter];
    if (data) {
      if (data.success) {
        books = data.books;
      } else if (data.error) {
        errors.push({ source: currentFilter, error: data.error });
      }
    }
  }

  // Update summary
  resultsSummary.textContent = books.length > 0
    ? `Найдено: ${books.length} ${pluralize(books.length, 'книга', 'книги', 'книг')}`
    : '';

  // Show errors
  errors.forEach(({ source, error }) => {
    const errEl = document.createElement('div');
    errEl.className = 'source-error';
    errEl.innerHTML = `
      <span class="err-icon">⚠️</span>
      <span><strong>${SOURCES[source]?.label || source}:</strong> ${escapeHtml(error)}</span>
    `;
    grid.appendChild(errEl);
  });

  // Show books
  if (books.length === 0 && errors.length === 0) {
    // Check if any search has been made
    const hasData = Object.keys(allResults).length > 0;
    if (hasData) {
      grid.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔎</div>
          <h3>Ничего не найдено</h3>
          <p>Попробуйте изменить запрос</p>
        </div>
      `;
    }
    return;
  }

  books.forEach((book, idx) => {
    const card = createBookCard(book, idx);
    grid.appendChild(card);
  });
}

function createBookCard(book, index) {
  const card = document.createElement('div');
  card.className = 'book-card';
  card.dataset.source = book.source;
  card.style.animationDelay = `${Math.min(index * 0.04, 0.5)}s`;

  const srcInfo = SOURCES[book.source] || {};

  // Download links HTML
  let actionsHtml = '';
  if (book.downloadLinks && book.downloadLinks.length > 0) {
    if (book.source === 'flibusta') {
      actionsHtml = book.downloadLinks.map(dl =>
        `<a href="${escapeHtml(dl.url)}" target="_blank" rel="noopener" class="action-btn" onclick="event.stopPropagation()">${dl.format.toUpperCase()}</a>`
      ).join('');
    } else {
      actionsHtml = `<a href="${escapeHtml(book.url)}" target="_blank" rel="noopener" class="action-btn primary" onclick="event.stopPropagation()">Открыть →</a>`;
    }
  }

  // Extra info (format, publisher, etc.)
  let metaExtra = '';
  if (book.format) {
    metaExtra += `<span class="format-badge">${escapeHtml(book.format)}</span>`;
  }
  if (book.size) {
    metaExtra += `<span class="format-badge">${escapeHtml(book.size)}</span>`;
  }
  if (book.publisher) {
    metaExtra += `<span class="format-badge">${escapeHtml(truncate(book.publisher, 30))}</span>`;
  }

  card.innerHTML = `
    <div class="card-row" style="display: flex; align-items: center; gap: 12px; width: 100%;">
      <div class="card-title" style="flex: 2; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${escapeHtml(book.title)}">${escapeHtml(book.title)}</div>
      ${book.authors ? `<div class="card-author" style="flex: 1.5; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 0;" title="${escapeHtml(book.authors)}">${escapeHtml(book.authors)}</div>` : ''}
      <div class="card-meta" style="flex-shrink: 0; margin-top: 0; gap: 4px;">
        <span class="source-badge ${srcInfo.color || ''}">${srcInfo.icon || ''} ${srcInfo.label || book.sourceLabel || ''}</span>
        ${metaExtra}
      </div>
      ${actionsHtml ? `<div class="card-actions" style="flex-shrink: 0; margin-top: 0;">${actionsHtml}</div>` : ''}
      <a href="${escapeHtml(book.url)}" target="_blank" rel="noopener" class="open-link" title="Открыть на сайте" onclick="event.stopPropagation()" style="width: 28px; height: 28px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
          <polyline points="15 3 21 3 21 9"></polyline>
          <line x1="10" y1="14" x2="21" y2="3"></line>
        </svg>
      </a>
    </div>
  `;

  card.addEventListener('click', () => {
    window.open(book.url, '_blank');
  });

  return card;
}

// --- Utilities ---
function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function truncate(str, len) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '…' : str;
}

function pluralize(n, one, few, many) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

// --- Shake animation ---
const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    20% { transform: translateX(-6px); }
    40% { transform: translateX(6px); }
    60% { transform: translateX(-4px); }
    80% { transform: translateX(4px); }
  }
`;
document.head.appendChild(style);
