/* Roda todos os grupos de teste e mostra o total. Uso: node tests/run-all.js */
const { spawnSync } = require('child_process'),
  fs = require('fs'),
  path = require('path');
const files = fs
  .readdirSync(__dirname)
  .filter((f) => /^g\d+_.*\.js$/.test(f))
  .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
let pass = 0,
  fail = 0;
const rows = [];
for (const f of files) {
  const r = spawnSync('node', [path.join(__dirname, f)], {
    encoding: 'utf8',
    timeout: 280000,
    env: process.env,
  });
  const line = (r.stdout || '').trim().split('\n').pop();
  let d;
  try {
    d = JSON.parse(line);
  } catch (e) {
    d = { group: f, pass: 0, fail: 1, fails: ['sem resultado: ' + (r.stderr || '').slice(0, 200)] };
  }
  if (d.crash) {
    d.fail = 1;
    d.fails = [d.crash];
  }
  pass += d.pass || 0;
  fail += d.fail || 0;
  rows.push(d);
  console.log((d.fail ? 'FALHOU ' : 'ok     ') + String(d.pass || 0).padStart(6) + '  ' + d.group);
  (d.fails || []).slice(0, 5).forEach((x) => console.log('         - ' + x));
}
console.log('\nTOTAL: ' + (pass + fail) + ' verificações, ' + fail + ' falhas');
process.exit(fail ? 1 : 0);
