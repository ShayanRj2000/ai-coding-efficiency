const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {writeText, writeJson, metrics} = require('./artifacts.cjs');
const root = path.resolve(__dirname,'..');
const python = process.argv[2] || process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
const directory = path.resolve(root,process.argv[3] || 'verification/local-tests');
if (!directory.startsWith(root + path.sep)) throw new Error('Validation output must be inside this repository');
fs.mkdirSync(directory,{recursive:true});
const commands = [
  ['python-version',python,['--version']],
  ['python-tests',python,['-B','-m','unittest','discover','-v']],
  ['node-tests',process.execPath,['--test','tests/verification.test.cjs','tests/ticket-verification.test.cjs']],
  ['experiment-001-reverification',process.execPath,['.test-tools/verify_orders.cjs']],
];
const checks = commands.map(([name,executable,args]) => {
  const result = spawnSync(executable,args,{cwd:root,encoding:'utf8',windowsHide:true});
  const log = path.join(directory,`${name}.txt`);
  writeText(log,(result.stdout || '')+(result.stderr || '')+(result.error ? '\n'+result.error.message+'\n' : ''));
  console.log(`${name}: ${result.status === 0 ? 'PASS' : 'FAIL'}`);
  return {name,command:[executable,...args],exit_code:result.status,signal:result.signal,
    passed:result.status===0,log:path.basename(log),saved_metrics:metrics(log)};
});
const report = {recorded_at_utc:new Date().toISOString(),platform:process.platform,arch:process.arch,
  node_version:process.version,typescript_version:require('typescript').version,checks,
  passed:checks.every(check => check.passed)};
writeJson(path.join(directory,'verification.json'),report);
if (!report.passed) process.exitCode=1;
