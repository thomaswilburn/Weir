(function() {

  var Weir = angular.module("Weir");

  //LocalSettings allows us to set various per-device options
  //It provides defaults based on form factor
  Weir.service("Weir.LocalSettings", [function() {

    var storageKey = "WeirOptions";
    var settings;

    var fill = function(dest, src) {
      for (var key in src) {
        //awkward recursive merge that will work for this single use case
        if (dest[key] && typeof dest[key] == "object" && !(dest[key] instanceof Array)) {
          fill(dest[key], src[key]);
        } else if (typeof dest[key] == "undefined") {
          dest[key] = src[key];
        }
      }
    }

    var form = matchMedia("(min-width: 800px)").matches ? "large" : "small"
    var defaults = {
      stream: {
        startActive: form == "large",
        length: 10,
        autoRefresh: form == "large" ? 2 : 0,
        deferImages: true
      },
      application: {
        flash: true
        //key mapping
        //overall visual theme?
      }
    };
    
    var revive = function() {
      var settings = localStorage.getItem(storageKey);
      if (!settings) {
        //if never used, install
        settings = defaults;
      } else {
        //otherwise, parse and augment with any new properties
        settings = JSON.parse(settings);
        fill(settings, defaults);
      }
      settings.save = function() {
        localStorage.setItem(storageKey, JSON.stringify(this));
      }
      return settings;
    };
    
    revive.reset = function() {
      localStorage.removeItem(storageKey);
    }

    return {
      get: revive,
      reset: revive.reset
    }
    
  }]);

})();
