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

var respond = function(request, data) {
  var json = JSON.stringify(data);
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
  var extension = /\.\w+$/.exec(pathname);
  extension = extension ? extension[0] : "";
  var filePath = path.join("./public", pathname);
  if (/\/$/.test(pathname)) {
    //trailing slashes (we assume) are directories
    filePath = path.join(filePath, "index.html");
  }
  fs.exists(filePath, function(does) {
    if (does) {
      if (extension == ".css") {
        return sendLESS(filePath, req);
      }
      fs.readFile(filePath, function(err, data) {
        //console.log("Serving file:", pathname);
        req.write(data);
        req.end();
        //TODO: un-comment this line to enable in-memory file cache
        //files[pathname] = data;
      });
    } else {
      req.writeHead(404);
      req.end();
    }
  });
};

var lessParser = new less.Parser();

var sendLESS = function(path, req) {
  var send = function(file) {
    fs.readFile(file, function(err, data) {
      req.write(data);
      req.end();
    });
  }
  var lessPath = path.replace(/css$/, "less");
  Manos.when(
    [fs.exists, path],
    [fs.exists, lessPath],
    function(css, less) {
      if (css[0] && less[0]) {
        Manos.when(
          [fs.stat, path],
          [fs.stat, lessPath],
          function(css, less) {
            //check dates on less and css files
            if (!css[0] && !less[0] && css[1].mtime < less[1].mtime) {
              //less is newer, compile and send
              Manos.chain(
                function(c) {
                  fs.readFile(lessPath, { encoding: "utf-8" }, c);
                },
                function(err, data, c) {
                  lessParser.parse(data, c);
                },
                function(err, tree, c) {
                  fs.writeFile(path, tree.toCSS(), function() {
                    send(path);
                  });
                }
              );
              return;
            }
            //CSS is newer, just send it
            send(path);
          }
        );
      }
    }
  );
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
