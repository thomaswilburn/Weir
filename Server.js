/*

Process of handling a request:
1. Parse the cookies, construct a friendly request object
2. If this is the checkpoint, provide security status directly and exit
3. Attempt to match routes
4. If a route isn't matched, try to serve the file (first from cache, then from disk)
5. If a route is matched, check security with authorize()
6. authorize() will return a challenge if insecure, otherwise calls its continuation
7. The continuation calls the route's function, passing in the request from step 1

*/

var cfg = require("./Config.js");
var console = require("./DevConsole.js");

var zlib = require("zlib");
var http = require("http");
var url = require("url");
var fs = require("fs");
var path = require("path");
var Security = require("./Security");

var routes = [];
var pub = "./public/";

var mimeTypes = {
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".txt": "text/plaintext",
  ".ico": "image/x-icon",
  ".png": "image/png"
};

var respond = function(response, data) {
  var json = JSON.stringify(data);
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Content-Encoding", "gzip");
  response.writeHead(200);
  zlib.gzip(json, function(err, zipped) {
    response.write(zipped);
    response.end();
  });
};

var serve = function(file, req) {
  if (!file) {
    req.writeHead(500);
    req.end();
    return;
  }
  file = path.join(pub, file);
  if (file.slice(-1) == "/") file += "index.html";
  // console.log("Serving", file);
  if (file.indexOf("public") == -1) {
    req.writeHead(403);
    req.end();
    return;
  }

  fs.exists(file, function(exists) {
    if (exists) {
      fs.readFile(file, {encoding: null}, function(err, data) {
        if (err) {
          req.writeHead(500);
          req.end();
        } else {
          var ext = path.extname(file);
          req.setHeader("Content-Type", mimeTypes[ext] || "text/html");
          req.setHeader("Content-Encoding", "gzip");
          req.writeHead(200);
          zlib.gzip(data, function(err, zipped) {
            req.write(zipped);
            req.end();
          });
        }
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

var parseCookies = function(request) {
  var str = request.headers.cookie || "";
  var cookie = {};
  var values = str.split(";");
  for (var i = 0; i < values.length; i++) {
    var pair = values[i].trim().split("=");
    cookie[pair[0]] = pair[1];
  }
  request.cookie = cookie;
};

var makeRequest = function(request, response) {
  var parsed = url.parse(request.url, true, true);
  var req = {
    url: parsed.pathname,
    request: request,
    cookies: request.cookie,
    params: parsed.query,
    body: "",
    reply: function(data) {
      respond(response, data);
    },
    replyDirect: function(args) {
      args.headers = args.headers || {};
      for (var key in args.headers) {
        response.setHeader(key, args.headers[key]);
      }
      response.writeHead(200);
      response.write(args.body);
      response.end();
    },
    setHeader: response.setHeader.bind(response)
  };
  var ref = request.headers.referer;
  if (ref) {
    var parsed = url.parse(ref);
    ref = parsed.protocol + "//" + parsed.host;
  } else ref = "*";
  response.setHeader("Access-Control-Allow-Origin", ref);
  response.setHeader("Access-Control-Allow-Credentials", "true");
  return req;
};

//checkpoint() is a pseudo-route that's immune to authorization
var checkpoint = async function(req) {
  if (cfg.totp) {
    //check for passkey
    if (req.body) {
      var body;
      try {
        body = JSON.parse(req.body);
      } catch (e) {
        req.reply({ error: "Couldn't parse request" });
      }
      console.log(passed, token, body);
      var [ passed, token ] = await Security.challenge(body.totp);
      if (passed) {
        var today = new Date();
        var cookieString = "key=" + token + ";";
        cookieString += " path=/;";
        cookieString += " expires=" + new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()).toGMTString();
        req.setHeader("Set-Cookie", cookieString);
        req.reply({ success: true });
      } else {
        req.reply({ error: "Failed password challenge" });
      }
      return;
    }
    // if no body, check current auth status
    if (req.cookies && req.cookies.key) {
      var pass = await Security.check(req.cookies.key);
      req.reply({ secure: true, authenticated: pass });
    } else {
      req.reply({ secure: true, authenticated: false });
    }
    return;
  }
  req.reply(Security.generateKey());
};

//before routing, check the cookie for session guarantee
var authorize = async function(req, response, c) {
  if (cfg.totp) {
    if (req.cookie.key) {
      var pass = await Security.check(req.cookie.key);
      if (pass) {
        return true;
      } else {
        respond(response, { challenge: "TOTP" });
      }
    } else {
      respond(response, { challenge: "TOTP" });
    }
  }
  return false;
};

//process requests, checking for routes before serving static files
Server.http.on("request", function(incoming, response) {
  parseCookies(incoming);
  var request = makeRequest(incoming, response);
  incoming.on("data", function(bytes) {
    request.body += bytes;
  });
  incoming.on("end", async function() {
    // console.log("Requested:", request.url);
    // special case for the checkpoint
    if (request.url == "/checkpoint") {
      return checkpoint(request);
    }
    //check for matching routes
    for (var i = 0; i < routes.length; i++) {
      var route = routes[i];
      if (route.p.test(request.url)) {
        var passed = await authorize(incoming, response);
        //if auth passes, call the route function
        if (passed) route.c(request);
        return;
      }
    }
    //static assets do not require auth
    serve(request.url, response);
  });
  
});

module.exports = Server;
