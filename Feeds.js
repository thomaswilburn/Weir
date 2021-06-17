var server = require("./Server");
var db = require("./Database");
var Hound = require("./Hound");

server.route("/feeds", async function (req) {
  try {
    var feeds = db.getFeedsDetailed();
    return req.reply({ feeds });
  } catch (err) {
    return req.reply({ feeds: [] });
  }
});

server.route("/feeds/subscribe", async function (req) {
  try {
    var meta = Hound.getMeta(req.params.url);
    var row = await db.subscribe(meta);
    meta.id = row.id;
    req.reply(meta);
  } catch (err) {
    return req.reply(err);
  }
});

server.route("/feeds/unsubscribe", async function (req) {
  try {
    var result = await db.unsubscribe(req.params.id);
    req.reply(result)
  } catch (err) {
    req.reply(err);
  }
});
