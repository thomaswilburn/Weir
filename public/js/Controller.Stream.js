(function() {

  var Weir = angular.module("Weir");

  //stream controller handles UI for the stream and status
  Weir.controller("Weir.StreamController", [
    "$scope",
    "Weir.Server",
    "Weir.Scroll",
    "Weir.Sanitize",
    "Weir.Events",
    "Weir.DisplayStack",
    function($scope, Server, Scroll, Sanitize, Events, Stack) {

      $scope.stream = Server.stream;
      Stack.push("stream");
      //I would really like the base application to provide this instead...
      $scope.stack = Stack;

      Scroll.top();
      Events.on("scroll", function() {
        $scope.$apply();
      })

      $scope.activate = function(item, fromScroll) {
        Server.activate(item);
        if (!fromScroll) Scroll.toID(item.id);
      };

      $scope.mark = function(item) {
        Server.markAsRead(item);
      };

      $scope.markRefresh = function() {
        $scope.message = "Marking items as read, refreshing...";
        Server.markAll().then(function() {
          $scope.message = "";
          Scroll.top();
        });
      };

      $scope.refresh = function() {
        $scope.message = "Refreshing feeds...";
        Server.refresh().then(function() {
          $scope.message = "";
          Scroll.top();
        });
      }

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

      angular.element(document).bind("keypress keydown", function(e) {
      
        //really need a better key handler than this.
        if (Stack.visible !== "stream") return;
      
        var key = e.charCode ? String.fromCharCode(e.charCode).toLowerCase() : e.keyCode;
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
          case 34: //page down
            //take over scrolling, unfortunately
            e.preventDefault();
            e.stopImmediatePropagation();
            var active = document.querySelector("li.active");
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
            break;
        }
        $scope.$apply();
      });

    }]);

})();

