const fs = require('node:fs');
const path = require('node:path');
const {publicApi, typecheck, runtime, fixtureCopy, typescriptVersion} = require('./verification.cjs');
const targetFile = 'src/orders/order-exposure.ts';
const row = (symbol, buyQuantity, sellQuantity, buyNotional, sellNotional) => ({symbol, buyQuantity, sellQuantity, buyNotional, sellNotional, netNotional: buyNotional - sellNotional});
const snapshot = (rows, totalBuyNotional, totalSellNotional) => ({accountId: 'alpha', rows, totalBuyNotional, totalSellNotional, netNotional: totalBuyNotional - totalSellNotional});
const order = overrides => ({id: 'o', accountId: 'alpha', symbol: 'AAA', side: 'buy', status: 'new', price: 10, quantity: 5, filledQuantity: 0, ...overrides});
const sample = [order({quantity: 10, filledQuantity: 3, status: 'partially-filled'}),
  order({id:'2', side:'sell', price:12, quantity:4, filledQuantity:1, status:'partially-filled'}),
  order({id:'3', symbol:'BBB', price:2.5, quantity:8}),
  order({id:'4', accountId:'beta', price:100}),
  order({id:'5', status:'filled', price:20, quantity:9, filledQuantity:9}),
  order({id:'6', symbol:'CCC', side:'sell', price:5, quantity:10, filledQuantity:10, status:'partially-filled'}),
  order({id:'7', side:'sell', price:8, quantity:2})];
const worked = snapshot([row('AAA',7,5,70,52), row('BBB',8,0,20,0)],90,52);
const cases = [
  {name:'empty_input', orders:[], filter:{accountId:'alpha'}, expected:snapshot([],0,0)},
  {name:'worked_example', orders:sample, filter:{accountId:'alpha'}, expected:worked},
  {name:'account_isolation', orders:[order({accountId:'beta'})], filter:{accountId:'alpha'}, expected:snapshot([],0,0)},
  {name:'closed_statuses', orders:['filled','cancelled','rejected'].map(status => order({status})), filter:{accountId:'alpha'}, expected:snapshot([],0,0)},
  {name:'partial_fill', orders:[order({status:'partially-filled', filledQuantity:2})], filter:{accountId:'alpha'}, expected:snapshot([row('AAA',3,0,30,0)],30,0)},
  {name:'clamped_remaining', orders:[order({filledQuantity:8}), order({quantity:0})], filter:{accountId:'alpha'}, expected:snapshot([],0,0)},
  {name:'empty_symbol_selection', orders:sample, filter:{accountId:'alpha',symbols:[]}, expected:snapshot([],0,0)},
  {name:'exact_symbol_selection', orders:sample, filter:{accountId:'alpha',symbols:['BBB','BBB']}, expected:snapshot([row('BBB',8,0,20,0)],20,0)},
  {name:'negative_net', orders:[order({side:'sell',price:1.25,quantity:3})], filter:{accountId:'alpha'}, expected:snapshot([row('AAA',0,3,0,3.75)],0,3.75)},
  {name:'zero_price_with_shares', orders:[order({price:0})], filter:{accountId:'alpha'}, expected:snapshot([row('AAA',5,0,0,0)],0,0)},
  {name:'deterministic_order', orders:[order({symbol:'ZZZ'}),order({symbol:'AAA'})], filter:{accountId:'alpha'}, expected:snapshot([row('AAA',5,0,50,0),row('ZZZ',5,0,50,0)],100,0)},
];

function verify({fixture, destination, filenames, source}) {
  const original = fs.readFileSync(path.join(fixture, targetFile), 'utf8');
  fixtureCopy(fixture, destination, filenames, source, targetFile);
  const diagnostics = typecheck(destination, filenames);
  const checks = {typecheck: diagnostics.length === 0, public_api_unchanged: JSON.stringify(publicApi(original)) === JSON.stringify(publicApi(source))};
  const observed = {};
  let engine;
  try {
    engine = runtime(destination);
    engine.context.exposure = engine.load(targetFile);
    engine.context.Facade = engine.load('src/orders/order-exposure.facade.ts').OrderExposureFacade;
    engine.evaluate('function deepFreeze(value) { if (value && typeof value === "object") { Object.values(value).forEach(deepFreeze); Object.freeze(value); } return value; }');
  } catch (error) { checks.runtime_loaded = false; observed.runtime_error = error.message; }
  if (engine && !('runtime_loaded' in checks)) {
    for (const item of cases) {
      try {
        engine.evaluate(`globalThis.input = deepFreeze(${JSON.stringify({orders:item.orders,filter:item.filter})});`);
        const before = engine.evaluate('JSON.stringify(input)');
        const actual = JSON.parse(engine.evaluate('JSON.stringify(exposure.summarizeOrderExposure(input.orders, input.filter))'));
        checks[item.name] = JSON.stringify(actual) === JSON.stringify(item.expected);
        // Object property order is not contractual: compare canonicalized objects.
        const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
          ? Object.fromEntries(Object.keys(value).sort().map(key => [key,canonical(value[key])])) : value;
        checks[item.name] = JSON.stringify(canonical(actual)) === JSON.stringify(canonical(item.expected));
        checks[item.name + '_inputs_unchanged'] = engine.evaluate('JSON.stringify(input)') === before;
        observed[item.name] = {actual, expected:item.expected};
      } catch (error) { checks[item.name] = false; observed[item.name] = {error:error.message}; }
    }
    try {
      engine.evaluate(`globalThis.input = deepFreeze(${JSON.stringify({orders:sample,filter:{accountId:'alpha'}})});`);
      const actual = JSON.parse(engine.evaluate('JSON.stringify(new Facade().cards(new Facade().snapshot(input.orders,input.filter)))'));
      const expected = [{symbol:'AAA',outstandingBuy:7,outstandingSell:5,netNotional:18,bias:'buy'},
        {symbol:'BBB',outstandingBuy:8,outstandingSell:0,netNotional:20,bias:'buy'}];
      checks.facade_consumers = JSON.stringify(actual) === JSON.stringify(expected);
      checks.fresh_snapshot = engine.evaluate('exposure.summarizeOrderExposure(input.orders,input.filter) !== exposure.summarizeOrderExposure(input.orders,input.filter)');
      observed.facade_consumers = {actual, expected};
    } catch (error) { checks.facade_consumers = false; observed.facade_consumers = {error:error.message}; }
  }
  return {typescript_version:typescriptVersion, checks, observed, diagnostics, passed:Object.values(checks).every(Boolean)};
}
module.exports = {verify, targetFile, cases};
