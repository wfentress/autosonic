const config = require('./config.json');
const Splitwise = require('splitwise');
const currency = require('currency.js');
const sonic = require('./sonic.js');

const argv = require('./parseArgv.js')({verbose: 'v'});

const sw = Splitwise(config.splitwise.swInit);

async function getSonicList () {
  const rawList = await sonic();
  const listWithNulls = await Promise.all(rawList.map(nullIfRecorded));
  return listWithNulls.filter(Boolean);
}

async function nullIfRecorded (sonicBill) {
  const expenses = await sw.getExpenses({
    limit: 0,
    dated_after: new Date(sonicBill.date.getTime() - 1800e3).toISOString(),
    dated_before: new Date(sonicBill.date.getTime() + 1800e3).toISOString()
  });
  return expenses.some(e => !e.deleted_at && e.description === 'Sonic') ? null : sonicBill;
}

function createExpense ({date, amount}) {
  const shares = amount.distribute(3).map(s => s.toString());
  if (shares[0] === shares[1]) shares.unshift(shares.pop());

  const users = config.splitwise.users
    .map((e, i) => Object.assign({}, e, {paid_share: '0.00', owed_share: shares[i]}));
  users[0].paid_share = amount.toString();
  const swExpense = {
    users,
    cost: amount.toString(),
    currency_code: 'USD',
    group_id: config.splitwise.group_id,
    category_id: '8',
    date: date.toString(),
    description: 'Sonic',
    creation_method: 'equal'
  };

  return sw.createExpense(swExpense);
}

function verboseLog(...args) {
  if (!argv.verbose) return;
  console.log(...args);
}

(async function () {
  let list;
  try {
    list = await getSonicList();
    verboseLog(`found ${list.length} new Sonic bill(s)`);
    list.forEach(e => verboseLog(`${e.date.toISOString().split('T')[0]}: ${e.amount}`));
    await Promise.all(list.map(expense => createExpense(expense)));
    verboseLog('Splitwise expense(s) created successfully');
  } catch (e) {
    process.exitCode = 1;
    console.error(e);
  }
})();
