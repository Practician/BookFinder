const cheerio = require('cheerio');

async function test() {
  const res = await fetch('https://flibusta.is/booksearch?ask=Bulgakov&chb=on', {headers:{'User-Agent':'Mozilla/5.0'}});
  const html = await res.text();
  const $ = cheerio.load(html);
  
  $('li').each((i, el) => {
    const links = $(el).find('a');
    let hasBook = false;
    links.each((j, a) => {
      const href = $(a).attr('href');
      if (href && href.startsWith('/b/')) hasBook = true;
    });
    
    if (hasBook) {
      console.log('Book found in li:', $(el).text().trim().replace(/\n/g, ' '));
      console.log('HTML:', $(el).html());
    }
  });
}
test();
