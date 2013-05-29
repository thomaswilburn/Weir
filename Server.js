var cfg = require("./Config.js");
var Err = require("./ErrLog.js");

var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var routes = [];
var files = {};

var respond = function(request, data) {
	var json = JSON.stringify(data);
	request.write(json);
	request.end();
};

var serveFile = function(pathname, req) {
	if (files[pathname]) {
		Err.log("Serving cached file:", pathname);
		var data = files[pathname];	
		req.write(data);
		req.end();
		return;
	}
	var filePath = path.join("./public", pathname);
	fs.exists(filePath, function(does) {
		if (does) {
			fs.stat(filePath, function(err, stats) {
				if (stats.isDirectory()) {
					filePath = path.join(filePath, "/index.html");
				}
				fs.readFile(filePath, function(err, data) {
					Err.log("Serving file:", pathname);
					req.write(data);
					req.end();
					//files[pathname] = data;
				});
			});
		} else {
			req.writeHead(404);
			req.end();
		}
	});
};

var Server = {
	http: http.createServer(),
	route: function(pattern, callback) {
		var regex = new RegExp("^" + pattern + "$");
		routes.push({p: regex, c: callback});
	}
};

Server.http.listen(8675);

Server.http.on("request", function(incoming, response) {
	for (var i = 0; i < routes.length; i++) {
		var route = routes[i];
		var parsed = url.parse(incoming.url, true, true);
		if (route.p.test(parsed.pathname)) {
			Err.log("Requested route:", parsed.pathname);
			var request = {
				url: parsed.pathname,
				params: parsed.query,
				reply: function(data) {
					respond(response, data);
				}
			};
			return route.c(request);
		}
	}
	serveFile(parsed.pathname, response);
});

module.exports = Server;
