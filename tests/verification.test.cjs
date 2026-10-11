const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {applyPatch} = require('../scripts/verification.cjs');
const {verify, targetFile} = require('../scripts/exposure_acceptance.cjs');
const root = path.resolve(__dirname,'..');
const fixture = path.join(root,'experiment-002','fixture');
function files(directory, prefix='') {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry => entry.isDirectory()
    ? files(path.join(directory,entry.name),prefix+entry.name+'/') : [prefix+entry.name]);
}
const filenames = files(fixture);
fs.mkdirSync(path.join(root,'verification'),{recursive:true});
const temporary = () => fs.mkdtempSync(path.join(root,'verification','acceptance-'));
const reference = fs.readFileSync(path.join(__dirname,'exposure-fix.ts'),'utf8');

test('applies unified diff with LF and CRLF responses', () => {
  for (const ending of ['\n','\r\n']) {
    const patch = ['```diff','--- a/orders.ts','+++ b/orders.ts','@@ -1,2 +1,2 @@',' alpha','-beta','+gamma','```'].join(ending);
    assert.equal(applyPatch('alpha\nbeta\n',patch,'orders.ts'),'alpha\ngamma\n');
  }
});
test('supports explicit Begin Patch hunks', () => {
  assert.equal(applyPatch('alpha\nbeta\n','*** Begin Patch\n*** Update File: orders.ts\n@@\n alpha\n-beta\n+gamma\n*** End Patch','orders.ts'),'alpha\ngamma\n');
});
test('rejects a patch outside the allowed file', () => {
  assert.throws(() => applyPatch('alpha\n','--- a/../secret\n+++ b/../secret\n@@ -1 +1 @@\n-alpha\n+beta','orders.ts'),/unexpected file/);
});
test('rejects inconsistent line counts and missing context', () => {
  assert.throws(() => applyPatch('alpha\n','--- a/orders.ts\n+++ b/orders.ts\n@@ -1,2 +1 @@\n-alpha\n+beta','orders.ts'),/line counts/);
  assert.throws(() => applyPatch('other\n','--- a/orders.ts\n+++ b/orders.ts\n@@ -1 +1 @@\n-alpha\n+beta','orders.ts'),/context/);
});
test('baseline compiles but fails business acceptance', () => {
  const source = fs.readFileSync(path.join(fixture,targetFile),'utf8');
  const result = verify({fixture,destination:temporary(),filenames,source});
  assert.equal(result.checks.typecheck,true,JSON.stringify(result.diagnostics));
  assert.equal(result.checks.account_isolation,false);
  assert.equal(result.checks.worked_example,false);
  assert.equal(result.passed,false);
});
test('reference satisfies grouping, filters, partial fills, immutability, API and consumers', () => {
  const result = verify({fixture,destination:temporary(),filenames,source:reference});
  assert.equal(result.passed,true,JSON.stringify(result));
});
test('acceptance rejects ignoring filled quantities', () => {
  const source = reference.replace('remainingQuantity(order)','order.quantity');
  const result = verify({fixture,destination:temporary(),filenames,source});
  assert.equal(result.checks.typecheck,true);
  assert.equal(result.checks.partial_fill,false);
  assert.equal(result.passed,false);
});
