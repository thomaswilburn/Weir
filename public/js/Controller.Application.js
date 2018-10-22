var Weir = require("./Module");

Weir.controller("Weir.Application", [
  "$scope",
  require("./Service.DisplayStack"), //Weir.DisplayStack",
  require("./Service.Events"), //Weir.Events",
  require("./Service.Server"), //Weir.Server",
  require("./Service.LocalSettings"), //Weir.LocalSettings",
  function($scope, Stack, Events, Server, Settings) {

    Stack.push("stream");
    $scope.stack = Stack;
    
    $scope.theme = "light";
    $scope.themeColor = "#808";

    var lastCount = 0;

    var updateStatus = function() {
      var enabled = Settings.get().application.flash;
      var count = Server.stream.unread;
      var favicon = document.querySelector("head link[rel=icon]");
      if (count != lastCount || 
        (count === 0 && document.title.indexOf("(")) //handle leftovers
      ) {
        if (enabled) {
          document.title = "Weir " + (count ? "(" + count + ")" : "");
        }
        favicon.parentElement.removeChild(favicon);
        favicon = document.createElement("link");
        favicon.rel = "icon";
        if (count > lastCount) {
          favicon.href = "./favicon-alert.png";
        } else {
          favicon.href = "./favicon.png";
        }
        document.head.appendChild(favicon);
      }
      lastCount = count;
    };

    Events.on("status", updateStatus);
    Events.on("activated", updateStatus);
    
    $scope.toggleTheme = function() {
      $scope.theme = $scope.theme == "light" ? "dark" : "light";
      $scope.themeColor = $scope.theme == "light" ? "#808" : "#888";//"#FFA200";
    };
    
    var keyMapping = {
      "j": "next",
      "k": "previous",
      "m": "markRefresh",
      "r": "refresh",
      ".": "refresh",
      " ": "pagedown",
      34 : "pagedown",
      13 : "open",
      "Enter" : "open"
    };

    angular.element(document).bind("keypress", function(e) {

      if (["INPUT", "TEXTAREA"].indexOf(e.target.tagName) > -1) return;
    
      var char = String.fromCharCode(e.charCode).toLowerCase().trim();
      var action = keyMapping[char] || keyMapping[e.code] || keyMapping[e.keyCode];
      
      if (action == "pagedown") {
        //take over scrolling, unfortunately
        var active = document.querySelector("li.active");
        if (!active) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        var next = active.nextSibling;
        var current = document.documentElement.scrollTop || document.body.scrollTop;
        var distance = window.innerHeight * .8;
        if (next && next.tagName == "LI") {
          var nextOffset = next.getBoundingClientRect().top;
          if (nextOffset < distance) {
            Events.fire("key:next");
            $scope.$apply();
            return;
          }
        }
        document.documentElement.scrollTop = document.body.scrollTop = distance + current;
        if (window.scrollY == current) {
          Events.fire("key:next");
          $scope.$apply();
          return;
        }
        $scope.$apply();
      } else if (action) {
        e.preventDefault();
        e.stopImmediatePropagation();
        Events.fire("key:" + action);
        $scope.$apply();
      }
      
    });

    var alertFactory = function(property) {
      var timeout = null;
      var show = "show" + property[0].toUpperCase() + property.substr(1);
      var hide = "hide" + property[0].toUpperCase() + property.substr(1);
      $scope[show] = function(message, duration) {
        if (typeof duration == "undefined") {
          duration = 5;
        }
        if (timeout) clearTimeout(timeout);
        $scope[property] = message;
        // duration 0 means keep message until hidden
        if (duration) timeout = setTimeout(function() {
          $scope[property] = "";
          $scope.$apply();
          timeout = null;
        }, duration * 1000);
      };
      $scope[hide] = function() {
        $scope[property] = "";
      };
    };
    
    alertFactory("message");
    alertFactory("warning");
    alertFactory("error");
    
  }
]);
