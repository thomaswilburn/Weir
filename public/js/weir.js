var Weir = angular.module("Weir", []);

//SERVICES

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

//Weir.Sanitize cleans up HTML for malicious elements, changes link targets, and defers images
Weir.service("Weir.Sanitize", ["$document", "Weir.Events", function($document, Events) {
  var slice = Array.prototype.slice;
  var each = Array.prototype.forEach;

  var throttled = false;
  var rate = 100; //num of ms to wait before running again
  var deferred = [];
  var reveal = function() {
    if (throttled) return;
    throttled = true;
    setTimeout(function() { throttled = false }, rate);
    //we lazy-filter the list, so that deferred images are never checked again
    deferred = deferred.filter(function(img) {
      var coords = img.getBoundingClientRect();
      if (coords.top && coords.top < window.scrollY + window.innerHeight) {
        img.src = img.getAttribute("data-src");
        img.removeAttribute("data-src");
        return false;
      }
      return true;
    });
  };

  window.addEventListener("scroll", reveal);
  //using the Events service means we don't have recursive dependencies
  Events.on("refresh", function() {
    setTimeout(function() {
      deferred = slice.call(document.querySelectorAll("[data-src]"));
      reveal();
    }, 50);
  });

  return {
    prepare: function(unclean, url) {
      var doc = document.implementation.createHTMLDocument("");
      doc.body.innerHTML = unclean;

      //remove trailing slashes
      url = url.replace(/\/$/, "");
      var relative = /^\/[^\\]/;

      //change targets on all links, map to site URL if relative
      var links = doc.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        link.target = "_blank";
        var href = link.href;
        if (relative.test(href)) {
          link.href = url + href;
        }
      }

      //remove scripts and other malicious elements (add to selector)
      var scripts = doc.querySelectorAll("script");
      each.call(scripts, function(script) {
        script.parentElement.removeChild(script);
      });

      //process images (defer loading, remove dimensions for CSS reasons)
      var images = doc.querySelectorAll("img");
      each.call(images, function(img) {
        var src = img.src
        if (relative.test(src)) {
          src = url + src;
        }
        img.setAttribute("data-src", src);
        img.src = "";
        
        img.removeAttribute("height");
        img.removeAttribute("width");
      });

      return doc.body.innerHTML;
    }
  }

}]);

//LocalSettings allows us to set various per-device options
//It provides defaults based on form factor
Weir.service("Weir.LocalSettings", [function() {

  var storageKey = "WeirOptions";
  var settings;

  var fill = function(src, dest) {
    for (var key in src) {
      if (!dest[key]) {
        dest[key] = src[key];
      }
    }
  }

  var form = matchMedia("(min-width: 800px)").matches ? "large" : "small"
  var defaults = {
    stream: {
      startActive: form == "large",
      length: 10,
      infinite: false
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
      settings = fill(defaults, settings);
      settings.save = function() {
        localStorage.setItem(storageKey, JSON.stringify(this));
      }
    }
    return settings;
  };

  return {
    get: revive,
    reset: function() {
      localStorage.removeItem(storageKey);
    }
  }

}]);

//Weir.Request handles making requests with TOTP auth (eventually)
Weir.service("Weir.Request", ["$http", "$q", function($http, $q) {
  return {
    ask: function(options) {
      //add security wrapper
      var defaults = {
        url: "",
        method: "GET"
      };
      var deferred = $q.defer();
      var request = $http(angular.extend(defaults, options));
      request.success(deferred.resolve);
      request.error(deferred.reject);
      return deferred.promise;
    }
  }
}]);

