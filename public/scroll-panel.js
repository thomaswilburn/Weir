import ElementBase from "./lib/elementBase.js";

class ScrollPanel extends ElementBase {

  static boundMethods = ["onRequest"];

  constructor() {
    super();

    this.addEventListener("requestscroll", this.onRequest);
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