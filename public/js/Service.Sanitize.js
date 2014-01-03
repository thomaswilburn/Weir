(function() {

  var Weir = angular.module("Weir");

  //Weir.Sanitize cleans up HTML for malicious elements, changes link targets, and defers images
  Weir.service("Weir.Sanitize", [
    "$document", 
    "Weir.Events", 
    "Weir.LocalSettings",
    function($document, Events, Settings) {
    var slice = Array.prototype.slice;
    var each = Array.prototype.forEach;
    
    var revealElement = function(element) {
      if (element.html) element = element[0];
      var deferred = element.querySelectorAll("[data-src]");
      for (var i = 0; i < deferred.length; i++) {
        var item = deferred[i];
        //this is currently broken in Chrome for Android, not sure why.
        //item.classList.add("hidden");
        item.classList.remove("hidden");
        var onload = item.onload = function() {
          item.classList.remove("hidden");
        };
        item.src = item.getAttribute("data-src");
        item.removeAttribute("data-src");
      };
    };

    return {
      reveal: revealElement,
      prepare: function(unclean, url) {
        var doc = document.implementation.createHTMLDocument("");
        doc.body.innerHTML = unclean;
        var streamWidth = document.querySelector(".stream-container").offsetWidth;

        //remove trailing slashes
        url = url.replace(/\/$/, "");
        var relative = /^\/[^\/]/;

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

        //remove scripts and other malicious elements
        var scripts = doc.querySelectorAll("script");
        each.call(scripts, function(script) {
          script.parentElement.removeChild(script);
        });
        var spamblock = ".mf-viral, img[src*='feedsportal']";
        var spam = doc.querySelectorAll(spamblock);
        each.call(spam, function(s) {
          s.parentElement.removeChild(s);
        });

        //Remove oversized widths (Dinosaur Comics, weird embeds)
        var oversized = doc.querySelectorAll("[width],[style]");
        each.call(oversized, function(element) {
          var width = element.getAttribute("width") || element.style.width;
          if (typeof width == "string") {
            width = width.replace(/[a-z]/gi, "") * 1;
          }
          if (!width) return;
          if (width > streamWidth) {
            var height = element.getAttribute("height") || element.style.height;
            if (typeof height == "string") {
              height = height.replace(/[a-z]/gi, "") * 1;
            }
            if (height) {
              //scale
              element.setAttribute("height", height * (streamWidth / width));
              element.setAttribute("width", streamWidth);
            } else {
              element.removeAttribute("width");
            }
            element.style.width = null;
            element.style.height = null;
          }
        });

        //process images (defer loading, remove dimensions for CSS reasons)  
        var images = doc.querySelectorAll("img, iframe");
        if (Settings.get().stream.deferImages) each.call(images, function(img) {
          var src = img.getAttribute("src");
          if (relative.test(src)) {
            src = url + src;
          }
          img.setAttribute("data-src", src);
          img.removeAttribute("src");
          
          img.removeAttribute("height");
          img.removeAttribute("width");
          img.classList.add("hidden");
        });
        

        return doc.body.innerHTML;
      }
    }

  }]);

  Weir.directive("scrollReveal", ["Weir.Events", "Weir.Sanitize", function(Events, Sanitize) {
    return {
      restrict: "A",
      link: function(scope, element) {
        var enter = function() {
          var offset = element[0].getBoundingClientRect();
          if (offset.height && offset.top < window.innerHeight) {
            Sanitize.reveal(element);
            Events.off("scroll", enter);
          }
        }
        Events.on("scroll", enter);
        setTimeout(enter);
      }
    };
  }]);
  
  Weir.directive("clickReveal", ["Weir.Sanitize", function(Sanitize) {
    return {
      restrict: "A",
      link: function(scope, element) {
        var reveal = function() {
          requestAnimationFrame(function() { Sanitize.reveal(element); });
          element.unbind("click", reveal);
        };
        element.bind("click", reveal);
      }
    };
  }]);

})();
