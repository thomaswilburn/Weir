var server = require("./Server");
var db = require("./Database");
var cfg = require("./Config");

//load import/export routes
require("./Freedom");

server.route("/stream/status", async function (req) {
  var counts = await db.getStatus();
  req.reply(counts);
});

server.route("/stream/unread", async function (req) {
  var limit = cfg.displayLimit || 15;
  if (req.params.limit) {
    limit = req.params.limit;
  }
  var [unread, status] = await Promise.all([
    db.getUnread(limit, done),
    db.getStatus()
  ]);
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
});

server.route("/stream/mark", async function (req) {
  var items = req.params.item;
  if (!items) return req.reply({ marked: 0 });
  await Promise.all(items.map((item) => db.mark(item)));
  var { total, unread } = await db.getStatus();
  req.reply({ marked: items.length, total, unread });
});

server.route("/stream/markRefresh", async function (req) {
  var items = req.params.items;
  if (!items) return req.reply({ marked: 0 });
  items = items.split(",");
  await Promise.all(items.map((item) => db.mark(item)));
  var [unread, status] = await Promise.all([
    db.getUnread(limit),
    db.getStatus()
  ]);
  req.reply({
    items: unread[1],
    total: status[1] && status[1].total,
    unread: status[1] && status[1].unread
  });
});
