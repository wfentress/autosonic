// parse process.argv for boolean switches.
// a way simpler yargs

// takes an object with command line switch aliases like
// {
//   verbose: 'v',
//   quiet: ['q', 'qq', 'qqq']
// }
// and also an optional argv array (minus the leading 'node' and 'script.js' elements)
//
// returns a parsed argv object like
// {
//   verbose: true,
//   anotherswitchtheusertried: true
// }

function parseArgv (aliases, argv = process.argv.slice(2)) {
  const aliasArrays = Object.entries(aliases).map(entry => entry.flat());
  return argv.map(str => str.replace(/^-+/, ''))
    .reduce((a, rawSwitch) => {
      const key = (aliasArrays.find(arr => arr.includes(rawSwitch)) || {'0': rawSwitch})[0];
      a[key] = true;
      return a;
    }, {})
}

module.exports = parseArgv;
