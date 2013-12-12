import socket
import cherrypy
import json
import datetime
from subprocess import Popen, PIPE

def get_git_info():
    git_branch = Popen("git log -1 --oneline | awk '{ print $1 }'", stdout=PIPE, shell=True).communicate()[0].strip()
    git_sha = Popen("git rev-parse --abbrev-ref HEAD", stdout=PIPE, shell=True).communicate()[0].strip()
    return git_branch, git_sha

class DiagHandler(object):

    @cherrypy.expose
    def default(self, *args, **kwargs):
        diag_info = {}
        diag_info['machine_name'] = socket.gethostname()
        git_branch, git_sha = get_git_info()
        diag_info['git_branch'] = git_branch
        diag_info['git_sha'] = git_sha
        diag_info['process_start_time'] = cherrypy.process_start_time.isoformat()
        diag_info['process_uptime_secs'] = (datetime.datetime.now() - cherrypy.process_start_time).seconds
        diag_info['server_port'] = cherrypy.server_port
        return json.dumps(diag_info)
