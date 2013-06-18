(function() {

    var Weir = angular.module("Weir");

    //Weir.Scroll is meant to handle all scrolling functionality--
    //both reacting to them, and instigating them.
    Weir.service("Weir.Scroll", ["$document", "$location", "$anchorScroll", "Weir.Events",
        function($document, $location, $anchorScroll, Events) {

            //register scroll listener, dispatch throttled events
            var guard = false;
            var onScroll = function() {
                if (guard) return;
                guard = true;
                setTimeout(function() { guard = false }, 100);
                Events.fire("scroll");
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
    Weir.directive("scrollPast", ["Weir.Events", function(Events) {
        return {
            restrict: "A",
            link: function(scope, element, attributes) {
                var trigger = function() {
                    var offset = element[0].getBoundingClientRect();
                    if (offset.top < 0) {
                        scope.$eval(attributes.scrollPast);
                        Events.off("scroll", trigger);
                    }
                };
                Events.on("scroll", trigger);
            }
        };
    }]);

})();