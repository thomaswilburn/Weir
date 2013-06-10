var cfg = require("./Config.js");
var console = require("./DevConsole.js");

var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var less = require("less");
var Manos = require("./Manos");

var routes = [];
var files = {
  has: function(path) {
    return typeof this[path] == "object";
  },
  cache: function(path, type, contents) {
    if (typeof this[path] == "function") return;
    if (!contents) {
      contents = type;
      type = "text/html";
    }
    /*
      this[path] = {
        mime: type,
        data: contents
      };
    */
  },
  send: function(path, req) {
    var cached = this[path];
    req.setHeader("Content-Type", cached.mime);
    req.writeHead(200);
    req.write(cached.data);
    req.end();
  }
};
var pub = "./public/";

var mimeTypes = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".txt": "text/plaintext"
};

var lessParser = new less.Parser({
  paths: ["./public/css"]
});

var handlers = {
  ".css": function(pathname, req) {
    //skip if LESS building is turned off
    //should probably change to only build if CSS doesn't exist
    if (!cfg.build.less) {
      serveFile(filePath, req);
    }
    req.setHeader("Content-Type", mimeTypes[".css"]);
    var filePath = path.join(pub, pathname);
    var lessPath = filePath.replace(/css$/, "less");
    fs.exists(lessPath, function(does) {
      if (does) {
        Manos.chain(
          function(c) {
            fs.readFile(lessPath, {encoding: "utf8"}, c);
          },
          function(err, data, c) {
            lessParser.parse(data, c);
          },
          function(err, tree) {
            if (err) {
              req.write("Error parsing LESS");
            } else {
              try {
                var css = tree.toCSS();
              } catch (e) {
                css = e.message;
              }
              req.write(css);
              files.cache(css);
            }
            req.end();
          }
        );
      } else {
        serveFile(filePath, req);
      }
    });
  }
}

var respond = function(request, data) {
  var json = JSON.stringify(data);
  request.setHeader("Content-Type", "application/json");
  request.setHeader("Access-Control-Allow-Origin", "*");
  request.writeHead(200);
  request.write(json);
  request.end();
};

var serveFile = function(file, req) {
  file = path.join(pub, file);
  if (file.slice(-1) == "/") file += "index.html";

  fs.exists(file, function(exists) {
    if (exists) {
      fs.readFile(file, {encoding: "utf8"}, function(err, data) {
        if (err) {
          req.writeHead(500);
          req.end();
        } else {
          var ext = path.extname(file);
          req.setHeader("Content-Type", mimeTypes[ext] || "text/html");
          req.writeHead(200);
          req.write(data);
          req.end();
        }
      });
    } else {
      req.writeHead(404);
      req.end();
    }
  });
};

var serve = function(pathname, req) {
  if (files.has(pathname)) {
    files.send(pathname, req);
  }
  
  //handle special extension processing
  var ext = path.extname(pathname);
  if (handlers[ext]) {
    return handlers[ext](pathname, req);
  }
  
  serveFile(pathname, req);
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
  serve(parsed.pathname, response);
});

module.exports = Server;
