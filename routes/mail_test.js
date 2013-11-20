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

var results = {}

var smtp_check = function(req, res, hosts, email, bad_email){
	var hostname = hosts.shift();
	console.log('testing hostname', hostname);
	
	smtp.connect(hostname, 25, function (mail) {
		seq()
			.seq_(function (next) {
				console.log("Listen for greeting")
				mail.on('greeting', function (code, lines) {
					results.greeting = code
					console.log(code + " " + lines)
					if (code > 300) {
						res.json({'code':9, 'message': lines});
						next("Error")
					}
					else {
						next();
					}
				});
			})
			.seq_(function (next) {
				console.log("Send HELO")
				mail.helo('MailTester', function (err, code, lines) {
					results.helo = code
					console.log(code + " " + lines)
					if (err || code > 300) {
						res.json({'code':9, 'message': lines});
						next("Error")
					}
					else {
						next();
					}
                                });
			})
			.seq_(function (next) {
				console.log("Announce FROM address")
				mail.from('mailtester@gmail.com', function (err, code, lines) {
					results.from = code
					console.log(code + " " + lines)
					if (err || code > 300) {
						res.json({'code':9, 'message': lines});
						next("Error")
					}
					else {
						next();
					}
                                });
			})
			.seq_(function (next) {
				console.log("Send Valid Recipient")
				mail.to(req.params.email, function (err, code, lines) {
					results.to = code
					console.log(code + " " + lines)
					if (err || code > 300) {
						res.json({'code':9, 'message': lines});
						next("Error")
					}
					else {
						next();
					}
                                });
			})
			.seq_(function (next) {
				console.log("Send Invalid Recipient")
				mail.to(bad_email, function (err, code, lines) {
					results.invalid_to = code
					console.log(code + " " + lines)
					if (err ) {
						res.json({'code':9, 'message': lines});
						next("Error")
					}
					else {
						next();
					}
                                });
			})
			.seq_(function (next) {
				console.log("Disconnect")
				mail.quit(function (err, code, lines) {
					results.quit = code
					console.log(code + " " + lines)
					if (err) {
						res.json({'code':9, 'message': lines});
						next("Error")
					}
					else {
						next();
					}
                                });
			})
			.catch(function (err) {
			    console.error(err.stack ? err.stack : err)
			})
			.seq_(function (next) {
				console.dir(results);
				if ((results.helo >= 200 && results.helo < 300) &&  (results.to >= 200 && results.to < 300)){
					if (results.invalid_to < 200 || results.invalid_to >= 300)
						res.json({'code':1, 'message': 'Mail server indicates this is a valid email address'});
					else
						res.json({'code':2, 'message': 'Mail server found for domain, but cannot validate the email address'});
					return;
				}
				else{
					smtp_check(req, res, hosts, email, bad_email);
				}
				//res.send(this.vars.helo.toString());
			});
		return;//TODO call self
	}, function(error){
		if (error && error.code) {
			error_message = error.code;
			res.json({'code':10, 'message': error_message});
			return;//TODO call self
		}
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
