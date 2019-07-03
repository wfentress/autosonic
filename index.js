const config = require('./config.json');
const readline = require('readline');
const Splitwise = require('splitwise');
const currency = require('currency.js');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

// regex: regex including exactly one capture group
// returns fn(string): matches regex in string, caches and returns first capture group on
//                     match
function checkFactory (regex) {
  let cache;
  return function (line) {
    if (cache) return cache;
    const match = line.match(regex);
    if (!match) return;
    cache = match[1];
    return cache;
  }
}

const checks = [
  checkFactory(/^Date: (.*)/),
  checkFactory(/^From: .*<(.*)>/),
  checkFactory(/^\s*Total:\s*([0-9.]+)/),
  checkFactory(/(automatic credit card renewal payment has been processed)/)
];

rl.on('line', function lineListener(line) {
  const results = checks.map(check => check(line));
  if (results[1] && results[1] !== 'billing@sonic.net') {
    rl.close();
    rl.removeListener('line', lineListener);
  }
  if (results.every(r => r !== undefined)) {
    rl.close();
    rl.removeListener('line', lineListener);
    processResults(results[0], results[2]);
  }
});

function processResults(dateString, amountString) {
  const shares = currency(amountString).distribute(3).map(s => s.toString());
  if (shares[0] === shares[1]) shares.unshift(shares.pop());

  const users = config.users
    .map((e, i) => Object.assign({}, e, {paid_share: '0.00', owed_share: shares[i]}));
  users[0].paid_share = amountString;
  const swExpense = {
    users,
    cost: amountString,
    currency_code: 'USD',
    group_id: config.group_id,
    category_id: '8',
    date: new Date(dateString).toString(),
    description: 'Sonic',
    creation_method: 'equal'
  };

  const sw = Splitwise(config.swInit);
  sw.createExpense(swExpense).catch(e => {
    process.exitCode = 1;
    console.error(e);
  });
}
