const config = require('./config.json').sonic;
const rp = require('request-promise-native');
const cheerio = require('cheerio');
const OTP = require('otp-client').default;
const currency = require('currency.js');

const promisifiedSetCookiesFromHeader = (jar) => (cookies, domain) => {
  if (!cookies) return Promise.resolve(undefined);

  const promisedSetCookie = string => new Promise((resolve, reject) => {
    jar.setCookie(string, 'https://members.sonic.net/', (err, cookie) => {
      if (err) {
        reject(err, cookie);
      } else {
        resolve(cookie);
      }
    });
  });

  const cookiesArray = cookies instanceof Array ? cookies : [cookies];
  return Promise.all(cookiesArray.map(promisedSetCookie));
};

const getSonicData = async () => {
  let response;
  const otp = new OTP(config.authenticatorKey.replace(/ /g, ''));
  const jar = rp.jar();
  const setCookies = promisifiedSetCookiesFromHeader(jar);
  const sonicRp = rp.defaults({
    jar,
    followAllRedirects: true,
    transform: (body, response, useFullResponse) => {
      setCookies(response.headers['set-cookie']);
      response.body = cheerio.load(body);
      return useFullResponse ? response : response.body;
    }
  });

  response = await sonicRp.get('https://members.sonic.net/');
  if (response('title').text() !== 'Sonic.net - Sonic Login') throw new Error('didn\'t get expected login page');

  response = await sonicRp.post('https://members.sonic.net/', {
    form: {
      login: 'login',
      user: config.user,
      pw: config.pw
    }
  });
  if (response('h3').text() !== '2-Step Verification') throw new Error('didn\'t get expected 2FA challenge');

  response = await sonicRp.post('https://members.sonic.net/', {
    form: {
      '2sv_auth': otp.getToken(),
      backup_code: ''
    }
  });
  if (response('title').text() !== 'Sonic.net - Main Menu') throw new Error('didn\'t get expected menu page');

  response = await sonicRp.get('https://members.sonic.net/account/billing/');
  if (response('title').text() !== 'Sonic.net - Billing & Payments') throw new Error('didn\'t get expected billing page');

  const paymentRows = response('.clean-tool-body .row:nth-of-type(2) .panel-sonic tr');
  if (!paymentRows) throw new Error('couldn\'t parse billing page');

  const payments = paymentRows.map((i, tr) => {
    const dateString = response(tr).children(':first-child').text();
    const [month, day, year] = dateString.split('/').map(Number);
    const amountString = response(tr).children('.amount').text();
    return {
      date: new Date(Date.UTC(year, month - 1, day, 16)),
      amount: currency(amountString)
    };
  }).get();

  try {
    await sonicRp.get('https://members.sonic.net/logout/');
  } finally {
    return payments;
  }
}

module.exports = getSonicData;
