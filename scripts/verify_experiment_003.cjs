const fs=require('node:fs');
const path=require('node:path');
const assert=require('node:assert/strict');
const {sha256,metrics,writeJson}=require('./artifacts.cjs');
const {parseResponse}=require('./ticket_response.cjs');
const {verify}=require('./ticket_acceptance.cjs');
const root=path.resolve(__dirname,'..');
const directory=path.join(root,'experiment-003/test-results');
let checked=0;
if(fs.existsSync(directory)) for(const entry of fs.readdirSync(directory,{withFileTypes:true}).filter(e=>e.isDirectory())) {
  const runDirectory=path.join(directory,entry.name);
  const trials=JSON.parse(fs.readFileSync(path.join(runDirectory,'model-trials.json')));
  assert.deepEqual(trials.runs.map(r=>[r.trial,r.condition]),trials.settings.order.slice(0,trials.runs.length),'Run order differs from the declared protocol');
  const manifest=JSON.parse(fs.readFileSync(path.join(runDirectory,'context-metrics.json')));
  assert.equal(sha256(fs.readFileSync(path.join(runDirectory,'protocol.json'))),manifest.protocol_sha256);
  for(const [name,hash] of Object.entries(trials.code_sha256)) assert.equal(sha256(fs.readFileSync(path.join(runDirectory,'execution',name))),hash);
  for(const [name,hash] of Object.entries(manifest.fixture_files)) assert.equal(sha256(fs.readFileSync(path.join(runDirectory,'fixture',name))),hash);
  for(const c of 'ABC') {
    const saved=fs.readFileSync(path.join(runDirectory,`prompt-${c}.md`));
    assert.equal(saved.length,manifest.conditions[c].bytes);assert.equal(sha256(saved),manifest.conditions[c].sha256);
  }
  const records=[];
  for(const record of trials.runs) {
    const events=fs.readFileSync(path.join(runDirectory,record.events),'utf8').trim().split('\n').filter(Boolean).map(line=>JSON.parse(line));
    assert.deepEqual(record.usage,events.filter(e=>e.type==='turn.completed').at(-1)?.usage ?? null);
    assert.equal(record.correction_turns,0);
    if(record.response_metrics) assert.deepEqual(metrics(path.join(runDirectory,record.response)),record.response_metrics);
    if(!record.valid_execution) continue; // Pending attempts are evidence, not completed trials.
    let reproduced;
    try {
      const response=parseResponse(fs.readFileSync(path.join(runDirectory,record.response),'utf8'));
      const acceptance=verify({fixture:path.join(runDirectory,'fixture'),destination:path.join(root,'verification/experiment-003',entry.name,`trial-${record.trial}-${record.condition}`),filenames:Object.keys(manifest.fixture_files),sources:response.files});
      reproduced=acceptance.passed;
      if(record.acceptance) {
        const saved=JSON.parse(fs.readFileSync(path.join(runDirectory,record.acceptance)));
        assert.deepEqual(acceptance.checks,saved.checks,'Acceptance checks changed');
      }
    } catch(error) {
      if(record.acceptance) throw error;
      reproduced=false;
    }
    assert.equal(reproduced,record.correctness,'Recorded correctness did not reproduce');
    records.push({trial:record.trial,condition:record.condition,correctness:reproduced});checked++;
  }
  if(trials.status==='complete') {
    assert.equal(records.length,9);assert.deepEqual(trials.runs.map(r=>[r.trial,r.condition]),trials.settings.order);
  }
  writeJson(path.join(root,'verification/experiment-003',entry.name,'reverification.json'),{passed:true,records});
}
console.log(checked ? `Reproduced correctness and raw-usage evidence for ${checked} completed Experiment 003 trials.` : 'Experiment 003 model results pending; no model measurements fabricated.');
