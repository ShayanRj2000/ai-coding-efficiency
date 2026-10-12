const fs = require('node:fs');
const path = require('node:path');
const {spawn,spawnSync,execFileSync} = require('node:child_process');
const assert = require('node:assert/strict');
const {writeJson,writeText,metrics,sha256} = require('./artifacts.cjs');
const {codexEntry} = require('./run_experiment.cjs');
const {parseResponse} = require('./ticket_response.cjs');
const {verify} = require('./ticket_acceptance.cjs');
const root = path.resolve(__dirname,'..');
const experiment = path.join(root,'experiment-003');
const codeFiles = ['scripts/ticket_response.cjs','scripts/ticket_acceptance.cjs','scripts/verification.cjs',
  'scripts/artifacts.cjs','scripts/run_experiment_003.cjs','package.json','package-lock.json'];
async function main() {
  const runId = process.argv[2];
  if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Usage: npm run experiment:003 -- UNIQUE_RUN_ID');
  const protocolBytes = fs.readFileSync(path.join(experiment,'protocol.json'));
  const protocol = JSON.parse(protocolBytes);
  const manifestBytes = fs.readFileSync(path.join(experiment,'context-metrics.json'));
  const manifest = JSON.parse(manifestBytes);
  assert.equal(sha256(protocolBytes),manifest.protocol_sha256,'Protocol changed after preparation');
  const prompts = Object.fromEntries('ABC'.split('').map(c=>[c,fs.readFileSync(path.join(experiment,`prompt-${c}.md`))]));
  const hashes = Object.fromEntries(codeFiles.map(name=>[name,sha256(fs.readFileSync(path.join(root,name)))]));
  function frozen() {
    assert.equal(sha256(fs.readFileSync(path.join(experiment,'protocol.json'))),manifest.protocol_sha256);
    for (const [name,hash] of Object.entries(manifest.fixture_files)) assert.equal(sha256(fs.readFileSync(path.join(experiment,'fixture',name))),hash,'Fixture changed: '+name);
    for (const c of 'ABC') {
      assert.equal(prompts[c].length,manifest.conditions[c].bytes);
      assert.equal(sha256(prompts[c]),manifest.conditions[c].sha256);
      assert.equal(sha256(fs.readFileSync(path.join(experiment,`prompt-${c}.md`))),manifest.conditions[c].sha256);
    }
    for (const [name,hash] of Object.entries(hashes)) assert.equal(sha256(fs.readFileSync(path.join(root,name))),hash,'Execution or acceptance code changed: '+name);
  }
  frozen();
  const out = path.join(experiment,'test-results',runId);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.mkdirSync(out); // Refuse to overwrite even an incomplete run.
  const sandbox = path.join(out,'model-sandbox');
  fs.mkdirSync(sandbox);
  fs.writeFileSync(path.join(out,'protocol.json'),protocolBytes);
  fs.writeFileSync(path.join(out,'context-metrics.json'),manifestBytes);
  fs.copyFileSync(path.join(experiment,'task.md'),path.join(out,'task.md'));
  for (const c of 'ABC') fs.writeFileSync(path.join(out,`prompt-${c}.md`),prompts[c]);
  const filenames = Object.keys(manifest.fixture_files);
  for (const [base,names] of [[root,codeFiles],[path.join(experiment,'fixture'),filenames]]) {
    for (const name of names) {
      const target = path.join(out,base===root ? 'execution' : 'fixture',name);
      fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(base,name),target);
    }
  }
  const result = {experiment:'003',run_id:runId,status:'running',started_at_utc:new Date().toISOString(),
    timezone:'Asia/Tehran',pre_run_commit:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
    settings:protocol,fixture_sha256:manifest.fixture_sha256,code_sha256:hashes,node_version:process.version,
    usage_source:'Codex CLI turn.completed events; whole-run totals',cache_state:'not controlled',runs:[]};
  const save = ()=>writeJson(path.join(out,'model-trials.json'),result);
  save();
  let cli;
  try {
    cli = codexEntry();
    const version = spawnSync(process.execPath,[cli,'--version'],{encoding:'utf8',windowsHide:true});
    if (version.status !== 0) throw new Error('Codex CLI version check failed');
    result.cli_version=version.stdout.trim();result.cli_entry_sha256=sha256(fs.readFileSync(cli));save();
  } catch(error) {result.status='pending';result.pending_reason=error.message;save();console.log('Model access unavailable; results pending.');return;}
  for (const [trial,condition] of protocol.order) {
    frozen();assert.equal(sha256(fs.readFileSync(cli)),result.cli_entry_sha256);
    const name=`trial-${trial}-${condition}`;
    const responsePath=path.join(out,`${name}-response.md`);
    const args=[cli,'exec','--ignore-user-config','--ephemeral','--skip-git-repo-check','--sandbox',protocol.sandbox,
      '--json','--color','never','--model',protocol.model,'-c',`model_reasoning_effort="${protocol.reasoning_effort}"`,
      '-c','project_doc_max_bytes=0','-c','features.shell_tool=false','-c','features.unified_exec=false','-c','web_search="disabled"',
      '-C',sandbox,'--output-last-message',responsePath,'-'];
    console.log(`Starting ${name}: ${prompts[condition].length} saved prompt bytes`);
    const startedAt=new Date().toISOString(), started=process.hrtime.bigint();
    const execution=await new Promise(resolve=>{
      const child=spawn(process.execPath,args,{cwd:sandbox,windowsHide:true,stdio:['pipe','pipe','pipe']});
      const stdout=[],stderr=[];let timedOut=false;
      child.stdout.on('data',chunk=>stdout.push(chunk));child.stderr.on('data',chunk=>stderr.push(chunk));
      child.stdin.on('error',()=>{});child.stdin.end(prompts[condition]);
      child.on('error',error=>stderr.push(Buffer.from(error.message)));
      const timer=setTimeout(()=>{timedOut=true;
        if(process.platform==='win32') spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
        else child.kill('SIGTERM');
      },protocol.timeout_seconds*1000);
      child.on('close',(code,signal)=>{clearTimeout(timer);resolve({code,signal,timedOut,stdout:Buffer.concat(stdout).toString('utf8'),stderr:Buffer.concat(stderr).toString('utf8')});});
    });
    const elapsed=Number(process.hrtime.bigint()-started)/1e9;
    writeText(path.join(out,`${name}-events.jsonl`),execution.stdout);
    writeText(path.join(out,`${name}-stderr.txt`),execution.stderr);
    const events=execution.stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>{try{return JSON.parse(line);}catch{return {type:'unparsed',text:line};}});
    const turns=events.filter(e=>e.type==='turn.completed');
    const tools=events.filter(e=>e.type==='item.completed' && e.item && !['reasoning','agent_message'].includes(e.item.type));
    const record={trial,condition,started_at_utc:startedAt,elapsed_seconds:elapsed,context_bytes:prompts[condition].length,
      cli_arguments:args.slice(1),exit_code:execution.code,signal:execution.signal,timed_out:execution.timedOut,
      valid_execution:execution.code===0 && turns.length===1 && tools.length===0,tool_calls:tools.map(e=>e.item.type),
      correction_turns:0,usage:turns.at(-1)?.usage ?? null,response:`${name}-response.md`,events:`${name}-events.jsonl`,
      errors:events.filter(e=>['error','turn.failed','unparsed'].includes(e.type)),correctness:null};
    result.runs.push(record);save();
    if (fs.existsSync(responsePath)) {
      writeText(responsePath,fs.readFileSync(responsePath,'utf8'));record.response_metrics=metrics(responsePath);
    }
    if (!record.valid_execution) {
      result.status='pending';result.pending_reason='A model execution did not complete under the declared settings; remaining trials were not invented.';
      save();console.log(JSON.stringify(record));console.log('Execution unavailable or invalid; experiment pending.');return;
    }
    try {
      const response=parseResponse(fs.readFileSync(responsePath,'utf8'));
      record.response_format=true;record.model_notes=response.notes;
      const acceptance=verify({fixture:path.join(out,'fixture'),destination:path.join(out,'verification',name),filenames,sources:response.files});
      record.correctness=acceptance.passed;record.acceptance=`${name}-acceptance.json`;
      record.failed_checks=Object.entries(acceptance.checks).filter(([,passed])=>!passed).map(([name])=>name);
      writeJson(path.join(out,record.acceptance),acceptance);
    } catch(error) {record.correctness=false;record.verification_error=error.message;record.response_format ??= false;}
    save();console.log(JSON.stringify({trial,condition,elapsed_seconds:elapsed,usage:record.usage,correctness:record.correctness,failed_checks:record.failed_checks,verification_error:record.verification_error}));
  }
  result.status='complete';result.finished_at_utc=new Date().toISOString();save();
  console.log(`Completed ${result.runs.length} trials; ${result.runs.filter(r=>r.correctness && r.valid_execution).length} passed acceptance.`);
}
if(require.main===module) main().catch(error=>{console.error(error.message);process.exitCode=1;});
