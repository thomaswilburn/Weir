import "./connection-status.js";
import "./feed-manager.js";
import "./letter-dream.js";
import "./scroll-panel.js";
import "./story-list.js";
import "./story-renderer.js";
import "./toast-alert.js";

import "./lib/keys.js";

var themeBox = document.querySelector(".theme-select");
var onThemeChange = function() {
  var selected = themeBox.querySelector(":checked");
  var theme = selected ? selected.value : "auto";
  document.documentElement.dataset.theme = theme;
  localStorage.setItem("weirTheme", theme);
}

if (localStorage.getItem("weirTheme")) {
  var theme = localStorage.getItem("weirTheme");
  var input = themeBox.querySelector(`[value="${theme}"]`);
  if (input) {
    input.checked = true;
  }
}

themeBox.addEventListener("change", onThemeChange);
onThemeChange();
