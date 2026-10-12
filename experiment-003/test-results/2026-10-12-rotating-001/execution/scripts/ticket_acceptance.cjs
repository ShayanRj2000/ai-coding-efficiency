const fs = require('node:fs');
const path = require('node:path');
const {publicApi,typecheck,runtime,typescriptVersion} = require('./verification.cjs');
const {writeText} = require('./artifacts.cjs');
const {allowedFiles} = require('./ticket_response.cjs');
const draft = overrides => ({id:' R-7 ',accountId:'alpha',venue:'PRIMARY',symbol:' acme ',side:'buy',quantity:30,limitPrice:12.349,timeInForce:'DAY',...overrides});
const account = overrides => ({accountId:'alpha',brokerAccount:'A-42',routingPrefix:'paper/alpha',tradable:true,cashAvailableMinor:100000,...overrides});
// Numeric expectations below are literal, declared before trials. No production
// policy/helper or reference implementation computes this acceptance oracle.
const accepted = (overrides,shares,lots,priceMinor,notionalMinor,feeMinor,requiredCashMinor) => ({ok:true,
  request:{clientRef:'paper/alpha/R-7',account:'A-42',venue:'P1',symbol:'ACME',side:1,quantity:lots,price:priceMinor,tif:'DAY',...overrides},
  amounts:{shares,lots,priceMinor,notionalMinor,feeMinor,requiredCashMinor}});
