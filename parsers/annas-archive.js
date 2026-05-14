const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function search(query) {
  const domains = ['annas-archive.gs', 'annas-archive.se', 'annas-archive.org', 'annas-archive.gd'];
  let html = null;
  let successDomain = null;

  for (const domain of domains) {
    try {
      const url = `https://${domain}/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'en-US,en;q=0.9,ru;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const text = await response.text();
        // Проверяем, что это не фейковое зеркало-заглушка
        if (text.includes('Anna') && !text.includes('Antibot solution')) {
          html = text;
          successDomain = domain;
          break; // Успешно загрузили, выходим из цикла
        } else {
          console.log(`[Anna's Archive] Domain ${domain} returned invalid HTML.`);
        }
      }
    } catch (e) {
      // Игнорируем ошибку и пробуем следующий домен
      console.log(`[Anna's Archive] Domain ${domain} failed: ${e.message}`);
    }
  }

  if (!html) {
    throw new Error(`Anna's Archive недоступен (все зеркала не ответили)`);
  }

  const $ = cheerio.load(html);
  const books = [];

  // Результаты — ссылки на /md5/{hash}
  $('a[href*="/md5/"]').each((i, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';

    // Проверяем что это ссылка на книгу, а не на другую структуру
    if (!href.match(/^\/md5\/[a-f0-9]{32}$/)) return;

    // Получаем текст — название книги (обычно первый значимый текст)
    const title = $el.text().trim().split('\n')[0].trim();
    if (!title || title.length < 2) return;

    // Проверяем дубликаты
    const bookUrl = `https://${successDomain}${href}`;
    if (books.find(b => b.url === bookUrl)) return;

    // Ищем автора и издательство — они обычно в соседних элементах
    const parent = $el.parent();
    let author = '';
    let publisher = '';
    let extraInfo = '';

    // Ищем следующие ссылки с search?q= — это обычно автор и издательство
    const siblingLinks = parent.find('a[href*="/search?q="]');
    siblingLinks.each((j, sib) => {
      const text = $(sib).text().trim();
      if (j === 0 && text) author = text;
      if (j === 1 && text) publisher = text;
    });

    // Получаем дополнительную информацию из текста блока
    const fullText = parent.text().trim();
    // Ищем формат файла и размер
    const formatMatch = fullText.match(/\b(pdf|epub|fb2|mobi|djvu|azw3|txt|doc|docx|cbr|cbz)\b/i);
    const sizeMatch = fullText.match(/(\d+(?:\.\d+)?\s*(?:MB|KB|GB|Б|КБ|МБ|ГБ))/i);

    books.push({
      title,
      authors: author,
      publisher,
      format: formatMatch ? formatMatch[1].toUpperCase() : '',
      size: sizeMatch ? sizeMatch[1] : '',
      url: bookUrl,
      source: 'annas',
      sourceLabel: "Anna's Archive",
      downloadLinks: [{ format: 'page', url: bookUrl }],
    });
  });

  return books;
}

module.exports = { search };
