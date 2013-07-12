var Manos = require("./Manos");
var fs = require("fs");
var cfg = require("./Config");
if (typeof cfg.logPath == "undefined" || cfg.logPath !== false) {
  var logPath = cfg.logPath || "weir.log";
  var logStream = fs.createWriteStream(logPath, {encoding: "utf-8", flags: "a"});
}

module.exports = {
  log: function() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift(new Date().toGMTString() + " - ");
    console.log.apply(console, args);
    if (cfg.logPath === false) {
      return;
    }
    var strings = args.map(function(item) { return JSON.stringify(item) }).join(" ") + "\n";
    logStream.write(strings);
  }
}

process.on("exit", function() {
  logStream.close();
});
