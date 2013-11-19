var express = require('express');
var http = require('http');
var tools = require('./routes/tools.js');
var smtp = require('smtp-protocol');
var dns = require('dns');
var underscore = require('underscore');
var seq = require('seq');

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

var nsLookup = function(domain, timeout, callback) {
  var callbackCalled = false;
  var doCallback = function(err, domains) {
    if (callbackCalled) return;
    callbackCalled = true;
    callback(err, domains);
  };

  setTimeout(function() {
    doCallback(new Error("Timeout exceeded"), null);
  }, timeout);

  dns.resolveMx(domain, doCallback);
};

app.get('/check_email/:email', function(req, res) {
	//TODO BASIC VALIDATION
	var split_email = req.params.email.split('@');
	var username = split_email[0];
	var domain = split_email[1];

	nsLookup(domain, 5000, function(error, data){
		if (error){
			console.log(error);
			res.json({'code':5, 'message': 'DNS Timeout'});
			return;
		}
		if (data === undefined){
			res.json({'code':4, 'message': 'Mail server not found for domain'});
			return;
		}

		data = underscore.sortBy(data, function(item){ return item.priority; });

		var tested_domains = {};

		var only_once = false;
		underscore.each(data, function(item){
			if (!only_once){
				only_once = true;
				var hostname = item.exchange;
				if (!tested_domains[hostname]){
					tested_domains[hostname] = true;
					
					console.log('testing hostname', hostname);
					smtp.connect(hostname, 25, function (mail) {
						seq()
							.seq_(function (next) {
								mail.on('greeting', function (code, lines) {
									next();
								});
							})
							.seq(function (next) {
								mail.helo('MailTester', this.into('helo'));
							})
							.seq(function () {
								mail.from('mailtester@gmail.com', this.into('from'));
							})
							.seq(function () {
								mail.to(req.params.email, this.into('to'));
							})
							.seq(function () {
								mail.to('fawefwa@fwafa.com', this.into('to_bad_email'));
							})
							.seq(function () {
								mail.quit(this.into('quit'));
							})
							.seq(function () {
								console.dir(this.vars);
								res.json(this.vars);
							});
						return;
					});
				}
			}
		});
	});
});

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