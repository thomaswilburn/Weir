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

      //TODO: 
      // - set up keyboard handler
      // - register for app-wide events
      
    }
  ]);

})();

