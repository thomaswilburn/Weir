var Weir = require("./Module");

//Weir.Events makes it easy for services to couple loosely--like, say, Sanitize and StreamController
Weir.service("Weir.Events", [function() {
  var registry = {};

  return {
    on: function(event, listener) {
      if (!registry[event]) {
        registry[event] = [];
      }
      registry[event].push(listener);
    },
    off: function(event, listener) {
      if (!registry[event]) return;
      if (listener) {
        registry[event] = registry[event].filter(function(f) {
          return f !== listener;
        });
      } else {
        registry[event] = [];
      }
    },
    fire: function(event, data) {
      if (!registry[event]) return;
      //make a copy for immutability during this tick
      var callbacks = registry[event].slice();
      data = data || {};
      data.type = data.type || event;
      for (var i = 0; i < callbacks.length; i++) {
        callbacks[i](data);
      }
    }
  }

}]);

module.exports = "Weir.Events";