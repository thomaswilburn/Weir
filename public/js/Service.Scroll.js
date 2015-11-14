
  //jump to top
window.scroll(0, 0);

var Weir = require("./Module");

//Weir.Scroll is meant to handle all scrolling functionality--
//both reacting to them, and instigating them.
Weir.service("Weir.Scroll", [
  require("./Service.Events"),
  "$location",
  "$anchorScroll",
  function(Events, $location, $anchorScroll) {

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
      //working around digest for scrollIntoView is failing, let's just use $anchorScroll
      $location.hash(id);
      $anchorScroll();
    }

    //API facade
    return {
      toID: scrollToHash,
      top: function() {
        $location.hash("");
        document.body.scrollTop = document.documentElement.scrollTop = 0;
      }
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
        if (offset.top && offset.top > -10 && offset.top < window.innerHeight * .25) {
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
        if (offset.top && offset.top < window.innerHeight) {
          scope.$eval(attributes.scrollEnter);
          scope.$apply();
          Events.off("scroll", trigger);
        }
      };
      Events.on("scroll", trigger);
    }
  }
}]);

module.exports = "Weir.Scroll";