const buy = accepted({},30,3,1230,36900,60,36960);
const rejected = reason => ({ok:false,reason});
const cases = [
  {name:'primary_buy_routing_units_fee',draft:draft(),account:account(),expected:buy},
  {name:'sell_rounds_up_without_cash',draft:draft({side:'sell'}),account:account({cashAvailableMinor:0}),expected:accepted({side:2,price:1235},30,3,1235,37050,60,0)},
  {name:'sell_does_not_validate_cash_balance',draft:draft({side:'sell'}),account:account({cashAvailableMinor:-1}),expected:accepted({side:2,price:1235},30,3,1235,37050,60,0)},
  {name:'odd_venue_fractional_price',draft:draft({venue:'ODD',quantity:7,limitPrice:0.301,timeInForce:'GTC'}),account:account(),expected:accepted({venue:'O2',quantity:7,price:30,tif:'GTC'},7,7,30,210,1,211)},
  {name:'already_aligned_binary_price',draft:draft({quantity:10,limitPrice:0.3}),account:account(),expected:accepted({quantity:1,price:30},10,1,30,300,16,316)},
  {name:'cash_equality_is_accepted',draft:draft(),account:account({cashAvailableMinor:36960}),expected:buy},
  {name:'fee_makes_cash_insufficient',draft:draft(),account:account({cashAvailableMinor:36959}),expected:rejected('INSUFFICIENT_CASH')},
  {name:'reject_partial_lot',draft:draft({quantity:15}),account:account(),expected:rejected('INVALID_QUANTITY')},
  {name:'reject_zero_quantity',draft:draft({quantity:0}),account:account(),expected:rejected('INVALID_QUANTITY')},
  {name:'reject_maximum_lots_overflow',draft:draft({quantity:1010}),account:account(),expected:rejected('INVALID_QUANTITY')},
  {name:'reject_negative_price',draft:draft({limitPrice:-1}),account:account(),expected:rejected('INVALID_PRICE')},
  {name:'reject_price_below_buy_tick',draft:draft({limitPrice:0.01}),account:account(),expected:rejected('INVALID_PRICE')},
  {name:'reject_nan_price',draft:draft(),account:account(),setup:'input.draft.limitPrice=NaN;',expected:rejected('INVALID_PRICE')},
  {name:'reject_infinite_quantity',draft:draft(),account:account(),setup:'input.draft.quantity=Infinity;',expected:rejected('INVALID_QUANTITY')},
  {name:'unsupported_venue_precedes_account',draft:draft({venue:'unknown',quantity:0}),account:account({tradable:false}),expected:rejected('UNSUPPORTED_VENUE')},
  {name:'venue_key_is_case_sensitive',draft:draft({venue:'primary'}),account:account(),expected:rejected('UNSUPPORTED_VENUE')},
  {name:'account_mismatch_precedes_quantity',draft:draft({accountId:'beta',quantity:0}),account:account(),expected:rejected('ACCOUNT_UNAVAILABLE')},
  {name:'blocked_account',draft:draft(),account:account({tradable:false}),expected:rejected('ACCOUNT_UNAVAILABLE')},
  {name:'empty_id_precedes_symbol',draft:draft({id:' ',symbol:' '}),account:account(),expected:rejected('INVALID_ID')},
  {name:'empty_symbol_precedes_quantity',draft:draft({symbol:' ',quantity:0}),account:account(),expected:rejected('INVALID_SYMBOL')},
  {name:'unsupported_time_in_force',draft:draft({timeInForce:'GTC'}),account:account(),expected:rejected('UNSUPPORTED_TIF')},
];
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  return value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])) : value;
}
const equal = (a,b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function viewFor(expected) {
  if (!expected.ok) return {canSubmit:false,reason:expected.reason,priceLabel:'',quantityLabel:'',estimatedCashMinor:0,request:null};
  const a = expected.amounts;
  return {canSubmit:true,reason:null,priceLabel:(a.priceMinor/100).toFixed(2)+' USD',
    quantityLabel:a.shares+' shares ('+a.lots+' lots)',estimatedCashMinor:a.requiredCashMinor,request:expected.request};
}
function verify({fixture,destination,filenames,sources}) {
  for (const name of filenames) {
    const target = path.join(destination,name);
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.copyFileSync(path.join(fixture,name),target);
  }
  for (const name of allowedFiles) writeText(path.join(destination,name),sources[name]);
  const diagnostics = typecheck(destination,filenames);
  const checks = {typecheck:diagnostics.length===0};
  for (const name of allowedFiles) checks['public_api:'+name] = equal(publicApi(fs.readFileSync(path.join(fixture,name),'utf8')),publicApi(sources[name]));
  const observed = {};
  try {
    const engine = runtime(destination);
    engine.context.build = engine.load(allowedFiles[0]).buildTicketRequest;
    engine.context.present = engine.load(allowedFiles[1]).presentTicket;
    engine.context.Facade = engine.load('src/tickets/ticket.facade.ts').TicketFacade;
    engine.evaluate('function deepFreeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }');
    engine.context.policyFor=engine.load('src/venues/venue-policies.ts').policyFor;
    engine.evaluate('deepFreeze(policyFor("PRIMARY"));deepFreeze(policyFor("ODD"));globalThis.policyBefore=JSON.stringify([policyFor("PRIMARY"),policyFor("ODD")]);');
    for (const item of cases) {
      try {
        engine.evaluate(`globalThis.input=${JSON.stringify({draft:item.draft,account:item.account})};${item.setup || ''}deepFreeze(input);`);
        const before = engine.evaluate('JSON.stringify(input)');
        const actual = JSON.parse(engine.evaluate('JSON.stringify({submission:build(input.draft,input.account),preview:present(input.draft,input.account),facadeSubmission:new Facade().submission(input.draft,input.account),facadePreview:new Facade().preview(input.draft,input.account)})'));
        const expectedView = viewFor(item.expected);
        checks[item.name+':submission'] = equal(actual.submission,item.expected);
        checks[item.name+':preview'] = equal(actual.preview,expectedView);
        checks[item.name+':facade'] = equal(actual.facadeSubmission,item.expected) && equal(actual.facadePreview,expectedView);
        checks[item.name+':inputs_unchanged'] = engine.evaluate('JSON.stringify(input)') === before;
        observed[item.name] = {actual,expected:{submission:item.expected,preview:expectedView}};
      } catch(error) {checks[item.name+':runtime']=false;observed[item.name]={error:error.message};}
    }
    engine.evaluate(`globalThis.input=deepFreeze(${JSON.stringify({draft:draft(),account:account()})});`);
    checks.fresh_results = engine.evaluate('globalThis.first=build(input.draft,input.account);globalThis.second=build(input.draft,input.account);first !== second && first.ok && second.ok && first.request !== second.request && first.amounts !== second.amounts && present(input.draft,input.account) !== present(input.draft,input.account)');
    checks.shared_policies_unchanged=engine.evaluate('JSON.stringify([policyFor("PRIMARY"),policyFor("ODD")])===policyBefore');
  } catch(error) {checks.runtime_loaded=false;observed.runtime_error=error.message;}
  return {typescript_version:typescriptVersion,checks,diagnostics,observed,passed:Object.values(checks).every(Boolean)};
}
module.exports = {verify,cases,allowedFiles};
