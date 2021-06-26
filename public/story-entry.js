import ElementBase from "./lib/elementBase.js";

class StoryEntry extends ElementBase {

  static boundMethods = ["onClick"];

  constructor() {
    super();
    this.addEventListener("click", this.onClick);
  }

  static observedAttributes = ["story", "feed", "story"];
  static mirroredProps = ["story", "feed"];

  attributeChangedCallback(attr, was, value) {
    switch (attr) {
      case "story":
        this.elements.link.href = value;
      break;

      case "feed":
        this.elements.feed.innerHTML = value;
      break;
    }
  }

  onClick(e) {
    e.preventDefault();
    this.dispatch("story-click");
  }

}

StoryEntry.define("story-entry", "story-entry.html");