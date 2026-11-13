// Builds one self-contained page (CSS and all modules inline) for hosting as a private
// claude.ai artifact. Usage: node tools/build-artifact.mjs [out.html]   (default dist/artifact.html)
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const out = process.argv[2] || join(root, '..', 'dist', 'artifact.html');
const order = ['art', 'engine', 'audio', 'config', 'cloud', 'app']; // dependencies first

let bundle = '';
for (const name of order) {
  let src = await readFile(join(root, name + '.js'), 'utf8');
  const exports = [];
  // import {a, b} from './x.js'  ->  const {a, b} = __x;
  src = src.replace(/^import\s*\{([^}]*)\}\s*from\s*'\.\/(\w+)\.js';?/gm, (_, names, mod) => `const {${names}} = __${mod};`);
  // import * as x from './y.js'  ->  const x = __y;
  src = src.replace(/^import\s*\*\s*as\s*(\w+)\s*from\s*'\.\/(\w+)\.js';?/gm, (_, alias, mod) => `const ${alias} = __${mod};`);
  src = src.replace(/(^|[;}\s])export\s+(async\s+function|function|const|let)\s+(\w+)/gm, (_, pre, kind, id) => { exports.push(id); return `${pre}${kind} ${id}`; });
  if (/(^|[;}\s])(export\s|import\s*[{*])/m.test(src)) throw Error(`Unhandled import/export in ${name}.js`);
  bundle += `const __${name} = (() => {\n${src}\nreturn {${exports.join(', ')}};\n})();\n`;
}

const css = await readFile(join(root, 'style.css'), 'utf8');
const html = await readFile(join(root, 'index.html'), 'utf8');
const body = html.match(/<body>([\s\S]*?)<script/)[1].trim();
const page = `<title>Madison’s Learning Kingdom</title>
<meta name="theme-color" content="#f9f4e9">
<style>
${css}
</style>
${body}
<script type="module">
${bundle}
</script>
`;
await mkdir(dirname(out), {recursive:true});
await writeFile(out, page);
console.log('wrote', out, (page.length / 1024).toFixed(0) + ' KB');
