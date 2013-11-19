exports.diagnostic = function(app) {

  var exec = require('child_process').exec;

  var get_sha = function(error, stdout, stderr) { app.locals.app_git_sha = stdout.replace('\n',''); };
  exec("git log -1 --oneline | awk '{ print $1 }'", get_sha);

  var get_branch = function(error, stdout, stderr) { app.locals.app_git_branch = stdout.replace('\n',''); };
  exec("git rev-parse --abbrev-ref HEAD", get_branch);

  return function(req, res) {
    var exec = require('child_process').exec;

    return res.json({
      'git_sha': app.locals.app_git_sha,
      'git_branch': app.locals.app_git_branch,
      'process_start_time': app.get('startedOn'), 
      'process_uptime_secs': (new Date() - app.get('startedOn')) / 1000    
    });
  };
}
