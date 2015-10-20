# Mail Tester
Simple API to test if an email address is valid.

Based on http://mailtester.com/

## Setup

```bash
sudo apt-get update
sudo apt-get install git python-pip build-essential libssl-dev libpopt-dev
```

## Endpoints
```bash
/diag

/check_email/<email_address>
```
Possible JSON responses
```bash
{'code':0, 'message': 'Unknown Exception'}
{'code':1, 'message': 'Mail server indicates this is a valid email address'}
{'code':2, 'message': 'Mail server found for domain, but the server doesn\'t allow e-mail address verification'}
{'code':3, 'message': 'Mail server found for domain, but the email address is not valid'}
{'code':4, 'message': 'Mail server not found for domain'}
{'code':5, 'message': 'DNS Lookup Timeout'}
{'code':6, 'message': 'Unable to connect to Mail Server'}
```

## Notes

We risk spamming smtp servers with these requests which can lead to getting ourselves added to spam lists.  This will make the method of testing ineffective.

## Example Emails

afriedrich@glgroup.com
donkernan@ymail.com - hangs/timesout on connecting to mail server
stovenator@hotmail.com - server disconnects client
