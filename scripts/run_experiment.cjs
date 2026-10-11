const fs = require('node:fs');
const path = require('node:path');
const {spawn, spawnSync} = require('node:child_process');
const {writeText, writeJson, sha256, metrics} = require('./artifacts.cjs');
const {applyPatch} = require('./verification.cjs');
const {verify, targetFile} = require('./exposure_acceptance.cjs');
const root = path.resolve(__dirname,'..');
const experiment = path.join(root,'experiment-002');

function codexEntry() {
  const override = process.env.CODEX_CLI_JS;
  if (override) return path.resolve(override);
  const npm = spawnSync(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['root','-g'], {
    encoding:'utf8', shell:process.platform === 'win32', windowsHide:true,
  });
  if (npm.status !== 0) throw new Error('Could not locate global npm modules; set CODEX_CLI_JS to the installed Codex entry point');
  const filename = path.join(npm.stdout.trim(),'@openai','codex','bin','codex.js');
  if (!fs.existsSync(filename)) throw new Error('Install the Codex CLI or set CODEX_CLI_JS');
  return filename;
}

async function main() {
  const runId = process.argv[2];
  if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Usage: npm run experiment:002 -- UNIQUE_RUN_ID');
  const out = path.join(experiment,'test-results',runId);
  const protocolBytes = fs.readFileSync(path.join(experiment,'protocol.json'));
  const protocol = JSON.parse(protocolBytes);
  const manifest = JSON.parse(fs.readFileSync(path.join(experiment,'context-metrics.json'),'utf8'));
  if (sha256(protocolBytes) !== manifest.protocol_sha256) throw new Error('Protocol changed after preparation');
  for (const [name,expected] of Object.entries(manifest.fixture_files)) {
    if (sha256(fs.readFileSync(path.join(experiment,'fixture',name))) !== expected) throw new Error(`Fixture changed after preparation: ${name}`);
  }
  const prompts = Object.fromEntries(['A','B'].map(condition => {
    const payload = fs.readFileSync(path.join(experiment,`prompt-${condition}.md`));
    if (sha256(payload) !== manifest.conditions[condition].sha256 || payload.length !== manifest.conditions[condition].bytes) throw new Error('Prompt bytes do not match saved metrics');
    return [condition,payload];
  }));
  const cli = codexEntry();
  const version = spawnSync(process.execPath,[cli,'--version'],{encoding:'utf8',windowsHide:true});
  if (version.status !== 0) throw new Error('Codex CLI version check failed');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.mkdirSync(out); // Refuse to overwrite any existing run, including partial failures.
  const sandbox = path.join(out,'model-sandbox');
  fs.mkdirSync(sandbox);
  for (const filename of ['artifacts.cjs','verification.cjs','exposure_acceptance.cjs']) {
    const target = path.join(out,'verifier',filename);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(__dirname,filename),target);
  }
  writeJson(path.join(out,'protocol.json'),protocol);
  writeJson(path.join(out,'context-metrics.json'),manifest);
  for (const condition of ['A','B']) fs.writeFileSync(path.join(out,`prompt-${condition}.md`),prompts[condition]);
  const filenames = Object.keys(manifest.fixture_files);
  for (const name of filenames) {
    fs.mkdirSync(path.dirname(path.join(out,'fixture',name)),{recursive:true});
    fs.copyFileSync(path.join(experiment,'fixture',name),path.join(out,'fixture',name));
  }
  const summary = {
    experiment:'002', run_id:runId, started_at_utc:new Date().toISOString(), timezone:'Asia/Tehran',
    settings:protocol, cli_version:version.stdout.trim(), node_version:process.version,
    fixture_sha256:manifest.fixture_sha256,
    acceptance_sha256:sha256(fs.readFileSync(path.join(__dirname,'exposure_acceptance.cjs'))),
    verifier_sha256:sha256(fs.readFileSync(path.join(__dirname,'verification.cjs'))),
    package_lock_sha256:sha256(fs.readFileSync(path.join(root,'package-lock.json'))),
    usage_source:'Codex CLI turn.completed JSONL events; whole-run usage',
    cache_state:'not forced; fresh sessions do not guarantee a cold cache', runs:[],
  };
  const save = () => writeJson(path.join(out,'model-trials.json'),summary);
  save();
  for (const [trial,condition] of protocol.order) {
    const name = `trial-${trial}-${condition}`;
    console.log(`Starting ${name} (${prompts[condition].length} prompt bytes)`);
    const args = [cli,'exec','--ignore-user-config','--ephemeral','--skip-git-repo-check',
      '--sandbox',protocol.sandbox,'--json','--color','never','--model',protocol.model,
      '-c',`model_reasoning_effort="${protocol.reasoning_effort}"`,'-c','project_doc_max_bytes=0',
      '-c','features.shell_tool=false','-c','features.unified_exec=false','-c','web_search="disabled"',
      '-C',sandbox,'--output-last-message',path.join(out,`${name}-response.md`),'-'];
    const started = process.hrtime.bigint();
    const execution = await new Promise(resolve => {
      const child = spawn(process.execPath,args,{cwd:sandbox,windowsHide:true,stdio:['pipe','pipe','pipe']});
      const stdoutChunks=[], stderrChunks=[];
      let timedOut=false;
      child.stdout.on('data',chunk => {stdoutChunks.push(chunk);});
      child.stderr.on('data',chunk => {stderrChunks.push(chunk);});
      child.stdin.on('error',() => {});
      child.stdin.end(prompts[condition]);
      child.on('error',error => {stderrChunks.push(Buffer.from(error.message));});
      const timer = setTimeout(() => {
        timedOut=true;
        if (process.platform === 'win32') spawn('taskkill',['/PID',String(child.pid),'/T','/F'],{windowsHide:true,stdio:'ignore'});
        else child.kill('SIGTERM');
      },protocol.timeout_seconds*1000);
      child.on('close',(code,signal) => {
        clearTimeout(timer);
        resolve({stdout:Buffer.concat(stdoutChunks).toString('utf8'),stderr:Buffer.concat(stderrChunks).toString('utf8'),code,signal,timedOut});
      });
    });
    const elapsed = Number(process.hrtime.bigint()-started)/1e9;
    writeText(path.join(out,`${name}-events.jsonl`),execution.stdout);
    writeText(path.join(out,`${name}-stderr.txt`),execution.stderr);
    const events = execution.stdout.trim().split(/\r?\n/).filter(Boolean).map(line => {
      try {return JSON.parse(line);} catch {return {type:'unparsed',text:line};}
    });
    const turns = events.filter(event => event.type === 'turn.completed');
    const calls = events.filter(event => event.type === 'item.completed' && event.item && !['reasoning','agent_message'].includes(event.item.type));
    const record = {trial,condition,elapsed_seconds:elapsed,context_bytes:prompts[condition].length,
      cli_arguments:args.slice(1),
      exit_code:execution.code,signal:execution.signal,timed_out:execution.timedOut,
      usage:turns.at(-1)?.usage ?? null,correction_turns:0,tool_calls:calls.map(event=>event.item.type),
      valid_execution:execution.code===0 && turns.length===1 && calls.length===0,
      response:`${name}-response.md`,events:`${name}-events.jsonl`,errors:events.filter(event=>['error','turn.failed'].includes(event.type)),
    };
    summary.runs.push(record); save(); // Preserve execution evidence even if verification fails.
    try {
      const responsePath = path.join(out,record.response);
      const response = fs.readFileSync(responsePath,'utf8');
      writeText(responsePath,response);
      record.response_metrics=metrics(responsePath);
      const original = fs.readFileSync(path.join(out,'fixture',targetFile),'utf8');
      const patched = applyPatch(original,response,targetFile);
      const verification = verify({fixture:path.join(out,'fixture'),destination:path.join(out,'verification',name),filenames,source:patched});
      record.correctness=verification.passed;
      record.acceptance=`${name}-acceptance.json`;
      writeJson(path.join(out,record.acceptance),verification);
    } catch (error) {record.correctness=false;record.verification_error=error.message;}
    save();
    console.log(JSON.stringify(record));
  }
  summary.finished_at_utc=new Date().toISOString();
  save();
  console.log(`Finished ${summary.runs.length} runs; ${summary.runs.filter(run=>run.correctness && run.valid_execution).length} valid patches passed acceptance.`);
}
if (require.main === module) main().catch(error => {console.error(error.message);process.exitCode=1;});
module.exports = {codexEntry};
