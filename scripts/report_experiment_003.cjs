const fs=require('node:fs');
const path=require('node:path');
const {writeJson,writeText,sha256}=require('./artifacts.cjs');
const {median}=require('./report_results.cjs');
const root=path.resolve(__dirname,'..');
const number=v=>typeof v==='number' && Number.isFinite(v);
const total=r=>number(r.usage?.input_tokens) && number(r.usage?.output_tokens) ? r.usage.input_tokens+r.usage.output_tokens : null;
const display=(v,d=0)=>number(v)?v.toFixed(d):'unknown';
function main() {
  const runId=process.argv[2];
  if(!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Usage: npm run report:003 -- RUN_ID');
  const directory=path.join(root,'experiment-003/test-results',runId);
  const rawPath=path.join(directory,'model-trials.json');
  const trials=fs.existsSync(rawPath)?JSON.parse(fs.readFileSync(rawPath)):null;
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'experiment-003/context-metrics.json')));
  const complete=trials?.status==='complete' && trials.runs.length===9;
  const last=trials?.runs.at(-1);
  const unavailableMessage=last?.errors?.map(e=>e.error?.message || e.message).filter(Boolean).at(-1);
  const pendingExplanation=unavailableMessage ? `Provider reported ${JSON.stringify(unavailableMessage)} The declared model was kept unchanged.` : trials?.pending_reason || 'No model trials have completed yet.';
  const conditions=Object.fromEntries('ABC'.split('').map(c=>{
    const runs=(trials?.runs || []).filter(r=>r.condition===c && r.valid_execution);
    return [c,{prompt_bytes:manifest.conditions[c].bytes,completed_trials:runs.length,
      passed:runs.filter(r=>r.correctness).length,
      median_input:complete?median(runs.map(r=>r.usage?.input_tokens)):null,
      median_cached:complete?median(runs.map(r=>r.usage?.cached_input_tokens)):null,
      median_output:complete?median(runs.map(r=>r.usage?.output_tokens)):null,
      median_reasoning:complete?median(runs.map(r=>r.usage?.reasoning_output_tokens)):null,
      median_total:complete?median(runs.map(total)):null,
      median_seconds:complete?median(runs.map(r=>r.elapsed_seconds)):null}];
  }));
  const summary={experiment:'003',run_id:runId,status:complete?'complete':'pending',conditions,
    source_sha256:trials?sha256(fs.readFileSync(rawPath)):null,
    limitations:['Three trials per condition on one synthetic task','Whole-run CLI totals do not isolate supplied-context tokens',
      'Cache state, provider variance, and backend overhead are uncontrolled','No monetary cost measured',
      'Angular declarations compile; browser rendering and Angular template compilation are not tested',
      'Insufficient context omits known dependencies; models may still infer a correct implementation']};
  if(trials) writeJson(path.join(directory,'summary.json'),summary);
  const columns='ABC'.split('').map(c=>conditions[c]);
  const row=(label,key,decimals=0)=>`| ${label} | ${columns.map(c=>display(c[key],decimals)).join(' | ')} |`;
  const relative=`experiment-003/test-results/${runId}`;
  let section=`<!-- experiment-003:start -->\n## Experiment 003: multi-file ticket parity\n\n`;
  section+=complete
    ? `Nine trials completed at ${trials.finished_at_utc}, using ${trials.settings.model}, ${trials.settings.reasoning_effort} reasoning, and ${trials.cli_version}. Order: A/B/C, B/C/A, C/A/B. Each condition had three fresh sessions and identical instructions/settings/acceptance criteria; correction turns were zero. Protocol and verifier were committed before runs at \`${trials.pre_run_commit}\`.\n\n`
    : `**Results pending.** The protocol, prompts, verifier, reference tests, and runner are prepared. ${pendingExplanation} Completed valid trials so far: ${columns.map(c=>c.completed_trials).join('/')}; no three-condition token or latency comparison is published until all nine finish.\n\n`;
  section+='| Measurement | A: full | B: sufficient focused | C: insufficient focused |\n| --- | ---: | ---: | ---: |\n';
  section+=row('Saved prompt bytes','prompt_bytes')+'\n';
  section+=`| Acceptance | ${columns.map(c=>c.completed_trials ? `${c.passed}/${c.completed_trials} completed` : 'pending').join(' | ')} |\n`;
  section+=['input','cached','output','reasoning','total'].map(key=>row('Median '+({input:'input tokens',cached:'cached input tokens',output:'output tokens',reasoning:'reasoning output tokens',total:'input + output tokens'})[key],'median_'+key)).join('\n')+'\n';
  section+=row('Median elapsed seconds','median_seconds',2)+'\n\n';
  section+='A provides all 16 files. B provides 11 sufficient files. C provides four files and omits the account model, venue policies, gateway contract, examples, facade, and Angular component/template. The omission list was declared before runs. A successful C result would be an observed inference on this task, not proof that those contracts are dispensable.\n\n';
  if(complete) {
    section+='| Trial | Condition | Input | Cached input | Output | Reasoning | Input + output | Seconds | Correctness | Corrections |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |\n';
    section+=trials.runs.map(r=>`| ${r.trial} | ${r.condition} | ${display(r.usage?.input_tokens)} | ${display(r.usage?.cached_input_tokens)} | ${display(r.usage?.output_tokens)} | ${display(r.usage?.reasoning_output_tokens)} | ${display(total(r))} | ${display(r.elapsed_seconds,2)} | ${r.correctness?'pass':'fail'} | ${r.correction_turns} |`).join('\n')+'\n\n';
    const failed=trials.runs.filter(r=>!r.correctness);
    section+=failed.length ? 'Observed failures: '+failed.map(r=>`trial ${r.trial} ${r.condition}: ${r.verification_error || r.failed_checks.join(', ')}`).join('; ')+'.\n\n' : 'All nine returned implementations passed the declared checks.\n\n';
    section+=`Evidence: [raw responses/usage/settings](${relative}/model-trials.json), [derived summary](${relative}/summary.json), and response, event, stderr, and independent acceptance files beside them. Inputs and execution/acceptance code are snapshotted.\n\n`;
  } else if(trials) {
    section+='| Attempt | Execution | Input | Cached input | Output | Reasoning | Input + output | Process seconds | Correctness | Corrections |\n| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- | ---: |\n';
    section+=trials.runs.map(r=>`| ${r.trial} ${r.condition} | ${r.valid_execution?'completed':'unavailable'} | ${display(r.usage?.input_tokens)} | ${display(r.usage?.cached_input_tokens)} | ${display(r.usage?.output_tokens)} | ${display(r.usage?.reasoning_output_tokens)} | ${display(total(r))} | ${display(r.elapsed_seconds,2)} | ${r.valid_execution?(r.correctness?'pass':'fail'):'not measured'} | ${r.correction_turns} |`).join('\n')+'\n\n';
    section+=`[Attempt evidence](${relative}/model-trials.json) retains actual failures and exposed usage. The unavailable attempt's process duration is not a successful model latency measurement. Missing usage stays unknown; unexecuted trials have no invented measurements. A service-capacity error is not evidence about context sufficiency. Retry the complete protocol later with a fresh run ID, retaining this partial run.\n\n`;
  }
  section+='Whole-run input + output is the sum reported for each run before calculating medians. Cached input and reasoning output are already included and are not added again. These measurements do not isolate context-selection effects or demonstrate general efficiency or monetary savings. Acceptance covers strict TypeScript, both unchanged exported APIs, 21 independent business cases, preview/submission/facade parity, frozen inputs and venue policies, and fresh results. Browser behavior and template compilation remain outside scope.\n<!-- experiment-003:end -->\n';
  const resultsPath=path.join(root,'RESULTS.md'), previous=fs.readFileSync(resultsPath,'utf8');
  const marker=/<!-- experiment-003:start -->[\s\S]*?<!-- experiment-003:end -->\n?/;
  const updated=marker.test(previous)?previous.replace(marker,section):previous+'\n'+section;
  fs.writeFileSync(resultsPath,updated,'utf8'); // Keep the historical prefix's original bytes.
  writeText(path.join(root,'experiment-003/STATUS.md'),`# Experiment 003 status\n\n${complete?'Complete: nine model trials recorded.':'Pending: model measurements are not complete.'}\n\nSee [RESULTS.md](../RESULTS.md#experiment-003-multi-file-ticket-parity) and the [protocol](README.md).\n`);
  console.log(JSON.stringify(summary,null,2));
}
if(require.main===module) {try{main();}catch(error){console.error(error.message);process.exitCode=1;}}
