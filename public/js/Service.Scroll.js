(function() {

  //jump to top
  window.scroll(0, 0);

  var Weir = angular.module("Weir");

  //Weir.Scroll is meant to handle all scrolling functionality--
  //both reacting to them, and instigating them.
  Weir.service("Weir.Scroll", ["$document", "$location", "$anchorScroll", "Weir.Events",
    function($document, $location, $anchorScroll, Events) {

      //register scroll listener, dispatch throttled events
      var guard = false;
      var endTimeout = null;
      var onScroll = function() {
        if (guard) return;
        guard = true;
        setTimeout(function() { guard = false }, 50);
        Events.fire("scroll");
        //also trigger scroll-end events, which are cheaper
        clearTimeout(endTimeout);
        endTimeout = setTimeout(function() {
          Events.fire("scrollEnd");
        }, 300)
      }

      window.addEventListener("scroll", onScroll);

      //expose a method for scrolling to a specific item, basically wrapping location/anchorScroll
      var scrollToHash = function(id) {
        $location.replace();
        $location.hash(id);
        $anchorScroll();
      }

      //API facade
      return {
        toID: scrollToHash
      };

    }
  ]);


  //Add a directive to allow actions when scrolling past (i.e. activate on scroll)
  Weir.directive("scrollFocus", ["Weir.Events", function(Events) {
    return {
      restrict: "A",
      link: function(scope, element, attributes) {
        var trigger = function() {
          var offset = element[0].getBoundingClientRect();
          if (offset.top && offset.top > 0 && offset.top < window.innerHeight * .25) {
            scope.$eval(attributes.scrollFocus);
            scope.$apply();
          }
        };
        Events.on("scroll", trigger);
      }
    };
  }]);

  //By contrast, scrollEnter fires only when an element enters the screen for the first time
  Weir.directive("scrollEnter", ["Weir.Events", function(Events) {
    return {
      restrict: "A",
      link: function(scope, element, attributes) {
        var trigger = function() {
          var offset = element[0].getBoundingClientRect();
          if (offset.top && offset.top > 0 && offset.top < window.innerHeight) {
            scope.$eval(attributes.scrollEnter);
            scope.$apply();
            Events.off("scroll", trigger);
          }
        };
        Events.on("scroll", trigger);
      }
    }
  }]);

})();
