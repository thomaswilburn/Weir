import events from "./events.js";

var keymap = {
  "enter": "reader:open-tab",
  "j": "stream:next",
  "k": "stream:previous",
  ".": "stream:refresh",
  "m": "stream:mark-all",
  "s": "reader:share",
  " ": "reader:scroll"
}

document.body.addEventListener("keydown", function(e) {
  var mapping = keymap[e.key.toLowerCase()];
  if (typeof mapping == "string") mapping = [mapping];
  if (!mapping) return;
  var [ command, ...args ] = mapping;
  console.log(e.key, command, args);
  if (command) events.fire(command, ...args);
});
