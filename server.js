var express = require('express');
var http = require('http');
var tools = require('./routes/tools.js');
var mail_test = require('./routes/mail_test.js');

var app = express();

app.configure(function() {
  app.set('startedOn', new Date());
  app.set('root', __dirname);
  app.set('port', process.argv[2] || 9090);
  app.use(express.logger(process.env.NODE_ENV == 'production' ? 'default' : 'dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('cookies!'));
  //app.use(express.static(path.join(app.get('root'), 'public')));
  app.use(app.router);
});

app.use(express.logger());

app.get('/', tools.diagnostic(app));
app.get('/diag*', tools.diagnostic(app));

app.get('/check_email/:email', mail_test.mail_test(app));

var server = http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
  console.log('listening on port ' + app.get('port'));
});

server.on('close', function() {
  console.log('server closed on port ' + app.get('port'));
});

['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGABRT', 'SIGTERM'].forEach(function(s) {
  process.on(s, function() {
    server.close(); 
  });
});