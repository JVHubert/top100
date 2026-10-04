// Gera o modo offline (passa-o-celular) como um unico arquivo HTML, sem servidor e sem internet:
//
//   npm run celular -> dist/top100-celular.html   (arquivo para mandar ao celular)
//                      dist/site/                 (site instalavel, publicado no GitHub Pages)
//
// O site e o mesmo HTML + manifesto + service worker (funciona offline e instala como app).
// O service worker ganha uma VERSAO nova a cada build (data + commit), entao quem ja
// instalou recebe a atualizacao sozinho.
//
// As fontes (Bungee e Figtree) sao baixadas do Google Fonts na hora do build e embutidas;
// se nao houver internet, o arquivo sai com as fontes de reserva do sistema.
// Todas as categorias registradas em src/categories.js vao embutidas.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { listCategories, getCategory } from '../src/categories.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist', 'top100-celular.html');
const SITE = path.join(ROOT, 'dist', 'site');
const ICONS = path.join(ROOT, 'ferramentas', 'icones');
const FONTS_CSS = 'https://fonts.googleapis.com/css2?family=Bungee&family=Figtree:wght@400;600;800&display=swap';
// UA de navegador moderno: faz o Google Fonts responder com woff2
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');

/** Remove import/export para juntar os modulos num unico <script>. */
const stripModule = (src) =>
  src
    .replace(/^import[\s\S]*?from\s+['"][^'"]+['"];?\s*$/gm, '')
    .replace(/^export\s+\{[^}]*\};?\s*$/gm, '')
    .replace(/^export\s+(?=(const|function|class|let|async))/gm, '');

function mustReplace(src, from, to) {
  if (!src.includes(from)) throw new Error(`trecho nao encontrado: ${from.slice(0, 60)}`);
  return src.replace(from, () => to);
}

async function inlineFonts() {
  try {
    const css = await (await fetch(FONTS_CSS, { headers: { 'User-Agent': UA } })).text();
    // so o subconjunto latin (cobre portugues); cada bloco vem precedido de /* latin */
    const blocks = css.split(/(?=\/\* [a-z-]+ \*\/)/).filter((b) => b.startsWith('/* latin */'));
    let out = '';
    for (const block of blocks) {
      const url = block.match(/url\((https:[^)]+)\)/)?.[1];
      if (!url) continue;
      const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
      out += block.replace(url, `data:font/woff2;base64,${buf.toString('base64')}`);
    }
    if (!out) throw new Error('nenhuma fonte latin encontrada');
    return out;
  } catch (err) {
    console.warn(`[fontes] sem fontes embutidas (${err.message}); usando as do sistema.`);
    return '';
  }
}

const categories = listCategories().map((c) => getCategory(c.id));
const fonts = await inlineFonts();

const script = [
  `window.TOP100_CATEGORIES = ${JSON.stringify(categories)};`,
  read('public/reveal-view.js'), // script classico: define window.Top100Reveal
  // escopo proprio para nao vazar nomes no window
  '(function () {',
  stripModule(read('src/look.js')),
  stripModule(read('src/category-ui.js')),
  stripModule(read('src/matcher.js')),
  stripModule(read('src/matching.js')),
  stripModule(read('src/scoring.js')),
  stripModule(read('src/offline-rules.js')),
  stripModule(read('public/offline.js')),
  '})();',
].join('\n');

let html = read('public/offline.html');
html = html.replace(/\s*<link rel="preconnect"[^>]*>/g, '');
html = mustReplace(html, '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bungee&family=Figtree:wght@400;600;800&display=swap">', '');
html = mustReplace(html, '<link rel="stylesheet" href="/style.css">', `<style>\n${fonts}\n${read('public/style.css')}\n</style>`);
html = mustReplace(html, '<script src="/reveal-view.js"></script>', '');
html = mustReplace(html, '<script type="module" src="/offline.js"></script>', `<script>\n${script.replace(/<\/script/gi, '<\\/script')}\n</script>`);

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, html);
console.log(`ok: ${path.relative(ROOT, OUT)} (${(html.length / 1024).toFixed(0)} KB, ${categories.length} categoria(s), fontes ${fonts ? 'embutidas' : 'do sistema'})`);

// ---------------------------------------------------------------- site instalavel (PWA)
let commit = process.env.GITHUB_SHA ? process.env.GITHUB_SHA.slice(0, 7) : '';
try {
  commit ||= execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim();
} catch {
  commit ||= 'local';
}
const VERSAO = `${new Date().toISOString().slice(0, 10)}-${commit}`;

let site = mustReplace(html, '</head>', '  <link rel="manifest" href="manifest.webmanifest">\n  <link rel="apple-touch-icon" href="icon-192.png">\n</head>');
site = mustReplace(site, '</body>', `  <script>
    if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
  </script>
</body>`);

const manifest = {
  name: 'Top 100',
  short_name: 'Top 100',
  description: 'Chegue o mais perto possível do fundo da lista. Num celular só, passando de mão em mão.',
  lang: 'pt-BR',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'portrait',
  background_color: '#2A1E5C',
  theme_color: '#2A1E5C',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const sw = `// Gerado por ferramentas/gerar-celular.mjs. Nao edite: a VERSAO muda a cada build.
const VERSAO = '${VERSAO}';
const CACHE = 'top100-' + VERSAO;
const ARQUIVOS = ['./', 'index.html', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((nomes) => Promise.all(nomes.filter((n) => n.startsWith('top100-') && n !== CACHE).map((n) => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Pagina: tenta a rede primeiro (pega a versao nova) e cai no cache sem internet.
// Demais arquivos: cache primeiro.
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  if (e.request.mode === 'navigate') {
    e.respondWith(fetch(e.request)
      .then((r) => { const copia = r.clone(); caches.open(CACHE).then((c) => c.put('index.html', copia)); return r; })
      .catch(() => caches.match('index.html')));
    return;
  }
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
`;

fs.rmSync(SITE, { recursive: true, force: true });
fs.mkdirSync(SITE, { recursive: true });
fs.writeFileSync(path.join(SITE, 'index.html'), site);
fs.writeFileSync(path.join(SITE, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2));
fs.writeFileSync(path.join(SITE, 'sw.js'), sw);
for (const icon of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
  fs.copyFileSync(path.join(ICONS, icon), path.join(SITE, icon));
}
fs.writeFileSync(path.join(SITE, '.nojekyll'), '');
console.log(`ok: dist/site (versao ${VERSAO})`);
