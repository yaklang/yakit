#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function flatten(obj, prefix = '') {
  const out = [];
  if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
    for (const k of Object.keys(obj)) {
      const np = prefix ? `${prefix}.${k}` : k;
      out.push(...flatten(obj[k], np));
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((v, i) => out.push(...flatten(v, `${prefix}[${i}]`)));
  } else if (prefix) {
    out.push(prefix);
  }
  return out;
}

const root = process.cwd();
const enDir = path.join(root, 'app/renderer/src/main/public/locales/en');
const zhDir = path.join(root, 'app/renderer/src/main/public/locales/zh');

function listJson(dir) {
  return fs.readdirSync(dir).filter(f => f.endsWith('.json'));
}

let hasDiff = false;
const files = listJson(enDir).filter(f => fs.existsSync(path.join(zhDir, f)));

for (const f of files) {
  const enPath = path.join(enDir, f);
  const zhPath = path.join(zhDir, f);
  const en = readJSON(enPath);
  const zh = readJSON(zhPath);
  const enKeys = Array.from(new Set(flatten(en))).sort();
  const zhKeys = Array.from(new Set(flatten(zh))).sort();
  const missingInEn = zhKeys.filter(k => !enKeys.includes(k));
  const missingInZh = enKeys.filter(k => !zhKeys.includes(k));
  if (missingInEn.length || missingInZh.length) {
    hasDiff = true;
    console.log(`\n[${f}]`);
    if (missingInEn.length) {
      console.log('  Missing in EN:');
      missingInEn.forEach(k => console.log(`   - ${k}`));
    }
    if (missingInZh.length) {
      console.log('  Missing in ZH:');
      missingInZh.forEach(k => console.log(`   - ${k}`));
    }
  }
}

if (!hasDiff) {
  console.log('Locale parity check passed: EN and ZH keys match for all files.');
} else {
  process.exitCode = 1;
}
