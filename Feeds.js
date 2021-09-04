var server = require("./Server");
var db = require("./Database");
var Hound = require("./Hound");

server.route("/feeds", async function (req) {
  try {
    var feeds = await db.getFeedsDetailed();
    return req.reply({ feeds });
  } catch (err) {
    return req.reply({ feeds: [] });
  }
});

server.route("/feeds/subscribe", async function (req) {
  console.log(`Subscription request for ${req.params.url}`);
  try {
    var meta = await Hound.getMeta(req.params.url);
    var row = await db.subscribe(meta);
    meta.id = row.id;
    req.reply(meta);
  } catch (err) {
    console.log(err);
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
