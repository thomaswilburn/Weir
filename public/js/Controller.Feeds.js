(function() {

  var Weir = angular.module("Weir");
  
  Weir.controller("Weir.FeedController", [
    "$scope",
    "Weir.Request",
    "Weir.Events",
    function($scope, Request, Events) {
    
      $scope.feeds = [];
      
      var results = {
        200: "ok",
        304: "ok",
        0: "error"
      }
      
      Events.on("stack:activate", function(panel) {
        if (panel !== "feeds") return;

        $scope.loading = true;
        
        Request.ask({
          url: "feeds"
        }).then(function(data) {
          $scope.loading = false;
          if (data.feeds) {
            data.feeds.forEach(function(feed) {
              feed.health = results[feed.last_result] || "error";
            });
            $scope.feeds = data.feeds;
          }
        });
      });
      
      $scope.subscribe = function() {
        console.log($scope.subscribeURL);
      };
    
    }]);

})();
