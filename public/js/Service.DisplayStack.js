(function() {

  var Weir = angular.module("Weir");

  //Weir.DisplayStack provides an interface for choosing which panel is exclusively shown
  //TODO: It also provides a handy dialog creator
  Weir.service("Weir.DisplayStack", [function() {
    var stack = [];
    var facade = {
      visible: "",
      top: function() { return stack[0] || "" },
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

  Weir.directive("stackId", ["Weir.DisplayStack", function(Stack) {
    return {
      restrict: "A",
      link: function(scope, element, attr) {
        scope.$watch(Stack.top, function(now, then) {
          element.css("display", now == attr.stackId ? "inherit" : "none");
        });
      }
    };
  }]);

})();
