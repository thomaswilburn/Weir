var Weir = require("./Module");

//Weir.Sanitize cleans up HTML for malicious elements, changes link targets, and defers images
Weir.service("Weir.Sanitize", [
  "$document", 
  require("./Service.Events"), 
  require("./Service.LocalSettings"),
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
        var href = link.getAttribute("href");
        if (!href) break;
        //convert relative links to absolute
        if (!link.hostname || link.hostname == window.location.hostname) {
          //remove opening slash for consistency
          href = href.replace(/^\//, "");
          link.href = url + "/" + href;
        }
      }

      //remove scripts, stylesheets, and other malicious elements
      var scripts = doc.querySelectorAll("script, link, style");
      each.call(scripts, function(script) {
        script.parentElement.removeChild(script);
      });
      var spamblock = ".mf-viral, img[src*='feedsportal']";
      var spam = doc.querySelectorAll(spamblock);
      each.call(spam, function(s) {
        s.parentElement.removeChild(s);
      });
      
      //classes won't mean anything in our stylesheet
      var classed = doc.querySelectorAll("[class]");
      each.call(classed, function(element) {
        element.className = "";
      });

      //Remove oversized widths (Dinosaur Comics, weird embeds)
      var oversized = doc.querySelectorAll("[width],[style]");
      each.call(oversized, function(element) {
        //strip out positional styles
        var offset = ["margin", "padding"];
        offset.forEach(function(style) {
          element.style[style] = "";
          ["Left", "Right", "Top", "Bottom"].forEach(function(direction) {
            element.style[style + direction] = "";
          });
        });
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

module.exports = "Weir.Sanitize";