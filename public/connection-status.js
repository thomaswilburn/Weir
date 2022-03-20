import ElementBase from "./lib/elementBase.js";
import { get, post } from "./lib/api.js";
import events from "./lib/events.js";
import { endpoint } from "./config.js";

var fills = {
  error: "#A41D29",
  unknown: "#DFC952",
  connected: "#808",
  offline: "#BFBFBF"
};

class ConnectionStatus extends ElementBase {
  static boundMethods = [
    "onKey",
    "networkUpdate",
    "ping",
    "authenticate",
    "apiSuccess",
    "apiFailure"
  ];

  constructor() {
    super();

    this.validTOTP = false;

    window.addEventListener("offline", this.networkUpdate);
    window.addEventListener("online", this.networkUpdate);

    this.elements.submit.addEventListener("click", this.authenticate);
    this.elements.totp.addEventListener("keydown", this.onKey);

    var url = new URL(endpoint, window.location.href);
    this.elements.domain.innerHTML = url.hostname;

    events.on("connection:totp-challenge", this.networkUpdate);
    events.on("connection:successful-request", this.apiSuccess);
    events.on("connection:error", this.apiFailure);

    this.ping();
  }

  connectedCallback() {
    this.scrollIntoView();
  }

  async ping() {
    if (!navigator.onLine) return this.networkUpdate();
    this.setStatus("unknown", "Connecting");
    this.elements.totp.value = "";
    try {
      var response = await get("/checkpoint");
      if (!response.secure) {
        this.setStatus("error", "Insecure");
        this.elements.insecureQR.src = response.secretQR;
        this.elements.insecureHash.value = response.secret;
        this.scrollIntoView({ behavior: "smooth" });
      } else if (!response.authenticated) {
        this.setStatus("error", "Unauthenticated");
        this.updateTOTP(false);
      } else {
        this.setStatus("connected", "Connected");
        this.updateTOTP(true);
      }
      this.elements.auth.toggleAttribute("hidden", response.authenticated || !response.secure);
      this.elements.insecure.toggleAttribute("hidden", response.secure);
    } catch (err) {
      this.setStatus("error", "Unreachable");
    }
  }

  setStatus(type, text) {
    this.elements.icon.setAttribute("fill", fills[type]);
    this.elements.status.innerHTML = text;
  }

  networkUpdate() {
    var status = window.navigator.onLine;
    if (status) {
      this.ping();
    } else {
      this.setStatus("offline", "Offline");
    }
  }

  updateTOTP(status) {
    // only show error and focus the field once
    if (this.validTOTP && !status) {
      this.scrollIntoView({ behavior: "smooth" });
      this.elements.totp.focus({ preventScroll: true });
      events.fire("toast:error", "TOTP error");
    }
    this.validTOTP = status;
  }

  apiSuccess() {
    this.setStatus("connected", "Connected");
    this.elements.auth.toggleAttribute("hidden", true);
    this.elements.insecure.toggleAttribute("hidden", true);
  }

  apiFailure() {
    this.setStatus("error", "Request failed");
    setTimeout(this.ping, 30 * 1000);
  }

  async authenticate() {
    var value = this.elements.totp.value.trim();
    if (!value) return;
    var result = await post("/checkpoint", { totp: value });
    if (result.success) {
      this.setStatus("connected", "Connected");
      events.fire("connection:established");
    } else {
      this.setStatus("error", "Bad TOTP");
      this.updateTOTP(false);
    }
    this.elements.auth.toggleAttribute("hidden", result.success);
  }

  onKey(e) {
    e.stopImmediatePropagation();
    if (e.key == "Enter") {
      this.authenticate();
    }
  }
}

ConnectionStatus.define("connection-status", "connection-status.html");
