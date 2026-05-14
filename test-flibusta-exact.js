const cheerio = require('cheerio');

async function test() {
  const query = 'Bulgakov';
  const url = `https://flibusta.is/booksearch?ask=${encodeURIComponent(query)}&chb=on`;
  const res = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}});
  const html = await res.text();
  const $ = cheerio.load(html);
  
  const books = [];
  $('#main ul li').each((i, el) => {
    books.push($(el).text().trim().substring(0, 100));
  });
  console.log(`Found ${books.length} items in #main ul li`);
  console.log(books.slice(0, 5));
  
  // Just 'li'
  const allLis = [];
  $('li').each((i, el) => {
    const txt = $(el).text().trim().substring(0, 100);
    if (txt.includes('Bulgakov')) allLis.push(txt);
  });
  console.log(`Found ${allLis.length} ALL li containing Bulgakov`);
  console.log(allLis.slice(0, 5));
}
test();
