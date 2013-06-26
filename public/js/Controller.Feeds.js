(function() {

  var Weir = angular.module("Weir");
  
  Weir.controller("Weir.FeedController", [
    "$scope",
    "Weir.Request",
    "Weir.Events",
    function($scope, Request, Events) {
    
      $scope.feeds = [];
      
      Events.on("stack:activate", function(panel) {
        if (panel !== "feeds") return;
        
        Request.ask({
          url: "feeds"
        }).then(function(data) {
          if (data.feeds) {
            $scope.feeds = data.feeds;
          }
        });
      });
      
      $scope.subscribe = function() {
        console.log($scope.subscribeURL);
      };
    
    }]);

})();
