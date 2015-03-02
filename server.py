import cherrypy
import logging
from diagnostics import DiagHandler
import os
import sys
import datetime
import json
import smtplib
import dns.resolver
import dns.exception
import uuid
from multiprocessing import Process, Pipe
import os

def CORS():
    cherrypy.response.headers["Access-Control-Allow-Origin"] = '*'
    cherrypy.response.headers["Access-Control-Request-Method"] = 'GET'

cherrypy.tools.CORS = cherrypy.Tool('before_finalize', CORS)

def get_result(email, conn):
    username, domain = email.split('@')
    result = {'code':0, 'message': 'Unknown Exception'}
    mail_servers = []

    try:
        mail_servers = sorted([x for x in dns.resolver.query(domain, 'MX')], key=lambda k: k.preference)
    except dns.exception.Timeout as ex:
        result = {'code':5, 'message': 'DNS Lookup Timeout'}
    except dns.resolver.NXDOMAIN as ex:
        result = {'code':4, 'message': 'Mail server not found for domain'}
    except Exception as ex:
        result = {'code':0, 'message': 'Unknown Exception: ' + ex.message}

    for mail_server in mail_servers:
        if result['code'] not in [0, 6]:
            break

        print 'Attempting to connect to ' + str(mail_server.exchange)[:-1]
        try:
            server = smtplib.SMTP(str(mail_server.exchange)[:-1])
        except Exception as ex:
            result = {'code':6, 'message': 'Unable to connect to Mail Server'}
            continue
        try:
            (code, msg) = server.helo('MailTester')
            (code, msg) = server.docmd('MAIL FROM:', '<mailtester@gmail.com>')
            if 200 <= code <= 299:
                (code, msg) = server.docmd('RCPT TO:', '<{}>'.format(email))
                if code >= 500:
                    result = {'code':3, 'message': 'Mail server found for domain, but the email address is not valid'}
                else:
                    (code_bad_email, msg) = server.docmd('RCPT TO:', '<{}@{}>'.format(str(uuid.uuid4()), domain))
                    if code != code_bad_email and 200 <= code <= 299:
                        result = {'code':1, 'message': 'Mail server indicates this is a valid email address'}
                    else:
                        result = {'code':2, 'message': 'Mail server found for domain, but the server doesn\'t allow e-mail address verification'}
        except Exception as ex:
            try:
                server.quit()
            except Exception:
                pass

    result['email'] = email
    resp = json.dumps(result)

    print 'Done', resp

    conn.send(resp)
    conn.close()

class root:
    diag = DiagHandler()

    @cherrypy.expose
    def check_email(self, *args, **kwargs):
        email = args[0]
        if '@' not in email:
            resp = json.dumps({'code':0, 'message': 'Enter a valid email address'})
            return resp

        parent_conn, child_conn = Pipe()
        p = Process(target=get_result, args=(email, child_conn))
        p.start()
        result = parent_conn.recv()
        p.join()

        cherrypy.response.headers['Content-Type'] = 'application/json'
        return result

if __name__ == "__main__":

    server_host = '0.0.0.0'
    server_port = int(sys.argv[1]) if len(sys.argv) > 1 else 9090
    current_dir = os.path.dirname(os.path.abspath(__file__))
    cherrypy.config.update({
        'server.socket_host' : server_host,
        'server.socket_port' : server_port,
        'tools.CORS.on' : True
    })
    cherrypy.server_port = server_port
    cherrypy.process_start_time = datetime.datetime.now()

    root = root()

    if len(sys.argv) > 2 and sys.argv[2] == 'dev':
        logging.info('Starting web server with QuickStart')
        cherrypy.quickstart(root=root)
    else:
        logging.info('Starting web server')
        cherrypy.engine.autoreload.unsubscribe()
        cherrypy.tree.mount(root)
        cherrypy.engine.start()
        cherrypy.engine.block()
