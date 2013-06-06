/*

This script makes a copy of my configuration file with all personal information wiped out, 
so I can change it as much as I want and still have an example for checking into source 
control.

It turns out, despite the stupid name, that JSON.stringify() already has a value replacer 
built in. Handy!

Running this script will also generate a package.json file, or update your existing package 
with the current node_modules.

*/

var cfg = require("./Config");
var fs = require("fs");
var path = require("path");

var replacer = function(key, value) {
  if (key === "") return value;
  switch (typeof value) {
    case "number": return 0;
    case "string": return "string";
    case "boolean": return false;
    case "function": return "f()";
    case "object":
      if (value instanceof Array) return [];
      return value;
  }
}

console.log(JSON.stringify(cfg, replacer, 2));

fs.writeFileSync("cfg-example.json", JSON.stringify(cfg, replacer, 2));

var package = {};
if (fs.existsSync("package.json")) {
  package = JSON.parse(fs.readFileSync("package.json"))
}
package.dependencies = {};
var modules = fs.readdirSync("./node_modules");
modules.forEach(function(mod) {
  var packagePath = path.join("./node_modules/", mod, "/package.json");
  if (fs.existsSync(packagePath)) {
    var modPackage = JSON.parse(fs.readFileSync(packagePath));
    package.dependencies[modPackage.name] = modPackage.version || "*";
  }
});
fs.writeFileSync("package.json", JSON.stringify(package, null, 2), "utf8");
