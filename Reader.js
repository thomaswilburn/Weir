var cfg = require("./Config");
var Server = require("./Server");
var stream = require("./Stream");
var db = require("./Database");
var Hound = require("./Hound");
var console = require("./DevConsole");

var fetch = function() {
  Hound.fetch();
  var interval = (cfg.updateInterval || 15) * 60 * 1000;
  //fetch only gets 1/10 the feeds, so divide up into 10 fetches
  setTimeout(fetch, interval / 10);
  console.log("fetch timeout, next in", interval / 10);
}

//sets up the database if none exists
db.create();

var Reader = function() {
	Hound.setDB(db);
	fetch();
};

module.exports = Reader;
