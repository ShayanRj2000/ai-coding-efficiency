// Apply returned patches in separate fixture copies and check the specification.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'experiment-001', 'test-results', '2026-10-11');
const fixture = path.join(root, 'experiment-001', 'fixture');
const tsPath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', '2a59476c9b', 'resources', 'app', 'extensions', 'node_modules', 'typescript', 'lib', 'typescript.js');
const ts = require(tsPath);
const original = fs.readFileSync(path.join(fixture, 'orders.ts'), 'utf8');
const normalize = text => text.replace(/\r\n/g, '\n');
function api(text) {
  const file = ts.createSourceFile('orders.ts', text, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed});
  return file.statements.filter(statement => statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)).map(statement => {
    if (ts.isFunctionDeclaration(statement)) {
      return {name: statement.name?.text, parameters: statement.parameters.map(parameter => printer.printNode(ts.EmitHint.Unspecified, parameter, file)), type: statement.type && printer.printNode(ts.EmitHint.Unspecified, statement.type, file)};
    }
    return printer.printNode(ts.EmitHint.Unspecified, statement, file);
  });
}
function apply(response) {
  const blocks = [...normalize(response).matchAll(/```(?:diff|patch)?\s*\n([\s\S]*?)```/g)].map(match => match[1]);
  const text = blocks.find(block => /^(?:diff --git|--- |\*\*\* Begin Patch)/m.test(block)) ?? normalize(response);
  const paths = [...text.matchAll(/^(?:--- |\+\+\+ |\*\*\* Update File: )([^\n]+)/gm)].map(match => match[1].trim().replace(/^[ab]\//, ''));
  if (!paths.length || paths.some(name => name !== 'orders.ts')) throw new Error('Patch must update only orders.ts');
  if (/^\*\*\* (?:Add|Delete|Move) File:/m.test(text)) throw new Error('Unexpected file operation');
  const lines = text.split('\n');
  const hunks = [];
  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].startsWith('@@')) continue;
    const oldLines = [], newLines = [];
    const header = lines[i];
    while (i + 1 < lines.length) {
      const line = lines[i + 1];
      if (line.startsWith('@@') || line.startsWith('***') || line.startsWith('diff --git') || !/^[ +\\-]/.test(line)) break;
      i++;
      if (line.startsWith('\\')) continue;
      if (line[0] !== '+') oldLines.push(line.slice(1));
      if (line[0] !== '-') newLines.push(line.slice(1));
    }
    const counts = header.match(/^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/);
    if (counts && (oldLines.length !== Number(counts[1] ?? 1) || newLines.length !== Number(counts[2] ?? 1))) throw new Error('Patch hunk line counts are inconsistent');
    if (!oldLines.length) throw new Error('A hunk has no original context');
    hunks.push({oldText: oldLines.join('\n'), newText: newLines.join('\n')});
  }
  if (!hunks.length) throw new Error('No patch hunks were found');
  let source = normalize(original);
  for (const hunk of hunks) {
    const offset = source.indexOf(hunk.oldText);
    if (offset < 0 || source.indexOf(hunk.oldText, offset + 1) >= 0) throw new Error('Patch context is missing or ambiguous');
    source = source.slice(0, offset) + hunk.newText + source.slice(offset + hunk.oldText.length);
  }
  return source;
}
function verify(source, directory) {
  fs.mkdirSync(directory, {recursive: true});
  for (const filename of fs.readdirSync(fixture)) fs.copyFileSync(path.join(fixture, filename), path.join(directory, filename));
  const file = path.join(directory, 'orders.ts');
  fs.writeFileSync(file, source);
  const program = ts.createProgram([file], {strict: true, noEmit: true, target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS});
  const diagnostics = ts.getPreEmitDiagnostics(program);
  const checks = {typecheck: diagnostics.length === 0, public_api_unchanged: JSON.stringify(api(original)) === JSON.stringify(api(source))};
  const javascript = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS}}).outputText;
  const context = vm.createContext({exports: {}});
  vm.runInContext(javascript, context, {timeout: 1000});
  const cases = [
    ['empty_input', 'exports.totalValue([])', 0],
    ['specified_example', "exports.totalValue([{id:'a',price:12,quantity:3},{id:'b',price:5,quantity:2}])", 46],
    ['fractional_values', "exports.totalValue([{id:'a',price:1.5,quantity:2}])", 3],
    ['frozen_input_unchanged', "(() => { const orders = Object.freeze([Object.freeze({id:'a',price:12,quantity:3}),Object.freeze({id:'b',price:5,quantity:2})]); const before = JSON.stringify(orders); exports.totalValue(orders); return before === JSON.stringify(orders); })()", true],
  ];
  const observed = {};
  for (const [name, expression, expected] of cases) {
    try { const actual = vm.runInContext(expression, context, {timeout: 1000}); checks[name] = actual === expected; observed[name] = {actual, expected}; }
    catch (error) { checks[name] = false; observed[name] = {error: error.message, expected}; }
  }
  return {checks, observed, diagnostics: diagnostics.map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')), passed: Object.values(checks).every(Boolean)};
}
const result = {typescript_version: ts.version, original_fixture: verify(original, path.join(out, 'verification', 'original')), model_runs: []};
const trialsPath = path.join(out, 'model-trials.json');
if (fs.existsSync(trialsPath)) {
  const trials = JSON.parse(fs.readFileSync(trialsPath, 'utf8'));
  for (const record of trials.runs) {
    const name = `trial-${record.trial}-${record.condition}`;
    try {
      const response = fs.readFileSync(path.join(out, record.response), 'utf8');
      const source = apply(response);
      const validation = verify(source, path.join(out, 'verification', name));
      result.model_runs.push({trial: record.trial, condition: record.condition, ...validation});
    } catch (error) { result.model_runs.push({trial: record.trial, condition: record.condition, passed: false, error: error.message}); }
  }
}
fs.writeFileSync(path.join(out, 'acceptance-verification.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
console.log(`Model patches passing acceptance: ${result.model_runs.filter(run => run.passed).length}/${result.model_runs.length}`);
