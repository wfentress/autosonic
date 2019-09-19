# autosonic

Creates Splitwise expenses from Sonic's billing history dashboard. Not really useful for anybody else.

Check `config.example.json` for proper configuration.

Run from a cron job:

    42 2 17 * * node /opt/autosonic/index.js --verbose

meaning "At 2:47 on the 17th of the month, run autosonic and be loud about it"
