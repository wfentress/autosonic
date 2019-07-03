# autosonic

Creates Splitwise expenses from Sonic emails sent on stdin from getmail. Not really useful for anybody else.

Check `config.example.json` and `getmailrc.example` for proper configuration.

Run `getmail` from a cron job:

    42 2 17 * * getmail -g /tmp -r /opt/autosonic/getmailrc

meaning "At 2:47 on the 17th of the month, run `getmail` with the custom `getmailrc` from here"
