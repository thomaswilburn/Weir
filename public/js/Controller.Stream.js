var Weir = require("./Module");

//stream controller handles UI for the stream and status
Weir.controller("Weir.StreamController", [
  "$scope",
  "Weir.Server",
  "Weir.Scroll",
  "Weir.Sanitize",
  "Weir.Events",
function($scope, Server, Scroll, Sanitize, Events) {

  $scope.stream = Server.stream;

  Scroll.top();
  
  var onError = function() {
    Server.stream.loading = false;
    $scope.hideMessage();
    $scope.showError("Oh no! Something went wrong...");
  };

  $scope.activate = function(item, fromScroll) {
    Server.activate(item);
    if (!fromScroll) Scroll.toID(item.id);
  };
  
  $scope.deactivate = function($event, item) {
    item.active = false;
    Server.stream.currentItem = null;
    $event.stopImmediatePropagation();
  }

  $scope.mark = function(item) {
    Server.markAsRead(item);
  };

  $scope.markRefresh = function() {
    $scope.showMessage("Marking items as read, refreshing...", 0);
    Server.markAll().then(function() {
      $scope.hideMessage();
      Scroll.top();
    }, onError);
  };

  $scope.refresh = function() {
    $scope.showMessage("Refreshing feeds...");
    Server.refresh().then(function() {
      $scope.hideMessage();
      Scroll.top();
    }, onError);
  };

  $scope.next = function() {
    var item = Server.next();
    if (item) {
      Scroll.toID(item.id);
    } else {
      return $scope.markRefresh();
    }
  };

  $scope.previous = function() {
    var item = Server.previous();
    if (item) {
      Scroll.toID(item.id);
    }
  }

  $scope.openCurrent = function() {
    if (!Server.stream.currentItem || !Server.stream.currentItem.url) return;
    window.open(Server.stream.currentItem.url, "_blank");
  }
  
  Events.on("refresh", function() {
    Scroll.top();
  });
  
  Events.on("key:next", $scope.next);
  Events.on("key:previous", $scope.previous);
  Events.on("key:refresh", $scope.refresh);
  Events.on("key:markRefresh", $scope.markRefresh);
  Events.on("key:open", $scope.openCurrent);

}]);

module.exports = "Weir.StreamController";
