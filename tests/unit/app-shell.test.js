// The service worker pre-caches a fixed list of files. If one is missing the whole install
// fails and the app stops working offline, so the list is checked against what is on disk.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const root = new URL('../../', import.meta.url);
const worker = readFileSync(new URL('service-worker.js', root), 'utf8');
const shell = [...worker.match(/const APP_SHELL = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);

/** Files under a folder, as the paths the service worker uses ('./css/style.css'). */
function filesIn(folder, extension) {
  const dir = new URL(folder + '/', root);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true })
    .map((f) => String(f).replaceAll('\\', '/'))
    .filter((f) => f.endsWith(extension))
    .map((f) => `./${folder}/${f}`);
}

test('every file in the app shell exists', () => {
  for (const file of shell.filter((f) => f !== './')) {
    assert.ok(existsSync(new URL(file, root)), `${file} is listed in APP_SHELL but does not exist`);
  }
});

test('every script, stylesheet, icon and data file is in the app shell', () => {
  const needed = [
    ...filesIn('js', '.js'),
    ...filesIn('css', '.css'),
    ...filesIn('icons', '.png'),
    ...filesIn('data', '.json')
  ];
  for (const file of needed) assert.ok(shell.includes(file), `${file} is missing from APP_SHELL`);
});

test('the fonts an English page needs are in the app shell', () => {
  const latin = filesIn('fonts', '.woff2').filter((f) => /-latin(-\d+)?\.woff2$/.test(f));
  assert.ok(latin.length > 0);
  for (const file of latin) assert.ok(shell.includes(file), `${file} is missing from APP_SHELL`);
});

test('the page links the stylesheets and the entry module', () => {
  const page = readFileSync(new URL('index.html', root), 'utf8');
  assert.match(page, /<link rel="stylesheet" href="css\/fonts\.css">/);
  assert.match(page, /<link rel="stylesheet" href="css\/style\.css">/);
  assert.match(page, /<script type="module" src="js\/main\.js"><\/script>/);
});
