var server = require("./Server");
var db = require("./Database");
var Hound = require("./Hound");

server.route("/feeds", function(req) {
  db.getFeeds(function(err, rows) {
    if (err) {
      return req.reply({ feeds: [] });
    }
    return req.reply({ feeds: rows });
  });
});

server.route("/feeds/subscribe", function(req) {
  Hound.getMeta(req.params.url, function(err, meta) {
    if (err) {
      return req.reply(err);
    }
    db.subscribe(meta, function(err, row) {
      meta.id = row.id;
      req.reply(meta);
    });
  });
});

server.route("/feeds/unsubscribe", function(req) {
  db.unsubscribe(req.params.id, function(err) {
    req.reply(err || { result: "success" });
  });
});
