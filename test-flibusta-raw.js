async function test() {
  const res = await fetch('https://flibusta.is/booksearch?ask=Bulgakov&chb=on', {headers:{'User-Agent':'Mozilla/5.0'}});
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  const idx = html.indexOf('/b/');
  if (idx > -1) {
    console.log('Found /b/ at index', idx);
    console.log(html.substring(idx - 100, idx + 200));
  } else {
    console.log('No /b/ found in HTML');
  }

  const titleIdx = html.indexOf('Bulgakov');
  if (titleIdx > -1) {
    console.log('Found Bulgakov at index', titleIdx);
    console.log(html.substring(titleIdx - 100, titleIdx + 200));
  }
}
test();
