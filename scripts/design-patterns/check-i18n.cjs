const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = path.join(__dirname, 'src');
const context = { window: {} };
vm.createContext(context);
for (const name of ['data-creation.js', 'data-behavior.js']) {
  vm.runInContext(fs.readFileSync(path.join(source, name), 'utf8'), context);
}
const patterns = [...context.window.CREATION_PATTERNS, ...context.window.BEHAVIOR_PATTERNS];
const translated = {
  ...JSON.parse(fs.readFileSync(path.join(source, 'en-data.json'), 'utf8')),
  ...JSON.parse(fs.readFileSync(path.join(source, 'en-overrides.json'), 'utf8')),
};
const needed = new Set();
const hasHan = value => /[\u3400-\u9fff]/.test(value);

function collect(value, key = '') {
  if (typeof value === 'string') {
    if (key === 'code') {
      for (const line of value.split('\n')) {
        const hash = line.indexOf('#');
        const before = hash < 0 ? line : line.slice(0, hash);
        const comment = hash < 0 ? '' : line.slice(hash);
        if (hasHan(comment)) needed.add(comment);
        for (const match of before.matchAll(/(["'])([^"'\n]*[\u3400-\u9fff][^"'\n]*)\1/g)) needed.add(match[2]);
      }
    } else if (hasHan(value)) needed.add(value);
  } else if (Array.isArray(value)) value.forEach(item => collect(item));
  else if (value && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) collect(item, name);
  }
}
collect(patterns);

const template = fs.readFileSync(path.join(source, 'template.html'), 'utf8');
const uiDefinition = template.match(/window\.BOOKLET_UI_EN\s*=\s*\{[\s\S]*?\};/);
if (!uiDefinition) throw new Error('Missing BOOKLET_UI_EN in template');
vm.runInContext(uiDefinition[0], context);
const staticKeys = [...template.matchAll(/data-i18n(?:-aria|-placeholder|-content)?="([^"]+)"/g)].map(match => match[1]);
const missingStatic = [...new Set(staticKeys)].filter(key => !context.window.BOOKLET_UI_EN[key]);
const missingData = [...needed].filter(value => !translated[value]);
const untranslated = [...needed].filter(value => translated[value] && hasHan(translated[value]));
if (missingStatic.length || missingData.length || untranslated.length) {
  console.error(JSON.stringify({ missingStatic, missingData, untranslated }, null, 2));
  process.exit(1);
}
console.log(`Checked ${patterns.length} patterns, ${needed.size} data/code strings, ${new Set(staticKeys).size} static UI keys`);
