import ElementBase from "./lib/elementBase.js";
import events from "./lib/events.js";

class ActionButton extends ElementBase {
  
  static boundMethods = [
    "onDisableEvent",
    "onEnableEvent",
    "onClick",
    "sendAction"
  ];

  constructor() {
    super();

    this.timeout = null;
    this.confirmDelay = 0;

    this.elements.button.addEventListener("click", this.onClick);
  }

  static observedAttributes = ["disabled", "confirm-delay", "href"];
  static mirroredProps = ["command", "href"];

  attributeChangedCallback(attr, was, value) {
    switch (attr) {
      case "confirm-delay":
        this.confirmDelay = value * 1;
      break;

      case "disabled":
        this.elements.button.disabled = value != null;
      break;

      case "href":
        if (value != null) {
          this.elements.link.setAttribute("href", value);
          this.elements.link.append(this.elements.slot);
          this.elements.link.toggleAttribute("hidden", false);
          this.elements.button.toggleAttribute("hidden", true);
        } else {
          this.elements.link.removeAttribute("href");
          this.elements.button.append(this.elements.slot);
          this.elements.button.toggleAttribute("hidden", false);
          this.elements.link.toggleAttribute("hidden", true);
        }
    }
  }

  onDisableEvent() {

  }

  onEnableEvent() {

  }

  get disabled() {
    return this.elements.button.disabled;
  }

  set disabled(value) {
    return this.elements.button.disabled = value;
  }

  onClick() {
    if (!this.command) return;
    var [ animation ] = this.elements.delay.getAnimations();
    if (animation) {
      console.log("Cancelling...");
      // end the delay early
      animation.cancel();
    } else {
      animation = this.elements.delay.animate([
        { strokeDashoffset: 25.2 },
        { strokeDashoffset: 0 }
      ], {
        duration: this.confirmDelay
      });
      animation.onfinish = this.sendAction;
    }
  }

  sendAction() {
    console.log(this.command);
    events.fire(this.command);
  }
}

ActionButton.define("action-button", "action-button.html");
