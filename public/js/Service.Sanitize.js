(function() {

  var Weir = angular.module("Weir");

  //Weir.Sanitize cleans up HTML for malicious elements, changes link targets, and defers images
  Weir.service("Weir.Sanitize", ["$document", "Weir.Events", function($document, Events) {
    var slice = Array.prototype.slice;
    var each = Array.prototype.forEach;

    //function to show deferred images on scroll or refresh
    var throttled = false;
    var rate = 100; //num of ms to wait before running again
    var deferred = [];
    var reveal = function() {
      if (throttled) return;
      throttled = true;
      setTimeout(function() { throttled = false }, rate);
      //we lazy-filter the list, so that deferred images are never checked again
      deferred = deferred.filter(function(img) {
        var coords = img.getBoundingClientRect();
        if (coords.top && coords.top < window.scrollY + window.innerHeight) {
          img.src = img.getAttribute("data-src");
          img.removeAttribute("data-src");
          return false;
        }
        return true;
      });
    };

    window.addEventListener("scroll", reveal);
    //using the Events service means we don't have recursive dependencies
    Events.on("refresh", function() {
      setTimeout(function() {
        deferred = slice.call(document.querySelectorAll("[data-src]"));
        reveal();
      }, 50);
    });

    return {
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
        var images = doc.querySelectorAll("img");
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
