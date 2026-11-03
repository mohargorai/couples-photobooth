const http = require('http');

async function testHttpEndpoints() {
  const urls = [
    'http://localhost:3000/',
    'http://localhost:3000/index.html',
    'http://localhost:3000/style.css',
    'http://localhost:3000/js/audio.js',
    'http://localhost:3000/js/camera.js',
    'http://localhost:3000/js/room.js',
    'http://localhost:3000/js/stickers.js',
    'http://localhost:3000/js/export.js',
    'http://localhost:3000/js/app.js'
  ];

  for (const url of urls) {
    await new Promise((resolve, reject) => {
      http.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          if (res.statusCode === 200) {
            console.log(`✓ [200 OK] ${url} (${res.headers['content-type']}, ${data.length} bytes)`);
            resolve();
          } else {
            console.error(`❌ [${res.statusCode}] ${url}`);
            reject(new Error(`Failed to fetch ${url}`));
          }
        });
      }).on('error', reject);
    });
  }

  console.log('\nAll assets serving live at http://localhost:3000 without errors!');
}

testHttpEndpoints().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
