const express = require('express');
const path = require('path');

const flibustaParser = require('./parsers/flibusta');
const annasParser = require('./parsers/annas-archive');
const zlibParser = require('./parsers/z-library');
const librainParser = require('./parsers/librain');

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Единый поиск по всем источникам
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query || query.trim().length === 0) {
    return res.json({ error: 'Пустой запрос' });
  }

  const sources = req.query.sources
    ? req.query.sources.split(',')
    : ['flibusta', 'annas', 'zlib', 'librain'];

  const results = {};
  const promises = [];

  if (sources.includes('flibusta')) {
    promises.push(
      flibustaParser.search(query)
        .then(data => { results.flibusta = { success: true, books: data }; })
        .catch(err => { results.flibusta = { success: false, error: err.message }; })
    );
  }

  if (sources.includes('annas')) {
    promises.push(
      annasParser.search(query)
        .then(data => { results.annas = { success: true, books: data }; })
        .catch(err => { results.annas = { success: false, error: err.message }; })
    );
  }

  if (sources.includes('zlib')) {
    promises.push(
      zlibParser.search(query)
        .then(data => { results.zlib = { success: true, books: data }; })
        .catch(err => { results.zlib = { success: false, error: err.message }; })
    );
  }



  if (sources.includes('librain')) {
    promises.push(
      librainParser.search(query)
        .then(data => { results.librain = { success: true, books: data }; })
        .catch(err => { results.librain = { success: false, error: err.message }; })
    );
  }

  await Promise.allSettled(promises);
  res.json(results);
});

// Поиск по отдельному источнику
app.get('/api/search/:source', async (req, res) => {
  const query = req.query.q;
  const source = req.params.source;

  if (!query || query.trim().length === 0) {
    return res.json({ success: false, error: 'Пустой запрос' });
  }

  const parsers = {
    flibusta: flibustaParser,
    annas: annasParser,
    zlib: zlibParser,
    librain: librainParser,
  };

  const parser = parsers[source];
  if (!parser) {
    return res.json({ success: false, error: `Источник "${source}" не найден` });
  }

  try {
    let books = await parser.search(query);
    
    // Фильтрация результатов (мягкая, с учетом окончаний)
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const getStem = (w) => {
      if (w.length <= 3) return w;
      if (w.length <= 5) return w.substring(0, 3); 
      return w.substring(0, w.length - 2);
    };
    const stems = queryWords.map(getStem);
    
    books = books.filter(book => {
      const targetText = `${book.title} ${book.authors || ''}`.toLowerCase();
      return stems.every(stem => targetText.includes(stem));
    });

    res.json({ success: true, books });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📚 Book Search запущен на http://localhost:${PORT}`);
  // Автоматически открываем браузер
  const { exec } = require('child_process');
  exec(`start http://localhost:${PORT}`);
});
