var cfg = require("./Config.js");
var stream = require("./Stream.js");
var db = require("./Database.js");
var Hound = require("./Hound.js");
var ErrLog = require("./ErrLog.js");
var Server = require("./Server.js");
//var Setup = require("./Setup.js");

var fetch = function() {
    Hound.fetch();
    var interval = (cfg.updateInterval || 15) * 60 * 1000;
    setTimeout(fetch, interval / 10);
}

var Reader = function() {
	Hound.setDB(db);
	fetch();
    Hound.on("fetch:start", function() {
        console.log("Updating feeds...");
    });
};

module.exports = Reader;