//Weir.Server talks to the DB and gets stream updates
Weir.service("Weir.Server", [
  "Weir.Request",
  "Weir.Sanitize",
  "Weir.LocalSettings",
  "$q",
  "Weir.Events",
  function(Request, Sanitize, Settings, $q, Events) {
    var ask = Request.ask;

    var stream = {
      items: [],
      unread: 0,
      total: 0,
      updatedAt: new Date()
    };
    
    var updateStatus = function(data) {
      stream.unread = data.unread || stream.unread;
      stream.total = data.total || stream.total;
      stream.updatedAt = new Date();
    };
    
    var updateItems = function(data) {
      data.items.forEach(function(item) {
        item.content = Sanitize.prepare(item.content, item.site);
      });
      stream.items = data.items;
      if (Settings.get().stream.startActive && stream.items.length) {
        stream.items[0].active = true;
      }
      Events.fire("refresh");
    };

    var facade = {
      stream: stream,
      markAsRead: function(item) {
        ask({
          url: "stream/mark",
          params: {
            item: item.id
          }
        }).then(function() {
          stream.unread--;
        });
      },
      markAll: function() {
        var ids = stream.items.map(function(item) {
          return item.id;
        });
        var deferred = $q.defer();
        ask({
          url: "stream/markRefresh",
          params: {
            items: ids.join(",")
          }
        }).then(function(data) {
          updateItems(data);
          updateStatus(data);
          deferred.resolve();
        });
        return deferred.promise;
      },
      refresh: function() {
        var deferred = $q.defer();
        ask({
          url: "stream/unread"
        }).then(function(data) {
          updateStatus(data);
          updateItems(data);
          deferred.resolve();
        });
        return deferred.promise;
      },
      stats: function() {
        ask({
          url: "stream/status"
        }).then(function(data) {
          updateStatus(data);
        });
      },
      activate: function(item) {
        for (var i = 0; i < stream.items.length; i++) {
          var post = stream.items[i];
          //mark previously active item as read
          if (post.active) {
            post.read = true;
            //TODO: should mark as read on the server, too
          }
          post.active = false;
        }
        item.active = true;
      }
    }
    
    var auto = function() {
      facade.stats();
      //this should be set from local settings
      setTimeout(auto, 60 * 1000);
    };
    
    auto();

    facade.refresh();

    return facade;

}]);

//CONTROLLERS

//stream controller handles UI for the stream and status
Weir.StreamController = function($scope, Server, $document, $anchorScroll, $location) {

  $scope.showSettings = false;
  $scope.stream = Server.stream;

  $scope.activate = function(item) {
    Server.activate(item);
    $location.replace();
    $location.hash(item.id);
    $anchorScroll();
  };

  $scope.markRefresh = function() {
    $scope.message = "Marking items as read, refreshing...";
    Server.markAll().then(function() {
      $scope.message = "";
      $location.replace();
      $location.hash("top");
      $anchorScroll();
    });
    $scope.$apply();
  };

  $scope.refresh = function(apply) {
    $scope.message = "Refreshing feeds...";
    Server.refresh().then(function() {
      $scope.message = "";
      $location.replace();
      $location.hash("top");
      $anchorScroll();
    });
    if (apply) $scope.$apply();
  }

  $scope.next = function() {
    var stream = Server.stream.items;
    var current = stream.filter(function(i) { return i.active }).pop();
    var currentIndex = stream.indexOf(current);
    if (currentIndex == stream.length - 1) {
      return $scope.markRefresh();
    }
    $scope.activate(stream[currentIndex + 1]);
    $scope.$apply();
  };

  $scope.previous = function() {
    var stream = Server.stream.items;
    var current = stream.filter(function(i) { return i.active }).pop();
    var currentIndex = stream.indexOf(current);
    if (currentIndex == 0) return;
    $scope.activate(stream[currentIndex - 1]);
    $scope.$apply();
  }

  angular.element($document).bind("keypress", function(e) {
    var key = String.fromCharCode(e.charCode).toLowerCase();
    switch (key) {
      case "j":
        $scope.next();
        break;

      case "k":
        $scope.previous();
        break;

      case ".":
        $scope.markRefresh();
        break;

      case "r":
        $scope.refresh();
        break;

      case " ":
        //adjust selection based on position
        break;
    }
  });

  $scope.toggleSettings = function(state) {
    $scope.showSettings = state;
  }
};
Weir.StreamController.$inject = ["$scope", "Weir.Server", "$document", "$anchorScroll", "$location"];

Weir.SettingsController = function($scope, $Settings, $Request) {
  var fileInput = document.querySelector(".inputOPML");
  fileInput.addEventListener("change", function() {
    var file = fileInput.files[0];
    if (file) {
      var xhr = new XMLHttpRequest();
      xhr.onload = function() { $scope.toggleSettings(false); $scope.refresh(); };
      xhr.open("POST", "meta/import/opml");
      xhr.send(file);
    }
  });

  $scope.saveSettings = function() {
    $scope.toggleSettings(false);
  }
}
Weir.SettingsController.$inject = ["$scope", "Weir.LocalSettings", "Weir.Request"];

//DIRECTIVES
Weir.directive("preventDefault", function() {
  return {
    restrict: "A",
    link: function(scope, element) {
      element.bind("click", function(e) {
        if (e.which == 1) e.preventDefault();
      });
    }
  }
});
