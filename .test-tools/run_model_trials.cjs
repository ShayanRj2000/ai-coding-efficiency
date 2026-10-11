// Run independent model trials using identical settings and exact stdin payloads.
const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'experiment-001', 'test-results', '2026-10-11');
if (fs.existsSync(path.join(out, 'model-trials.json'))) throw new Error('Experiment 001 evidence is immutable. Use npm run experiment:002 for new trials.');
const cli = path.join(process.env.APPDATA, 'npm', 'node_modules', '@openai', 'codex', 'bin', 'codex.js');
const sandbox = path.join(out, 'model-sandbox');
fs.mkdirSync(sandbox, {recursive: true});
const settings = {
  model: 'gpt-6.1-sol', reasoning_effort: 'xhigh', cli_version: '0.160.0',
  shell_tools: false, web_search: 'disabled', user_config_loaded: false,
  project_instructions_bytes: 0, fresh_session_per_run: true,
  date: '2026-10-11', cache_state: 'not forced; reported cached tokens retained',
};
const summary = {settings, runs: []};
function save() { fs.writeFileSync(path.join(out, 'model-trials.json'), JSON.stringify(summary, null, 2) + '\n'); }
function run(trial, condition) {
  return new Promise(resolve => {
    const name = `trial-${trial}-${condition}`;
    const payload = fs.readFileSync(path.join(out, `prompt-${condition}.md`));
    const args = [cli, 'exec', '--ignore-user-config', '--ephemeral', '--skip-git-repo-check',
      '--sandbox', 'read-only', '--json', '--color', 'never', '--model', settings.model,
      '-c', 'model_reasoning_effort="xhigh"', '-c', 'project_doc_max_bytes=0',
      '-c', 'features.shell_tool=false', '-c', 'features.unified_exec=false',
      '-c', 'web_search="disabled"', '-C', sandbox,
      '--output-last-message', path.join(out, `${name}-response.md`), '-'];
    const started = process.hrtime.bigint();
    const child = spawn(process.execPath, args, {cwd: sandbox, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']});
    let stdout = '', stderr = '';
    child.stdout.on('data', chunk => { stdout += chunk.toString(); });
    child.stderr.on('data', chunk => { stderr += chunk.toString(); });
    child.stdin.on('error', () => {});
    child.stdin.end(payload);
    const timeout = setTimeout(() => child.kill(), 180000);
    child.on('error', error => { stderr += error.message; });
    child.on('close', (code, signal) => {
      clearTimeout(timeout);
      fs.writeFileSync(path.join(out, `${name}-events.jsonl`), stdout);
      fs.writeFileSync(path.join(out, `${name}-stderr.txt`), stderr);
      const events = stdout.trim().split(/\r?\n/).filter(Boolean).map(line => {
        try { return JSON.parse(line); } catch { return {type: 'unparsed', text: line}; }
      });
      const completed = events.filter(event => event.type === 'turn.completed');
      const toolCalls = events.filter(event => event.type === 'item.completed' && event.item && !['agent_message', 'reasoning'].includes(event.item.type));
      const record = {
        trial, condition, exit_code: code, signal, elapsed_seconds: Number(process.hrtime.bigint() - started) / 1e9,
        context_bytes: payload.length, usage: completed.at(-1)?.usage ?? null,
        correction_turns: 0, tool_calls: toolCalls.map(event => event.item.type),
        completed: code === 0 && completed.length === 1 && toolCalls.length === 0,
        response: `${name}-response.md`, events: `${name}-events.jsonl`,
        errors: events.filter(event => ['error', 'turn.failed'].includes(event.type)),
      };
      summary.runs.push(record); save();
      console.log(JSON.stringify(record));
      resolve(record);
    });
  });
}
(async () => {
  save();
  for (const [trial, condition] of [[1,'A'],[1,'B'],[2,'B'],[2,'A'],[3,'A'],[3,'B']]) {
    console.log(`Starting trial ${trial}, condition ${condition}...`);
    const record = await run(trial, condition);
    if (!record.completed && !record.usage) {
      console.log('Stopped: the model runner did not complete a turn; failure evidence was saved.');
      break;
    }
  }
})().catch(error => { console.error(error.message); process.exitCode = 1; });
