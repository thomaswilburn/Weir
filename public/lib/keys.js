import events from "./events.js";

var keymap = {
  "Enter": "reader:open-tab",
  "j": "stream:next",
  "k": "stream:previous",
  ".": "stream:refresh",
  "m": "stream:mark-all",
  "s": "reader:share"
}

document.body.addEventListener("keydown", function(e) {
  var mapping = keymap[e.key];
  if (typeof mapping == "string") mapping = [mapping];
  if (!mapping) return;
  var [ command, ...args ] = mapping;
  console.log(e.key, command, args);
  if (command) events.fire(command, ...args);
});
