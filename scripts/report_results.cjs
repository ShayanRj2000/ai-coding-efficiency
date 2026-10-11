const fs = require('node:fs');
const path = require('node:path');
const {writeJson, writeText, sha256} = require('./artifacts.cjs');
const root = path.resolve(__dirname, '..');
const numeric = value => typeof value === 'number' && Number.isFinite(value);
function median(values) {
  if (!values.length || values.some(value => !numeric(value))) return null;
  const sorted = [...values].sort((a,b) => a-b), middle = Math.floor(sorted.length/2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
}
const total = run => numeric(run.usage?.input_tokens) && numeric(run.usage?.output_tokens)
  ? run.usage.input_tokens + run.usage.output_tokens : null;
const display = (value, decimals=0) => numeric(value) ? value.toFixed(decimals) : 'unknown';

function main() {
  const runId = process.argv[2];
  if (!runId || !/^[A-Za-z0-9_-]+$/.test(runId)) throw new Error('Usage: npm run report:002 -- RUN_ID');
  const directory = path.join(root, 'experiment-002', 'test-results', runId);
  const raw = fs.readFileSync(path.join(directory, 'model-trials.json'));
  const trials = JSON.parse(raw);
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'context-metrics.json')));
  if (!trials.finished_at_utc || trials.runs.length !== 6) throw new Error('Six completed runs are required for this report');
  if (JSON.stringify(trials.runs.map(run => [run.trial,run.condition])) !== JSON.stringify(trials.settings.order)) throw new Error('Recorded run order differs from the frozen protocol');
  const conditions = {};
  for (const condition of ['A','B']) {
    const runs = trials.runs.filter(run => run.condition === condition);
    if (runs.length !== 3) throw new Error('Three runs per condition are required');
    conditions[condition] = {prompt_bytes:manifest.conditions[condition].bytes,
      passed:runs.filter(run => run.correctness && run.valid_execution).length,
      valid_executions:runs.filter(run => run.valid_execution).length,
      median_input:median(runs.map(run => run.usage?.input_tokens)),
      median_cached_input:median(runs.map(run => run.usage?.cached_input_tokens)),
      median_output:median(runs.map(run => run.usage?.output_tokens)),
      median_reasoning_output:median(runs.map(run => run.usage?.reasoning_output_tokens)),
      median_total:median(runs.map(total)), median_seconds:median(runs.map(run => run.elapsed_seconds))};
  }
  const pairs = [1,2,3].map(trial => {
    const a = trials.runs.find(run => run.trial === trial && run.condition === 'A');
    const b = trials.runs.find(run => run.trial === trial && run.condition === 'B');
    return {trial, order:trials.runs.filter(run => run.trial === trial).map(run => run.condition).join('/'),
      total_A:total(a), total_B:total(b),
      total_B_minus_A:numeric(total(a)) && numeric(total(b)) ? total(b)-total(a) : null,
      seconds_B_minus_A:b.elapsed_seconds-a.elapsed_seconds};
  });
  const summary = {experiment:'002', run_id:runId, source_sha256:sha256(raw),
    generated_at_utc:new Date().toISOString(), conditions, pairs,
    byte_reduction:conditions.A.prompt_bytes-conditions.B.prompt_bytes,
    byte_reduction_percent:100*(conditions.A.prompt_bytes-conditions.B.prompt_bytes)/conditions.A.prompt_bytes,
    measurement:'Whole-run Codex CLI totals; cached input is included in input and reasoning is included in output. No isolated prompt token or monetary measurement.',
    correctness_scope:'Strict TypeScript compilation including Angular imports/decorators, unchanged exported API, eleven business cases with frozen inputs, facade consumption, fresh snapshots. No browser or Angular template compilation.'};
  writeJson(path.join(directory,'summary.json'),summary);
  const relative = `experiment-002/test-results/${runId}`;
  const a = conditions.A, b = conditions.B;
  let observation = 'Token usage was unavailable for at least one run, so no token comparison is made.';
  if (numeric(a.median_total) && numeric(b.median_total)) {
    observation = b.median_total >= a.median_total
      ? 'Token savings were not demonstrated: B had equal or higher median input + output usage in these runs.'
      : 'B had lower observed median whole-run input + output usage in these runs. This does not isolate tokens attributable to context selection or establish general savings.';
  }
  const section = `<!-- experiment-002:start -->
## Experiment 002: Angular order exposure

Run \`${runId}\` completed at ${trials.finished_at_utc}. The task groups outstanding buy/sell exposure by symbol, filters account/status/symbols, accounts for partial fills, preserves immutable inputs, and feeds an Angular component through a facade. A includes all 13 fixture files; B includes the same eight relevant files. Both use ${trials.settings.model}, ${trials.settings.reasoning_effort} reasoning, ${trials.cli_version}, identical instructions and acceptance checks, fresh ephemeral sessions, disabled shell/web tools, and zero project instructions. Execution order was A/B, B/A, A/B; correction turns were zero.

| Measurement | A: 13 files | B: 8 files |
| --- | ---: | ---: |
| Saved prompt bytes | ${a.prompt_bytes} | ${b.prompt_bytes} |
| Valid executions | ${a.valid_executions}/3 | ${b.valid_executions}/3 |
| Patches passing acceptance | ${a.passed}/3 | ${b.passed}/3 |
| Median input tokens | ${display(a.median_input)} | ${display(b.median_input)} |
| Median cached input tokens | ${display(a.median_cached_input)} | ${display(b.median_cached_input)} |
| Median output tokens | ${display(a.median_output)} | ${display(b.median_output)} |
| Median reasoning output tokens | ${display(a.median_reasoning_output)} | ${display(b.median_reasoning_output)} |
| Median input + output tokens | ${display(a.median_total)} | ${display(b.median_total)} |
| Median elapsed seconds | ${display(a.median_seconds,2)} | ${display(b.median_seconds,2)} |

Prompt bytes decreased by ${summary.byte_reduction} (${summary.byte_reduction_percent.toFixed(1)}%). ${observation} These are whole-run Codex totals; differences are not attributed to context selection. Cache state was not controlled. Three pairs on one synthetic domain task provide limited evidence; cost was not measured.

| Trial | Condition | Input | Cached input | Output | Reasoning output | Input + output | Seconds | Acceptance |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
${trials.runs.map(run => `| ${run.trial} | ${run.condition} | ${display(run.usage?.input_tokens)} | ${display(run.usage?.cached_input_tokens)} | ${display(run.usage?.output_tokens)} | ${display(run.usage?.reasoning_output_tokens)} | ${display(total(run))} | ${display(run.elapsed_seconds,2)} | ${run.correctness && run.valid_execution ? 'pass' : 'fail'} |`).join('\n')}

| Pair | Order | B minus A input + output | B minus A seconds |
| --- | --- | ---: | ---: |
${pairs.map(pair => `| ${pair.trial} | ${pair.order} | ${display(pair.total_B_minus_A)} | ${display(pair.seconds_B_minus_A,2)} |`).join('\n')}

Acceptance includes strict TypeScript compilation with the pinned compiler and Angular declarations, unchanged exported API, eleven business cases with frozen inputs, facade consumption, and fresh snapshots. The verifier was checked against the intentionally broken baseline, an independent reference fix, and a partial-fill regression before any model runs. Browser rendering and Angular template compilation were not tested.

Evidence: [raw usage/settings](${relative}/model-trials.json), [derived summary](${relative}/summary.json), [frozen context hashes](${relative}/context-metrics.json), and individual response, JSONL event, stderr, and acceptance files beside them. Original fixture snapshots and patched verification copies are retained. The [protocol](experiment-002/protocol.json) describes the predeclared controls.
<!-- experiment-002:end -->`;
  const filename = path.join(root,'RESULTS.md');
  const previous = fs.readFileSync(filename,'utf8').replace(/\r\n?/g,'\n');
  const marker = /<!-- experiment-002:start -->[\s\S]*?<!-- experiment-002:end -->/;
  writeText(filename, marker.test(previous) ? previous.replace(marker,section) : previous.trimEnd()+'\n\n'+section+'\n');
  console.log(JSON.stringify(summary,null,2));
}
if (require.main === module) {try {main();} catch(error) {console.error(error.message);process.exitCode=1;}}
module.exports = {median};
