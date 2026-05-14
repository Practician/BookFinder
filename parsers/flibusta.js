const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function search(query) {
  const url = `https://flibusta.is/booksearch?ask=${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Flibusta: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);
  const books = [];

  // Результаты поиска — список <li> внутри #main
  $('#main ul li').each((i, el) => {
    const $el = $(el);
    const links = $el.find('a');

    let title = '';
    let bookUrl = '';
    let authors = [];

    links.each((j, linkEl) => {
      const href = $(linkEl).attr('href') || '';
      const text = $(linkEl).text().trim();

      if (href.startsWith('/b/')) {
        title = text;
        bookUrl = `https://flibusta.is${href}`;
      } else if (href.startsWith('/a/')) {
        authors.push({
          name: text,
          url: `https://flibusta.is${href}`,
        });
      }
    });

    if (title && bookUrl) {
      // Извлекаем ID книги для формирования ссылок скачивания
      const bookIdMatch = bookUrl.match(/\/b\/(\d+)/);
      const bookId = bookIdMatch ? bookIdMatch[1] : null;

      const downloadLinks = bookId ? [
        { format: 'fb2', url: `https://flibusta.is/b/${bookId}/fb2` },
        { format: 'epub', url: `https://flibusta.is/b/${bookId}/epub` },
        { format: 'mobi', url: `https://flibusta.is/b/${bookId}/mobi` },
        { format: 'txt', url: `https://flibusta.is/b/${bookId}/txt` },
      ] : [];

      books.push({
        title,
        authors: authors.map(a => a.name).join(', '),
        url: bookUrl,
        source: 'flibusta',
        sourceLabel: 'Флибуста',
        downloadLinks,
      });
    }
  });

  return books;
}

module.exports = { search };
