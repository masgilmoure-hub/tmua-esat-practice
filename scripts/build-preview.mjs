import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';

// Produce a portable, interactive file from the actual production build.
// UI remains real JavaScript, not a screenshot. It makes no external asset requests.
const target = resolve(process.argv[2] || 'dist/tmua-esat-preview.html');
let html = readFileSync('dist/index.html', 'utf8');
html = html.replace(/<script[^>]*src="([^"]+)"[^>]*><\/script>/g, (_tag, asset) => {
  const worker = readdirSync('dist/assets').find(name => name.startsWith('pdf.worker.min-') && name.endsWith('.mjs'));
  const files = Object.fromEntries(readdirSync('dist/papers').filter(name => name.endsWith('.pdf')).map(name => [name, readFileSync(resolve('dist/papers', name)).toString('base64')]));
  const diagrams = Object.fromEntries(readdirSync('dist/question-images').filter(name => name.endsWith('.png')).map(name => [`question-images/${name}`, 'data:image/png;base64,' + readFileSync(resolve('dist/question-images', name)).toString('base64')]));
  const bootstrap = `globalThis.__TMUA_LOCAL_PAPERS__=${JSON.stringify(files)};globalThis.__TMUA_QUESTION_IMAGES__=${JSON.stringify(diagrams)};` + (worker ? `globalThis.__TMUA_PDF_WORKER_URL__=URL.createObjectURL(new Blob([${JSON.stringify(readFileSync(resolve('dist/assets', worker), 'utf8'))}],{type:'text/javascript'}));` : '');
  const js = (bootstrap + readFileSync(resolve('dist', asset.replace(/^\//, '')), 'utf8')).replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (_tag, asset) => {
  const css = readFileSync(resolve('dist', asset.replace(/^\//, '')), 'utf8').replace(/url\(([^)]+)\)/g, (match, url) => {
    const path = url.replace(/["']/g, '');
    if (!/\.(woff2?|ttf)$/.test(path)) return match;
    const ext = path.split('.').pop();
    const file = path.startsWith('/') ? resolve('dist', path.slice(1)) : resolve('dist', dirname(asset), path);
    return `url(data:font/${ext};base64,${readFileSync(file).toString('base64')})`;
  }).replace(/<\/style/gi, '<\\/style');
  return `<style>${css}</style>`;
});
mkdirSync(resolve(target, '..'), { recursive: true });
writeFileSync(target, html);
console.log(`Interactive standalone preview written to ${target}`);
