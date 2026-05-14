const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function search(query) {
  const url = `https://librain.ru/search?q=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`Librain: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const books = [];

  $('.search-results-list .card').each((i, el) => {
    const $el = $(el);
    
    const titleLink = $el.find('p.fw-bold.text-white.mb-1 a');
    if (titleLink.length === 0) return;

    const title = titleLink.text().trim();
    const bookUrl = titleLink.attr('href');
    
    // Author
    let author = '';
    const authorEl = $el.find('p.text-muted.small.mb-0');
    if (authorEl.length > 0) {
      author = authorEl.text().replace('bi-person', '').trim();
    }

    if (title && bookUrl) {
      books.push({
        title,
        authors: author,
        url: bookUrl,
        source: 'librain',
        sourceLabel: 'Librain',
        downloadLinks: [{ format: 'page', url: bookUrl }],
      });
    }
  });

  return books;
}

module.exports = { search };
