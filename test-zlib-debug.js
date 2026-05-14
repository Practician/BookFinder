async function debugZLib() {
  const res = await fetch('https://ru.z-lib.fm/s/Bulgakov', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept-Language': 'ru-RU,ru;q=0.9',
    }
  });
  const html = await res.text();
  
  // Find resItemBox in raw HTML
  const idx = html.indexOf('resItemBox');
  if (idx > -1) {
    console.log('resItemBox context:');
    console.log(html.substring(idx - 100, idx + 500));
    console.log('\n---\n');
  }
  
  // Find /book/ links
  const bookRegex = /href="(\/book\/\d+\/[^"]+)"/g;
  const bookLinks = [];
  let match;
  while ((match = bookRegex.exec(html)) !== null) {
    bookLinks.push(match[1]);
  }
  console.log('Book links found:', bookLinks.length);
  console.log('First 5:', bookLinks.slice(0, 5));
  
  // Find Master and Margarita
  const mmIdx = html.indexOf('Master and Margarita');
  if (mmIdx > -1) {
    console.log('\nMaster and Margarita context:');
    console.log(html.substring(mmIdx - 300, mmIdx + 200));
  }
  
  // Find z-bookcard
  const zcIdx = html.indexOf('z-bookcard');
  if (zcIdx > -1) {
    console.log('\nz-bookcard context:');
    console.log(html.substring(zcIdx - 50, zcIdx + 500));
  }
}

debugZLib().catch(e => console.error(e));
