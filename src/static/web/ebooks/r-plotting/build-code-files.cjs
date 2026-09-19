const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = __dirname;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const baseMatch = html.match(/const sections=\[(.*?)\n\];/s);
if (!baseMatch) throw new Error('未找到基础章节数据');

const baseContext = {};
vm.createContext(baseContext);
vm.runInContext('var sections=[' + baseMatch[1] + '\n];', baseContext);

const extraContext = {};
vm.createContext(extraContext);
vm.runInContext(fs.readFileSync(path.join(root, 'extra-charts.js'), 'utf8'), extraContext);

const sections = [...baseContext.sections, ...extraContext.extraSections];
const output = path.join(root, 'code');
fs.mkdirSync(output, { recursive: true });

for (const old of fs.readdirSync(output)) {
  if (old.toLowerCase().endsWith('.r')) fs.unlinkSync(path.join(output, old));
}

const safeName = value => value.replace(/[\\/:*?"<>|]/g, '_');
let written = 0;
for (const section of sections) {
  if (section.lang === 'MATLAB') continue;
  const filename = safeName(section.no + '_' + section.title) + '.R';
  fs.writeFileSync(path.join(output, filename), '\uFEFF' + section.code.trim() + '\n', 'utf8');
  written++;
}

console.log('已生成 ' + written + ' 个 R 源文件：' + output);
