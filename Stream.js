var server = require("./Server");
var db = require("./Database");
var Manos = require("./Manos");

//load import/export routes
require("./Freedom");

server.route("/stream/status", function(req) {
  db.getStatus(function(err, counts) {
    req.reply(counts);
  });
});

server.route("/stream/unread", function(req) {
  Manos.when(
    db.getUnread,
    db.getStatus,
    function(unread, status) {
      if (!unread[0] && !status[0]) {
        req.reply({
          items: unread[1],
          unread: status[1].unread,
          total: status[1].total
        });
      } else {
        req.reply({
          error: "Could not get unread items"
        });
      }
    }
  )
});

server.route("/stream/mark", function(req) {
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

server.route("/stream/markRefresh", function(req) {
  var items = req.params.items;
  if (items) {
    items = items.split(",");
    items = items.map(function(i) {
      return function(c) {
        db.mark(i, c);
      };
    });
    items.push(function() {
      Manos.when(
        db.getUnread,
        db.getStatus,
        function(unread, status) {
          req.reply({
            items: unread[1],
            total: status[1] && status[1].total,
            unread: status[1] && status[1].unread
          });
        }
      );
    });
    return Manos.when.apply(null, items);
  }
  req.reply({marked: 0});
});
