const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {writeText} = require('./artifacts.cjs');
const normalize = text => text.replace(/\r\n?/g, '\n');

function applyPatch(original, response, allowedFile) {
  const normalized = normalize(response);
  const blocks = [...normalized.matchAll(/```(?:diff|patch)?\s*\n([\s\S]*?)```/g)].map(match => match[1]);
  const text = blocks.find(block => /^(?:diff --git|--- |\*\*\* Begin Patch)/m.test(block)) ?? normalized;
  const files = [...text.matchAll(/^(?:--- |\+\+\+ |\*\*\* Update File: )([^\n]+)/gm)].map(match => match[1].trim().replace(/^[ab]\//, ''));
  if (!files.length || files.some(file => file !== allowedFile)) throw new Error('Patch changes an unexpected file');
  if (/^\*\*\* (?:Add|Delete|Move) File:/m.test(text)) throw new Error('Unexpected file operation');
  const lines = text.split('\n');
  let source = normalize(original), hunks = 0;
  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].startsWith('@@')) continue;
    const header = lines[index], oldLines = [], newLines = [];
    while (index + 1 < lines.length) {
      const line = lines[index + 1];
      if (line.startsWith('@@') || line.startsWith('***') || line.startsWith('diff --git') || !/^[ +\\-]/.test(line)) break;
      index++;
      if (line.startsWith('\\')) continue;
      if (line[0] !== '+') oldLines.push(line.slice(1));
      if (line[0] !== '-') newLines.push(line.slice(1));
    }
    const counts = header.match(/^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/);
    if (counts && (oldLines.length !== Number(counts[1] ?? 1) || newLines.length !== Number(counts[2] ?? 1))) throw new Error('Invalid hunk line counts');
    if (!oldLines.length) throw new Error('Hunk has no original context');
    const oldText = oldLines.join('\n'), offset = source.indexOf(oldText);
    if (offset < 0 || source.indexOf(oldText, offset + 1) >= 0) throw new Error('Missing or ambiguous patch context');
    source = source.slice(0, offset) + newLines.join('\n') + source.slice(offset + oldText.length);
    hunks++;
  }
  if (!hunks) throw new Error('No patch hunks');
  return source;
}

function publicApi(text) {
  const file = ts.createSourceFile('source.ts', text, ts.ScriptTarget.Latest, true);
  const printer = ts.createPrinter({newLine: ts.NewLineKind.LineFeed, removeComments: true});
  const print = node => node && printer.printNode(ts.EmitHint.Unspecified, node, file);
  return file.statements.filter(statement => statement.modifiers?.some(modifier => modifier.kind === ts.SyntaxKind.ExportKeyword)).map(statement => {
    if (ts.isFunctionDeclaration(statement)) return {
      name: statement.name?.text, modifiers: statement.modifiers?.map(print),
      typeParameters: statement.typeParameters?.map(print), parameters: statement.parameters.map(print), type: print(statement.type),
    };
    return print(statement);
  });
}

function typecheck(directory, filenames) {
  const program = ts.createProgram(filenames.filter(name => name.endsWith('.ts')).map(name => path.join(directory, name)), {
    strict: true, noEmit: true, target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
    experimentalDecorators: true,
  });
  return ts.getPreEmitDiagnostics(program).map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

function runtime(directory) {
  const cache = new Map();
  const context = vm.createContext({});
  function load(relative) {
    const filename = path.resolve(directory, relative);
    if (!filename.startsWith(path.resolve(directory) + path.sep)) throw new Error('Module escaped fixture');
    if (cache.has(filename)) return cache.get(filename).exports;
    const module = {exports: {}};
    cache.set(filename, module);
    const source = fs.readFileSync(filename, 'utf8');
    const javascript = ts.transpileModule(source, {compilerOptions: {target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS}}).outputText;
    const requireLocal = name => {
      if (!name.startsWith('.')) throw new Error('External runtime modules are not part of acceptance checks');
      const target = path.resolve(path.dirname(filename), name).replace(/\.js$/, '');
      return load(path.relative(directory, target.endsWith('.ts') ? target : target + '.ts'));
    };
    context.__module = module; context.__require = requireLocal;
    vm.runInContext(`(function(exports, require, module) {\n${javascript}\n})(__module.exports, __require, __module);`, context, {timeout: 1000});
    return module.exports;
  }
  return {context, load, evaluate: expression => vm.runInContext(expression, context, {timeout: 1000})};
}

function fixtureCopy(fixture, destination, filenames, source, changedFile) {
  for (const name of filenames) {
    const target = path.join(destination, name);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    fs.copyFileSync(path.join(fixture, name), target);
  }
  writeText(path.join(destination, changedFile), source);
}
module.exports = {applyPatch, publicApi, typecheck, runtime, fixtureCopy, typescriptVersion: ts.version};
