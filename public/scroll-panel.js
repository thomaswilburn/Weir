import ElementBase from "./lib/elementBase.js";
import events from "./lib/events.js";

class ScrollPanel extends ElementBase {

  static boundMethods = ["onRequest", "onPageDown"];

  constructor() {
    super();

    this.setAttribute("tabindex", "-1");
    this.addEventListener("requestscroll", this.onRequest);

    this.addEventListener("keydown", e => {
      if (e.key == " ") return e.stopImmediatePropagation();
    });
  }

  static observedAttributes = ["page-on"];

  attributeChangedCallback(attr, was, value) {
    if (was) {
      events.off(was, this.onPageDown);
    }
    if (value) {
      events.on(value, this.onPageDown);
    }
  }

  onPageDown() {
    this.scroll({
      top: this.scrollTop + this.offsetHeight * .9,
      behavior: "smooth"
    });
  }

  onRequest(e) {
    var { element, top, behavior } = e.detail;
    if (element) {
      // scroll this element so that the item is visible
      var here = this.getBoundingClientRect();
      var there = element.getBoundingClientRect();
      if (there.top > here.top && there.bottom < here.bottom) return;
      var offset = 0;
      if (there.top < here.top) {
        offset = there.top - here.top - 30;
      } else {
        offset = there.bottom - here.bottom + 30;
      }
      this.scrollBy({ top: offset, behavior })
    }
    if ("top" in e.detail) {
      // scroll to a specific position
      this.scrollTo({ top, behavior });
    }
  }
}

ScrollPanel.define("scroll-panel");
