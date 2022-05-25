import { sanitizerBlocklist } from "../config.js";

export var html = function(input, post) {

  var dom = document.implementation.createHTMLDocument("");
  dom.body.innerHTML = input;

  var isRelative = /^\/[^\/]/;

  // remove scripts, styles
  var interactive = dom.querySelectorAll("script, style, link");
  for (var i of interactive) {
    i.remove();
  }

  // remove inline styles
  var styled = dom.querySelectorAll("[style],[width],[height]");
  for (var s of styled) {
    s.removeAttribute("style");
    s.removeAttribute("height");
    s.removeAttribute("width");
  }

  // remove spammy social stuff
  // we should make this configurable at some point
  var spam = dom.querySelectorAll(sanitizerBlocklist.join());
  for (var s of spam) {
    s.remove();
  }

  // eliminate meaningless class names
  // these shouldn't matter in shadow, but let's be safe
  var classed = dom.querySelectorAll("[class]");
  for (var c of classed) {
    c.removeAttribute("class");
  }

  // update image references
  var images = dom.querySelectorAll("img");
  for (var img of images) {
    img.setAttribute("loading", "lazy");
    var src = img.getAttribute("src");
    if (!src) continue;
    // force absolute URLs
    if (isRelative.test(src)) {
      src = new URL(src, post.url).href;
    }
    // force HTTPS
    src = src.replace(/^http:/, "https:");
    img.src = src;
  }

  // remove H1 elements that are duplicated
  // this is primarily for 538, which is annoying
  var h1s = dom.querySelectorAll("h1");
  for (var h1 of h1s) {
    if (h1.innerHTML.trim() == post.title) {
      h1.remove();
    }
  }

  return dom.body.innerHTML;

}

export var innerHTML = function(input) {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quote;")
}
