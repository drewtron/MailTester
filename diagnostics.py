import socket
import cherrypy
import json
import datetime

class DiagHandler(object):

    @cherrypy.expose
    def default(self, *args, **kwargs):
        diag_info = {}
        diag_info['machine_name'] = socket.gethostname()
        # git_branch, git_sha = get_git_info()
        # diag_info['git_branch'] = git_branch
        # diag_info['git_sha'] = git_sha
        diag_info['process_start_time'] = cherrypy.process_start_time.isoformat()
        diag_info['process_uptime_secs'] = (datetime.datetime.now() - cherrypy.process_start_time).seconds
        return json.dumps(diag_info)
