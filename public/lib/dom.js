var h = function(tag, attrs = {}, children = "") {
  if (typeof attrs == "string" || typeof attrs == "number" || attrs instanceof Array) {
    children = attrs;
    attrs = {};
  }
  var [ tagName, ...classes ] = tag.split(".");
  var element = document.createElement(tagName);
  for (var c of classes) {
    element.classList.add(c);
  }
  for (var k in attrs) {
    element.setAttribute(k, attrs[k]);
  }
  if (typeof children == "string" || typeof children == "number") {
    element.innerHTML = children;
  } else {
    children.forEach(c => element.appendChild(c));
  }
  return element;
}

export default h;