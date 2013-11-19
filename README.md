# Mail Tester
Simple API to test if an email address is valid.

## Setup

Follow: https://github.com/intimonkey/approuter

## Endpoints
```bash
/diag

/check_email/<email_address>
```
Possible JSON Responses
```bash
{'code':1, 'message': 'Mail server indicates this is a valid email address'}
{'code':2, 'message': 'Mail server found for domain, but cannot validate the email address'}
{'code':3, 'message': 'Mail server found for domain, but the email address is not valid'}
{'code':4, 'message': 'Mail server not found for domain'}
```