const cheerio = require('cheerio');

async function testFlibusta() {
  console.log('=== Testing Flibusta ===');
  const res = await fetch('https://flibusta.is/booksearch?ask=Bulgakov&chb=on', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });
  const html = await res.text();
  const ch = cheerio.load(html);
  
  console.log('Status:', res.status, 'Length:', html.length);
  console.log('#main ul li count:', ch('#main ul li').length);
  console.log('All li count:', ch('li').length);
  console.log('All a[href^=/b/] count:', ch('a[href^="/b/"]').length);
  
  // Try different selectors
  const selectors = ['#main ul li', '#main li', '.content li', 'ul li', 'li'];
  for (const sel of selectors) {
    const count = ch(sel).length;
    if (count > 0) {
      console.log(`Selector "${sel}": ${count} items`);
      const first = ch(sel).first();
      console.log('  First item HTML:', first.html()?.substring(0, 200));
    }
  }
}

async function testZLib() {
  console.log('\n=== Testing Z-Library ===');
  const res = await fetch('https://ru.z-lib.fm/s/Bulgakov', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    }
  });
  const html = await res.text();
  const ch = cheerio.load(html);
  
  console.log('Status:', res.status, 'Length:', html.length);
  console.log('.resItemBox count:', ch('.resItemBox').length);
  console.log('.bookRow count:', ch('.bookRow').length);
  console.log('a[href*=/book/] count:', ch('a[href*="/book/"]').length);
  
  // Show first resItemBox
  const first = ch('.resItemBox').first();
  if (first.length) {
    console.log('First resItemBox h3 text:', first.find('h3').text().trim().substring(0, 100));
    console.log('First resItemBox h3 a href:', first.find('h3 a').attr('href'));
    console.log('First resItemBox authors:', first.find('a[href*="/author/"]').text().trim().substring(0, 100));
  } else {
    // Check what elements exist
    console.log('No .resItemBox found. Looking for book links...');
    ch('a[href*="/book/"]').each((i, el) => {
      if (i < 3) {
        console.log(`  Book link ${i}: href=${ch(el).attr('href')}, text=${ch(el).text().trim().substring(0, 80)}`);
      }
    });
  }
}

testFlibusta().then(() => testZLib()).catch(e => console.error(e));
