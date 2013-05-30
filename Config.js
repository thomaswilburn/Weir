var fs = require("fs");
var json = fs.readFileSync("cfg.json");
var config = JSON.parse(json);

module.exports = config;
