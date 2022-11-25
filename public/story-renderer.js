import ElementBase from "./lib/elementBase.js";
import events from "./lib/events.js";
import * as sanitize from "./lib/sanitize.js";
import * as server from "./lib/server.js";

import "./visibility-observer.js";
import "./action-button.js";

var formatOptions = {
  dateStyle: "medium",
  timeStyle: "medium",
};
var formatter = new Intl.DateTimeFormat("en-US", formatOptions);

class StoryRenderer extends ElementBase {
  static boundMethods = [
    "onSelect",
    "onShare",
    "onCopy",
    "onOpen",
    "onFeature",
    "onKey",
    "onScrollRequest",
  ];

  constructor() {
    super();
    events.on("reader:render", this.onSelect);
    events.on("reader:share", this.onShare);
    events.on("reader:copy", this.onCopy);
    events.on("reader:open-tab", this.onOpen);
    events.on("view:reader", this.onFeature);
    events.on("reader:scroll", this.onScrollRequest);
    this.addEventListener("keydown", this.onKey);
    this.current = null;
    this.placeholder = this.elements.content.innerHTML;

    if (!("share" in navigator)) {
      this.elements.shareButton.toggleAttribute("hidden", true);
      if ("clipboard" in navigator) {
        this.elements.copyButton.removeAttribute("hidden");
      }
    }
  }

  clear() {
    this.current = null;
    var { metadata, title, content, shareButton, openButton, copyButton } =
      this.elements;
    metadata.toggleAttribute("hidden", true);
    title.innerHTML = "";
    content.innerHTML = this.placeholder;
    shareButton.toggleAttribute("disabled", true);
    copyButton.toggleAttribute("disabled", true);
    openButton.toggleAttribute("disabled", true);
    if (this.elements.content.visible) events.fire("view:list");
  }

  onSelect(data) {
    if (!data) return this.clear();
    var {
      metadata,
      feed,
      title,
      author,
      published,
      content,
      shareButton,
      openButton,
      copyButton,
    } = this.elements;
    if (this.current && data.id != this.current.id && content.visible) {
      server.mark(this.current.id);
    }
    copyButton.toggleAttribute("disabled", false);
    shareButton.toggleAttribute("disabled", false);
    openButton.toggleAttribute("disabled", false);
    this.current = data;
    try {
      var date = new Date(Date.parse(data.published));
      published.innerHTML = formatter.format(date);
    } catch (err) {
      // if the date can't be parsed, handle it
      console.log(`Couldn't parse date: ${data.published}`);
      published.innerHTML = data.published || "No date";
    }
    metadata.removeAttribute("hidden");
    feed.innerHTML = data.feed;
    title.innerHTML = data.title;
    author.innerHTML = data.author || "Nobody";
    content.innerHTML = sanitize.html(data.content, data);
    this.elements.viewport.scrollTop = 0;
    this.elements.title.focus({ preventScroll: true });
    this.elements.openButton.href = data.url;
  }

  onFeature() {
    this.scrollIntoView({
      behavior: "smooth",
    });
  }

  onShare() {
    if (!this.current) return;
    if (!("share" in navigator)) return;
    var { url, title } = this.current;
    navigator.share({ url, title });
  }

  async onCopy() {
    if (!("clipboard" in navigator)) return;
    var { url } = this.current;
    try {
      await navigator.clipboard.writeText(url);
      events.fire("toast:alert", "Copied story URL");
    } catch (err) {
      events.fire("toast:error", "Unable to copy URL");
    }
  }

  onOpen() {
    if (!this.current) return;
    var { url } = this.current;
    window.open(url, "_blank");
  }

  onScrollRequest() {
    this.elements.viewport.scroll({
      top: this.elements.viewport.scrollTop + this.elements.viewport.offsetHeight * .9,
      behavior: "smooth"
    });
  }

  onKey(e) {
    if (e.key == " ") {
      e.stopImmediatePropagation();
    }
  }
}

StoryRenderer.define("story-renderer", "story-renderer.html");
