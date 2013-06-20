(function() {

  var Weir = angular.module("Weir");

  //Weir.DisplayStack provides an interface for choosing which panel is exclusively shown
  //TODO: It also provides a handy dialog creator
  Weir.service("Weir.DisplayStack", [function() {
    var stack = [];
    var facade = {
      visible: "",
      push: function(panel) {
        stack = stack.filter(function(item) { return item != panel });
        stack.unshift(panel);
        facade.visible = stack[0];
      },
      pop: function(panel) {
        stack = stack.filter(function(item) { return item != panel });
        stack.shift(panel);
        facade.visible = stack[0];
      },
      dialog: function(content, callback) {}
    }

    return facade;

  }]);

//DisplayController serves as our root-level controller to manage views
//It sets up the first of our display stack, "stream"
Weir.controller("Weir.DisplayController", ["$scope", "Weir.DisplayStack", function($scope, Display) {

  $scope.display = Display;

  /*
  Available stack IDs: 
    stream
    settings
    feeds
  */
  Display.push("stream");

}]);

})();