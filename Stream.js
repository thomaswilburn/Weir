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
    db.getUnread(limit),
    db.getStatus()
  ]);
  if (unread && status) {
    req.reply({
      items: unread,
      unread: status.unread,
      total: status.total,
      last: status.last
    });
  } else {
    req.reply({
      error: "Could not get unread items"
    });
  }
});

server.route("/stream/mark", async function (req) {
  var item = req.params.item;
  await db.mark(item);
  var { total, unread, last } = await db.getStatus();
  req.reply({ marked: 1, total, unread, last });
});

server.route("/stream/markRefresh", async function (req) {
  var items = req.params.items;
  if (!items) return req.reply({ marked: 0 });
  items = items.split(",");
  var limit = req.params.limit || cfg.displayLimit || 15;
  await Promise.all(items.map((item) => db.mark(item)));
  var [unread, status] = await Promise.all([
    db.getUnread(limit),
    db.getStatus()
  ]);
  req.reply({
    items: unread,
    total: status.total,
    unread: status.unread,
    last: status.last
  });
});
