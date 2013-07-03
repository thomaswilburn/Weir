(function() {

  var Weir = angular.module("Weir");

  Weir.controller("Weir.Application", [
    "$scope",
    "Weir.DisplayStack",
    "Weir.Events",
    "Weir.Server",
    function($scope, Stack, Events, Server) {

      Stack.push("stream");
      $scope.stack = Stack;

      var lastCount = 0;

      var updateStatus = function() {
        var count = Server.stream.unread;
        var favicon = document.querySelector("head link[rel=icon]");
        if (count != lastCount) {
          document.title = "Weir " + (count ? "(" + count + ")" : "");
          favicon.parentElement.removeChild(favicon);
          favicon = document.createElement("link");
          favicon.rel = "icon";
          if (count > lastCount) {
            favicon.href = "/favicon-alert.ico";
          } else {
            favicon.href = "/favicon.ico";
          }
          document.head.appendChild(favicon);
        }
        lastCount = count;
      };

      Events.on("status", updateStatus);
      Events.on("activated", updateStatus);
      
      var keyMapping = {
        "j": "next",
        "k": "previous",
        "m": "markRefresh",
        "r": "refresh",
        ".": "refresh",
        " ": "pagedown",
        34 : "pagedown"
      }

      //Should really move this to its own service...      
      angular.element(document).bind("keypress keydown", function(e) {

        if (["INPUT", "TEXTAREA"].indexOf(e.target.tagName) > -1) return;
      
        var key = e.charCode ? String.fromCharCode(e.charCode).toLowerCase() : e.keyCode;
        var action = keyMapping[key];
        
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
              return $scope.next();
            }
          }
          document.documentElement.scrollTop = document.body.scrollTop = distance + current;
          if (window.scrollY == current) {
            $scope.next();
          }
          $scope.$apply();
        } else if (action) {
          Events.fire("key:" + action);
        }
        
      });

      //TODO: 
      // - register for app-wide events
      
    }
  ]);

})();

