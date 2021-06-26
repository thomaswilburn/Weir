import ElementBase from "./lib/elementBase.js";
import events from "./lib/events.js";
import h from "./lib/dom.js";

class ToastAlert extends ElementBase {

  static boundMethods = ["createToast"];

  constructor() {
    super();

    this.toasts = [];
    events.on("toast:alert", (m, d) => this.createToast(m, d));
    events.on("toast:error", (m, d) => this.createToast(m, d, "error"));
  }

  async createToast(message, duration = 3000, type = "standard") {
    var element = h(`div.toast.${type}`, message);
    this.elements.container.append(element);
    var enter = element.animate({ opacity: [0, 1] }, 400);
    var exit = element.animate({
      opacity: [1, 0],
      transform: ["scale(1)", "scale(.5)"]
    }, { duration: 400, delay: 400 + duration, easing: "ease" });
    await exit.finished;
    element.remove();
  }

  static template = `
<style>
:host {
  display: block;
  --direction: column;
  font-family: var(--display-font);
  font-size: var(--font-size-4);
}

[as="container"] {
  display: flex;
  flex-direction: var(--direction);
  pointer-events: none;
  padding: 20px 0;
}

.toast {
  background: #555E;
  border: 1px solid #FFF8;
  box-shadow: 0 4px 8px #0003;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  margin: 12px auto;
  max-width: 200px;
}

.toast.error {
  background: #500E;
}

@media (max-width: 600px) {
  .toast {
    font-size: var(--font-size-5);
  }
}
</style>
<div as="container"></div>
  `;

}

ToastAlert.define("toast-alert");
