(function() {

  var Weir = angular.module("Weir");

  //Weir.Sanitize cleans up HTML for malicious elements, changes link targets, and defers images
  Weir.service("Weir.Sanitize", ["$document", "Weir.Events", function($document, Events) {
    var slice = Array.prototype.slice;
    var each = Array.prototype.forEach;

    //function to show deferred images on scroll or refresh
    var deferred = [];
    var revealScrolled = function() {
      //we lazy-filter the list, so that deferred images are never checked again
      deferred = deferred.filter(function(img) {
        var coords = img.getBoundingClientRect();
        if (coords.top && coords.top < window.innerHeight) {
          img.src = img.getAttribute("data-src");
          img.removeAttribute("data-src");
          return false;
        }
        return true;
      });
    };

    var revealElement = function(element) {
      var deferred = element[0].querySelectorAll("[data-src]");
      for (var i = 0; i < deferred.length; i++) {
        var item = deferred[i];
        item.src = item.getAttribute("data-src");
        item.removeAttribute("data-src");
      };
    };

    //using the Events service means we don't have recursive dependencies
    //we'll try doing this manually instead from now on
    /*Events.on("scrollEnd", revealScrolled);
    Events.on("refresh", function() {
      setTimeout(function() {
        deferred = slice.call(document.querySelectorAll("[data-src]"));
        reveal();
      }, 50);
    });*/
    Events.on("activated", function() {
      setTimeout(function() {
        var active = angular.element(document.querySelector(".active"));
        revealElement(active);
      }, 100);
    });

    return {
      reveal: revealElement,
      prepare: function(unclean, url) {
        var doc = document.implementation.createHTMLDocument("");
        doc.body.innerHTML = unclean;

        //remove trailing slashes
        url = url.replace(/\/$/, "");
        var relative = /^\/[^\\]/;

        //change targets on all links, map to site URL if relative
        var links = doc.querySelectorAll('a');
        for (var i = 0; i < links.length; i++) {
          var link = links[i];
          link.target = "_blank";
          var href = link.href;
          if (relative.test(href)) {
            link.href = url + href;
          }
        }

        //remove scripts and other malicious elements (add to selector)
        var scripts = doc.querySelectorAll("script");
        each.call(scripts, function(script) {
          script.parentElement.removeChild(script);
        });

        //process images (defer loading, remove dimensions for CSS reasons)
        var images = doc.querySelectorAll("img, iframe");
        each.call(images, function(img) {
          var src = img.src
          if (relative.test(src)) {
            src = url + src;
          }
          img.setAttribute("data-src", src);
          img.src = "";
          
          img.removeAttribute("height");
          img.removeAttribute("width");
        });

        return doc.body.innerHTML;
      }
    }

  }]);

})();
