import {readFileSync} from 'node:fs';
const read = (locale) => JSON.parse(readFileSync(new URL('../messages/' + locale + '.json', import.meta.url), 'utf8'));
const flatten = (object, prefix = '') => Object.entries(object).flatMap(([key,value]) => typeof value === 'object' ? flatten(value, prefix + key + '.') : [prefix + key]);
const ko = flatten(read('ko')); const en = flatten(read('en'));
const missing = ko.filter(key => !en.includes(key)); const extra = en.filter(key => !ko.includes(key));
if (missing.length || extra.length) {console.error({missing, extra}); process.exit(1);}
console.log('Korean / English message keys match (' + ko.length + ' keys).');
