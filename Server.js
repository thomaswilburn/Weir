var cfg = require("./Config.js");
var console = require("./DevConsole.js");

var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var less = require("less");
var Manos = require("./Manos");
var routes = [];
var files = {};
var mimeTypes = {
  "css": "text/css",
  "js": "application/javascript",
  "json": "application/json",
  "txt": "text/plaintext"
};

var respond = function(request, data) {
  var json = JSON.stringify(data);
  request.setHeader("Content-Type", "application/json");
  request.setHeader("Access-Control-Allow-Origin", "*");
  request.writeHead(200);
  request.write(json);
  request.end();
};

var serveFile = function(pathname, req) {
  if (files[pathname]) {
    //console.log("Serving cached file:", pathname);
    var data = files[pathname]; 
    req.write(data);
    req.end();
    return;
  }
  
  var filePath = path.join("./public", pathname);
  if (/\/$/.test(pathname)) {
    //trailing slashes (we assume) are directories
    filePath = path.join(filePath, "index.html");
  }
  fs.exists(filePath, function(does) {
    if (does) {
      fs.readFile(filePath, function(err, data) {
        //console.log("Serving file:", pathname);
        var status = err ? 500 : 200;
        var extension = /\.(\w+)$/.exec(pathname);
        extension = extension ? extension[1] : "html";
        req.setHeader("Content-Type", mimeTypes[extension] || "text/html");
        req.setHeader("Access-Control-Allow-Origin", "*");
        req.writeHead(status);
        req.write(data);
        req.end();
        //TODO: un-comment this line to enable in-memory file cache
        //NOTE: enhance cache to store mime type, status code
        //files[pathname] = data;
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

Server.http.listen(cfg.port || 8080);

Server.http.on("request", function(incoming, response) {
  for (var i = 0; i < routes.length; i++) {
    var route = routes[i];
    var parsed = url.parse(incoming.url, true, true);
    if (route.p.test(parsed.pathname)) {
      //console.log("Requested route:", parsed.pathname);
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
