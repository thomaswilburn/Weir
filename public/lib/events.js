var registry = {};

export var on = function(e, callback) {
  if (!registry[e]) registry[e] = new Set();
  registry[e].add(callback);
}

export var off = function(e, callback) {
  if (!registry[e]) return;
  registry[e].delete(callback);
  if (!registry[e].size) delete registry[e];
}

export var fire = function(e, ...data) {
  if (!registry[e]) return;
  // console.log(e, ...data);
  for (var callback of registry[e]) {
    callback(...data);
  }
}

var events = { on, off, fire };

export default events;
