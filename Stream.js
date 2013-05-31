var server = require("./Server.js");
var db = require("./Database.js");

server.route("/stream/status", function(req) {
  db.getUnreadCount(function(err, count) {
    req.reply({
      unread: count
    });
  });
});

server.route("/stream/unread", function(req) {
  db.getUnread(function(err, items) {
    req.reply({
      items: items
    })
  })
});

server.route("/stream/read", function(req) {
  var items = req.params.items;
  if (items) {
    items = items.split(",");
    items.forEach(function(item) {
      db.mark(item);
    });
    req.reply({marked: items.length});
  }
  req.reply({marked: 0});
});
