// Apply the saved light/dark theme before React renders, to avoid a flash.
try {
  var t = localStorage.getItem("lingua:theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  document.documentElement.dataset.theme = t;
} catch (e) { /* storage unavailable */ }
