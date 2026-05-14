const cheerio = require('cheerio');

async function test() {
  const query = 'Bulgakov';
  const url = `https://flibusta.is/booksearch?ask=${encodeURIComponent(query)}&chb=on`;
  console.log('Fetching', url);
  const res = await fetch(url, {headers:{'User-Agent':'Mozilla/5.0'}});
  const html = await res.text();
  const $ = cheerio.load(html);
  
  console.log('Main element exists:', $('#main').length);
  if ($('#main').length > 0) {
    console.log('Main content:', $('#main').text().substring(0, 300).trim().replace(/\n+/g, ' '));
  } else {
    console.log('Body content:', $('body').text().substring(0, 300).trim().replace(/\n+/g, ' '));
  }
}
test();
