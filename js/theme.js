/**
 * Appearance choice for Helical Spring Designer (SC-001).
 * "system" follows the phone or browser colour setting.
 * "light" and "dark" stay on this device until the user picks System again.
 * The choice is stored separately from the calculator inputs.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.SpringTheme = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var KEY = "spring-calc-theme";

  function normaliseTheme(value) {
    if (value === "light" || value === "dark" || value === "system") return value;
    return "system";
  }

  function resolvedTheme(choice, prefersDark) {
    choice = normaliseTheme(choice);
    if (choice === "light" || choice === "dark") return choice;
    return prefersDark ? "dark" : "light";
  }

  function readChoice(storage) {
    try {
      return normaliseTheme(storage.getItem(KEY));
    } catch (err) {
      return "system";
    }
  }

  function writeChoice(storage, choice) {
    choice = normaliseTheme(choice);
    try {
      storage.setItem(KEY, choice);
    } catch (err) { /* private mode / quota */ }
    return choice;
  }

  function colorSchemeContent(resolved) {
    return resolved === "dark" ? "dark" : "light only";
  }

  function apply(doc, choice, prefersDark) {
    choice = normaliseTheme(choice);
    var resolved = resolvedTheme(choice, prefersDark);
    var rootEl = doc.documentElement;
    rootEl.setAttribute("data-theme", choice);
    rootEl.setAttribute("data-resolved", resolved);
    if (doc.querySelector) {
      var meta = doc.querySelector('meta[name="color-scheme"]');
      if (meta && meta.setAttribute) meta.setAttribute("content", colorSchemeContent(resolved));
    }
    return { choice: choice, resolved: resolved, colorScheme: colorSchemeContent(resolved) };
  }

  function attach(doc, win) {
    var storage = win.localStorage;
    var media = win.matchMedia ? win.matchMedia("(prefers-color-scheme: dark)") : null;

    function prefersDark() {
      return !!(media && media.matches);
    }

    function current() {
      return apply(doc, readChoice(storage), prefersDark());
    }

    function setChoice(choice) {
      writeChoice(storage, choice);
      return current();
    }

    function onSystemChange() {
      if (readChoice(storage) === "system") current();
    }

    if (media) {
      if (typeof media.addEventListener === "function") {
        media.addEventListener("change", onSystemChange);
      } else if (typeof media.addListener === "function") {
        media.addListener(onSystemChange);
      }
    }

    current();
    return {
      KEY: KEY,
      getChoice: function () { return readChoice(storage); },
      setChoice: setChoice,
      refresh: current
    };
  }

  return {
    KEY: KEY,
    normaliseTheme: normaliseTheme,
    resolvedTheme: resolvedTheme,
    readChoice: readChoice,
    writeChoice: writeChoice,
    colorSchemeContent: colorSchemeContent,
    apply: apply,
    attach: attach
  };
});
