var fs = require("fs");
var json = fs.readFileSync("cfg.json");
try {
  var config = JSON.parse(json);
} catch (e) {
  console.log("Couldn't parse cfg.json!", e);
  process.exit();
}

module.exports = config;
