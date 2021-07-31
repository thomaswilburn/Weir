import ElementBase from "./lib/elementBase.js";
import events from "./lib/events.js";
import * as sanitize from "./lib/sanitize.js";
import * as stories from "./lib/stories.js";

import "./visibility-observer.js";
import "./action-button.js";

var formatOptions = {
  dateStyle: "medium",
  timeStyle: "medium"
}
var formatter = new Intl.DateTimeFormat("en-US", formatOptions);

class StoryRenderer extends ElementBase {
  static boundMethods = ["onSelect", "onShare", "onOpen", "onFeature"];

  constructor() {
    super();
    events.on("reader:render", this.onSelect);
    events.on("reader:share", this.onShare);
    events.on("reader:open-tab", this.onOpen);
    events.on("view:reader",this.onFeature);
    this.current = null;
    this.placeholder = this.elements.content.innerHTML;

    if (!("share" in navigator)) {
      this.elements.shareButton.toggleAttribute("hidden", true);
    }
  }

  clear() {
    this.current = null;
    var { metadata, title, content, shareButton, openButton } = this.elements;
    metadata.toggleAttribute("hidden", true);
    title.innerHTML = "";
    content.innerHTML = this.placeholder;
    shareButton.toggleAttribute("disabled", true);
    openButton.toggleAttribute("disabled", true);
    if (this.elements.content.visible) events.fire("view:list");
  }

  onSelect(data) {
    if (!data) return this.clear();
    if (this.current && data.id != this.current.id) {
      stories.mark(this.current.id);
    }
    var {
      metadata, feed, title, author, published,
      content, shareButton, openButton
    } = this.elements;
    shareButton.toggleAttribute("disabled", false);
    openButton.toggleAttribute("disabled", false);
    this.current = data;
    var date = new Date(Date.parse(data.published));
    metadata.removeAttribute("hidden");
    feed.innerHTML = data.feed;
    title.innerHTML = data.title;
    author.innerHTML = data.author || "Nobody";
    published.innerHTML = formatter.format(date);
    content.innerHTML = sanitize.html(data.content, data.url);
    this.dispatch("requestscroll", { top: 0 });
    this.elements.title.focus({ preventScroll: true });
    this.elements.openButton.href = data.url;
  }

  onFeature() {
    this.scrollIntoView({
      behavior: "smooth"
    });
  }

  onShare() {
    if (!this.current) return;
    if (!("share" in navigator)) return;
    var { url, title } = this.current;
    navigator.share({ url, title });
  }

  onOpen() {
    if (!this.current) return;
    var { url } = this.current;
    window.open(url, "_blank");
  }
}

StoryRenderer.define("story-renderer", "story-renderer.html");
