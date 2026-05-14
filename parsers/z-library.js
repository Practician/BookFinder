const cheerio = require('cheerio');

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

async function search(query) {
  const url = `https://ru.z-lib.fm/s/${encodeURIComponent(query)}`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': 'https://ru.z-lib.fm/',
    },
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Z-Library: HTTP ${response.status}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html, { xmlMode: false });
  const books = [];
  const seen = new Set();

  // Z-Library использует кастомный Web Component <z-bookcard>
  // Атрибуты: href, download, publisher, language, id, isbn
  // Внутри: <div slot="title">, <div slot="author">, <div slot="note">
  $('z-bookcard').each((i, el) => {
    const $el = $(el);

    const href = $el.attr('href') || '';
    const downloadPath = $el.attr('download') || '';
    const publisher = $el.attr('publisher') || '';
    const language = $el.attr('language') || '';
    const bookId = $el.attr('id') || '';

    // Название из slot="title"
    const title = $el.find('[slot="title"]').text().trim() || $el.find('div').first().text().trim();
    if (!title || title.length < 2) return;

    // Автор из slot="author"
    const author = $el.find('[slot="author"]').text().trim()
      .replace(/;/g, ',')  // Z-Library разделяет авторов точкой с запятой
      .trim();

    const fullUrl = href.startsWith('http')
      ? href
      : `https://ru.z-lib.fm${href}`;

    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    // Прямая ссылка скачивания
    const downloadUrl = downloadPath
      ? (downloadPath.startsWith('http') ? downloadPath : `https://ru.z-lib.fm${downloadPath}`)
      : '';

    // Метаданные из текста элемента или из родительского блока
    const parentText = $el.parent().text() || '';
    const yearMatch = parentText.match(/(?:Год|Year):\s*(\d{4})/);
    const fileMatch = parentText.match(/(?:Файл|File):\s*(\w+),?\s*([\d.]+\s*\w+)/);

    const downloadLinks = [];
    if (downloadUrl) {
      downloadLinks.push({ format: 'скачать', url: downloadUrl });
    }
    downloadLinks.push({ format: 'page', url: fullUrl });

    books.push({
      title,
      authors: author,
      publisher,
      language,
      year: yearMatch ? yearMatch[1] : '',
      format: fileMatch ? fileMatch[1].toUpperCase() : '',
      size: fileMatch ? fileMatch[2] : '',
      url: fullUrl,
      source: 'zlib',
      sourceLabel: 'Z-Library',
      downloadLinks,
    });
  });

  // Fallback: если z-bookcard не найдены, парсим regex-ом
  if (books.length === 0) {
    const bookcardRegex = /<z-bookcard\s[^>]*?href="([^"]*)"[^>]*?(?:download="([^"]*)")?[^>]*?(?:publisher="([^"]*)")?[^>]*?(?:language="([^"]*)")?[^>]*?>[\s\S]*?<div\s+slot="title">([\s\S]*?)<\/div>[\s\S]*?<div\s+slot="author">([\s\S]*?)<\/div>[\s\S]*?<\/z-bookcard>/gi;

    let match;
    while ((match = bookcardRegex.exec(html)) !== null) {
      const [, href, downloadPath, publisher, language, title, author] = match;
      const cleanTitle = title.trim();
      if (!cleanTitle) continue;

      const fullUrl = href.startsWith('http') ? href : `https://ru.z-lib.fm${href}`;
      if (seen.has(fullUrl)) continue;
      seen.add(fullUrl);

      const downloadUrl = downloadPath
        ? (downloadPath.startsWith('http') ? downloadPath : `https://ru.z-lib.fm${downloadPath}`)
        : '';

      const downloadLinks = [];
      if (downloadUrl) {
        downloadLinks.push({ format: 'скачать', url: downloadUrl });
      }
      downloadLinks.push({ format: 'page', url: fullUrl });

      books.push({
        title: cleanTitle,
        authors: (author || '').trim().replace(/;/g, ','),
        publisher: (publisher || '').trim(),
        language: (language || '').trim(),
        url: fullUrl,
        source: 'zlib',
        sourceLabel: 'Z-Library',
        downloadLinks,
      });
    }
  }

  console.log(`[Z-Library] Found ${books.length} books`);
  return books;
}

module.exports = { search };
