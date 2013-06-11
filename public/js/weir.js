var Weir = angular.module("Weir", []);

//SERVICES

//Weir.Sanitize cleans up HTML for malicious elements, changes link targets, and defers images
Weir.service("Weir.Sanitize", ["$document", function($document) {
  var slice = Array.prototype.slice;
  var each = Array.prototype.forEach;

  //this is a little clumsy, but it works.
  var throttled = false;
  var rate = 100; //num of ms to wait before running again
  var reveal = function() {
    if (throttled) return;
    throttled = true;
    setTimeout(function() { throttled = false }, rate);
    var deferred = slice.call(document.querySelectorAll("[data-src]"));
    deferred.forEach(function(img) {
      var coords = img.getBoundingClientRect();
      if (coords.top && coords.left) {
        img.src = img.getAttribute("data-src");
        img.removeAttribute("data-src");
      }
    });
  }

  window.addEventListener("scroll", reveal);

  return {
    prepare: function(unclean) {
      var doc = document.implementation.createHTMLDocument("");
      doc.body.innerHTML = unclean;

      //change targets on all links
      var links = doc.querySelectorAll('a');
      for (var i = 0; i < links.length; i++) {
        var link = links[i];
        link.target = "_blank";
      }

      //remove scripts and other malicious elements (add to selector)
      var scripts = doc.querySelectorAll("script");
      each.call(scripts, function(script) {
        script.parentElement.removeChild(script);
      });

      //defer images
      var images = doc.querySelectorAll("img");
      each.call(images, function(img) {
        img.setAttribute("data-src", img.src);
        img.src = "";
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
  function(Request, Sanitize, Settings, $q) {
    var ask = Request.ask;

    var stream = {
      items: [],
      unread: 0,
      total: 0,
      updatedAt: new Date()
    };
    
    var updateStatus = function(data) {
      stream.unread = data.unread;
      stream.total = data.total;
      stream.updatedAt = new Date();
    };
    
    var updateItems = function(data) {
      data.items.forEach(function(item) {
        item.content = Sanitize.prepare(item.content);
      });
      stream.items = data.items;
      if (Settings.get().stream.startActive) {
        stream.items[0].active = true;
      }
    };

    var facade = {
      stream: stream,
      markAsRead: function(item) {
        ask({
          url: "/stream/mark",
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
          url: "/stream/markRefresh",
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
        ask({
          url: "/stream/unread"
        }).then(function(data) {
          updateItems(data);
        });
      },
      stats: function() {
        ask({
          url: "/stream/status"
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

    facade.stats();
    facade.refresh();

    return facade;

}]);

//CONTROLLERS

//stream controller handles UI for the stream and status
Weir.StreamController = function($scope, Server, $document, $anchorScroll, $location) {

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
      case "r":
        $scope.markRefresh();
        break;

      case " ":
        //adjust selection based on position
        break;
    }
  })
};
Weir.StreamController.$inject = ["$scope", "Weir.Server", "$document", "$anchorScroll", "$location"];

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
