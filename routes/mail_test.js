var smtp = require('smtp-protocol');
var dns = require('dns');
var underscore = require('underscore');
var seq = require('seq');

function s4() {
  return Math.floor((1 + Math.random()) * 0x10000)
             .toString(16)
             .substring(1);
};

function guid() {
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
         s4() + '-' + s4() + s4() + s4();
}

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

var smtp_check = function(req, res, hosts, email, bad_email){
	var hostname = hosts.shift();
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
				mail.to(bad_email, this.into('to_bad_email'));
			})
			.seq(function () {
				mail.quit(this.into('quit'));
			})
			.seq(function () {
				console.dir(this.vars);
				if (this.vars.helo >= 200 && this.vars.helo < 300){
					if (this.vars.to >= 200 && this.vars.to < 300 && (this.vars.helo < 200 || this.vars.helo >= 300))
						res.json({'code':1, 'message': 'Mail server indicates this is a valid email address'});
					else
						res.json({'code':2, 'message': 'Mail server found for domain, but cannot validate the email address'});
					return;
				}
				//res.send(this.vars.helo.toString());
			});
		return;//TODO call self
	}, function(error){
		if (error && error.code)
			error_message = error.code;
		return;//TODO call self
	});
};

var mail_test = function() {
	return function(req, res){
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

			var uuid = guid().replace(/-/g,'');
			var error_message = 'DNS connect error';
			data = underscore.map(data, function(item){ return item.exchange; });
			var unique_hostnames = underscore.uniq(data, true);
			smtp_check(req, res, unique_hostnames, req.params.email, uuid + '@' + domain);

		});
	};
};

module.exports = {
  mail_test: mail_test
}
