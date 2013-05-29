var fs = require("fs");
var json = fs.readFileSync("cfg.json");
var config = JSON.parse(json);

console.log(config);

module.exports = config;
