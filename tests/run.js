// Bütün test dosyalarını çalıştırır: `node tests/run.js` ya da `npm test`.
'use strict';
const fs = require('fs');
const path = require('path');
const harness = require('./harness');

harness.loadCore();

const files = fs
  .readdirSync(__dirname)
  .filter((f) => f.endsWith('.test.js'))
  .sort();

for (const file of files) {
  harness.setFile(file.replace('.test.js', ''));
  require(path.join(__dirname, file));
}

harness.run().then((failed) => {
  process.exitCode = failed ? 1 : 0;
});
