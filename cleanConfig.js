/*

This script makes a copy of my configuration file with all personal information wiped out, 
so I can change it as much as I want and still have an example for checking into source 
control.

It turns out, despite the stupid name, that JSON.stringify() already has a value replacer 
built in. Handy!

*/

var cfg = require("./Config");
var fs = require("fs");

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
