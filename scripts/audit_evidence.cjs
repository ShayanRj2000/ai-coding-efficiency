const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {execFileSync} = require('node:child_process');
const {writeJson, metrics, sha256} = require('./artifacts.cjs');
const root = path.resolve(__dirname,'..');
const runId = process.argv[2];
if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Usage: node scripts/audit_evidence.cjs RUN_ID');
const directory = path.join(root,'experiment-002','test-results',runId);
const trials = JSON.parse(fs.readFileSync(path.join(directory,'model-trials.json')));
const manifest = JSON.parse(fs.readFileSync(path.join(directory,'context-metrics.json')));
assert.equal(trials.runs.length,6);
assert.ok(trials.finished_at_utc);
assert.deepEqual(trials.runs.map(run => [run.trial,run.condition]),trials.settings.order);
assert.equal(sha256(fs.readFileSync(path.join(root,'experiment-002/protocol.json'))),manifest.protocol_sha256);
for (const condition of ['A','B']) {
  const saved = fs.readFileSync(path.join(directory,`prompt-${condition}.md`));
  const expected = manifest.conditions[condition];
  assert.equal(saved.length,expected.bytes);
  assert.equal(sha256(saved),expected.sha256);
  assert.ok(!saved.includes(13));
}
for (const [name,hash] of Object.entries(manifest.fixture_files)) {
  assert.equal(sha256(fs.readFileSync(path.join(directory,'fixture',name))),hash);
  assert.equal(sha256(fs.readFileSync(path.join(root,'experiment-002/fixture',name))),hash);
}
for (const [filename,hash] of [['exposure_acceptance.cjs',trials.acceptance_sha256],['verification.cjs',trials.verifier_sha256]]) {
  assert.equal(sha256(fs.readFileSync(path.join(directory,'verifier',filename))),hash);
  assert.equal(sha256(fs.readFileSync(path.join(root,'scripts',filename))),hash);
}
assert.equal(sha256(fs.readFileSync(path.join(root,'package-lock.json'))),trials.package_lock_sha256);
for (const run of trials.runs) {
  const events = fs.readFileSync(path.join(directory,run.events),'utf8').trim().split('\n').map(JSON.parse);
  const completed = events.filter(event => event.type === 'turn.completed');
  assert.deepEqual(run.usage,completed.at(-1)?.usage ?? null);
  assert.equal(run.context_bytes,manifest.conditions[run.condition].bytes);
  assert.equal(run.correction_turns,0);
  if (run.response_metrics) assert.deepEqual(metrics(path.join(directory,run.response)),run.response_metrics);
  if (run.acceptance) {
    const acceptance = JSON.parse(fs.readFileSync(path.join(directory,run.acceptance)));
    assert.equal(run.correctness,acceptance.passed);
    assert.equal(acceptance.passed,Object.values(acceptance.checks).every(Boolean));
  }
}
// Compare actual historical bytes with the first experiment's committed tree.
// The initial Git commit normalized two Windows-generated JSON files; retain
// their existing CRLF copies as base64 as well, without rewriting the originals.
const historicalCommit = '424ea803034023f7f6dc0b8082af5df1d64dfe07';
const tree = execFileSync('git',['ls-tree','-r',historicalCommit,'--','experiment-001'],{cwd:root,encoding:'utf8'}).trim().split('\n');
const historical = tree.map(line => {const [entry,name] = line.split('\t');return {name,hash:entry.split(' ')[2]};});
const observed = execFileSync('git',['hash-object','--no-filters',...historical.map(file=>file.name)],{cwd:root,encoding:'utf8'}).trim().split('\n');
const normalizedCopies = [];
const historicalHashes = historical.map((file,index) => {
  const saved = fs.readFileSync(path.join(root,file.name));
  if (observed[index] !== file.hash) {
    const committed = execFileSync('git',['cat-file','blob',file.hash],{cwd:root});
    assert.deepEqual(Buffer.from(saved.toString('utf8').replace(/\r\n/g,'\n')),committed,`Historical content changed: ${file.name}`);
    assert.ok(['experiment-001/test-results/2026-10-11/input-verification.json',
      'experiment-001/test-results/2026-10-11/summary.json'].includes(file.name),'Unexpected historical newline difference');
    normalizedCopies.push({path:file.name,bytes:saved.length,sha256:sha256(saved),git_blob:file.hash,raw_bytes_base64:saved.toString('base64')});
  }
  return {path:file.name,bytes:saved.length,sha256:sha256(saved),git_blob:file.hash,raw_matches_git_blob:observed[index]===file.hash};
});
const archivePath = path.join(root,'validation','2026-10-11','historical-raw-bytes.json');
if (!fs.existsSync(archivePath)) writeJson(archivePath,{
  explanation:'Existing CRLF working copies of two historical JSON files differ only by the LF normalization in the original Git commit. Originals are untouched; base64 retains their exact saved bytes.',
  normalized_copies:normalizedCopies,files:historicalHashes});
const archive = JSON.parse(fs.readFileSync(archivePath));
for (const copy of archive.normalized_copies) {
  const saved = Buffer.from(copy.raw_bytes_base64,'base64');
  assert.equal(saved.length,copy.bytes);
  assert.equal(sha256(saved),copy.sha256);
  assert.deepEqual(Buffer.from(saved.toString('utf8').replace(/\r\n/g,'\n')),execFileSync('git',['cat-file','blob',copy.git_blob],{cwd:root}));
}
const report = {recorded_at_utc:new Date().toISOString(),passed:true,run_id:runId,
  paired_runs:trials.runs.length,usage_matches_raw_events:true,saved_byte_counts_and_hashes_match:true,
  frozen_fixture_protocol_verifier_and_lockfile_match:true,correctness_matches_acceptance:true,
  historical_commit:historicalCommit,historical_content_matches_original_commit:true,
  historical_files_checked:historical.length,historical_raw_bytes_matching_git:historical.length-normalizedCopies.length,
  historical_existing_crlf_copies_archived:archive.normalized_copies.length};
writeJson(path.join(root,'validation','2026-10-11','evidence-integrity.json'),report);
console.log(JSON.stringify(report,null,2));
