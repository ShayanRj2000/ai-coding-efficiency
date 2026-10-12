const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');
const {verify,allowedFiles} = require('../scripts/ticket_acceptance.cjs');
const {parseResponse} = require('../scripts/ticket_response.cjs');
const root = path.resolve(__dirname,'..');
const fixture = path.join(root,'experiment-003/fixture');
function files(directory,prefix='') {
  return fs.readdirSync(directory,{withFileTypes:true}).flatMap(e=>e.isDirectory() ? files(path.join(directory,e.name),prefix+e.name+'/') : [prefix+e.name]);
}
const filenames = files(fixture);
const reference = Object.fromEntries(allowedFiles.map(name=>[name,fs.readFileSync(path.join(__dirname,'ticket-reference',path.basename(name)),'utf8')]));
fs.mkdirSync(path.join(root,'verification'),{recursive:true});
function check(sources) {return verify({fixture,destination:fs.mkdtempSync(path.join(root,'verification/ticket-')),filenames,sources});}
test('ticket response preserves source and enforces complete allowed-file scope',()=> {
  const response = {files:reference,notes:'verified'};
  assert.deepEqual(parseResponse('```json\r\n'+JSON.stringify(response)+'\r\n```'),response);
  assert.throws(()=>parseResponse(JSON.stringify({files:{'../outside.ts':'bad'},notes:''})),/two allowed files/);
  assert.throws(()=>parseResponse(JSON.stringify({files:{[allowedFiles[0]]:'source'},notes:''})),/two allowed files/);
  assert.throws(()=>parseResponse('{broken'),SyntaxError);
});
test('ticket baseline compiles but rejects acceptance in both target files',()=> {
  const result = check(Object.fromEntries(allowedFiles.map(name=>[name,fs.readFileSync(path.join(fixture,name),'utf8')])));
  assert.equal(result.checks.typecheck,true,JSON.stringify(result.diagnostics));
  assert.equal(result.checks['primary_buy_routing_units_fee:submission'],false);
  assert.equal(result.checks['blocked_account:preview'],false);
  assert.equal(result.passed,false);
});
test('ticket reference passes independent numeric, rejection, preview and facade criteria',()=> {
  const result = check(reference);
  assert.equal(result.passed,true,JSON.stringify(result));
});
const regressions = [
  ['UI shares sent as gateway lots',0,'quantity:lots,price:priceMinor','quantity:draft.quantity,price:priceMinor','primary_buy_routing_units_fee:submission'],
  ['buy price rounded up',0,'Math.floor(draft.limitPrice/policy.tickSize + 1e-9)','Math.ceil(draft.limitPrice/policy.tickSize - 1e-9)','primary_buy_routing_units_fee:submission'],
  ['fee truncated',0,'Math.ceil(notionalMinor * policy.feeBasisPoints / 10000)','Math.floor(notionalMinor * policy.feeBasisPoints / 10000)','fee_makes_cash_insufficient:submission'],
  ['cash equality rejected',0,'requiredCashMinor > account.cashAvailableMinor','requiredCashMinor >= account.cashAvailableMinor','cash_equality_is_accepted:submission'],
  ['raw price displayed in preview',1,'(result.amounts.priceMinor/100).toFixed(2)','draft.limitPrice.toFixed(2)','primary_buy_routing_units_fee:preview'],
  ['invalid draft enabled',1,'canSubmit:false,reason:result.reason','canSubmit:true,reason:result.reason','blocked_account:preview'],
];
for (const [name,index,before,after,criterion] of regressions) test('ticket verifier rejects regression: '+name,()=> {
  assert.ok(reference[allowedFiles[index]].includes(before),'Mutation was not applied');
  const result = check({...reference,[allowedFiles[index]]:reference[allowedFiles[index]].replace(before,after)});
  assert.equal(result.checks.typecheck,true,JSON.stringify(result.diagnostics));
  assert.equal(result.checks[criterion],false);
  assert.equal(result.passed,false);
});
