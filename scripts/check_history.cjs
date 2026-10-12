const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {sha256, writeJson} = require('./artifacts.cjs');
const root = path.resolve(__dirname,'..');
const destination = path.join(root,'validation/2026-10-12');
const baselinePath = path.join(destination,'history-baseline.json');
const directories = ['experiment-001','experiment-002','validation/2026-10-11'];
function files(directory) {
  return fs.readdirSync(path.join(root,directory),{withFileTypes:true}).flatMap(entry =>
    entry.isDirectory() ? files(directory+'/'+entry.name) : [directory+'/'+entry.name]);
}
function snapshot() {
  return Object.fromEntries(directories.flatMap(files).sort().map(name => {
    const saved = fs.readFileSync(path.join(root,name));
    return [name,{bytes:saved.length,sha256:sha256(saved)}];
  }));
}
if (process.argv.includes('--capture')) {
  assert.ok(!fs.existsSync(baselinePath),'Historical baseline already exists; never overwrite it');
  const results = fs.readFileSync(path.join(root,'RESULTS.md'));
  writeJson(baselinePath,{captured_at_utc:new Date().toISOString(),
    commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    files:snapshot(),results_prefix:{bytes:results.length,sha256:sha256(results)}});
  console.log('Captured historical saved-byte hashes before portfolio changes.');
} else {
  const baseline = JSON.parse(fs.readFileSync(baselinePath));
  assert.deepEqual(snapshot(),baseline.files,'Historical files or raw bytes changed');
  const results = fs.readFileSync(path.join(root,'RESULTS.md'));
  assert.equal(sha256(results.subarray(0,baseline.results_prefix.bytes)),baseline.results_prefix.sha256,'Historical RESULTS text changed');
  const report = {checked_at_utc:new Date().toISOString(),passed:true,baseline_commit:baseline.commit,
    historical_files_unchanged:Object.keys(baseline.files).length,historical_results_prefix_unchanged:true};
  writeJson(path.join(destination,'history-integrity.json'),report);
  console.log(JSON.stringify(report));
}
