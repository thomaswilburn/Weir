var cfg = require("./Config.js");
var stream = require("./Stream.js");
var db = require("./Database.js");
var Hound = require("./Hound.js");
var console = require("./DevConsole.js");
var Server = require("./Server.js");

var fetch = function() {
  Hound.fetch();
  var interval = (cfg.updateInterval || 15) * 60 * 1000;
  //fetch only gets 1/10 the feeds, so divide up into 10 fetches
  setTimeout(fetch, interval / 10);
}

var Reader = function() {
	Hound.setDB(db);
	fetch();
};

module.exports = Reader;


