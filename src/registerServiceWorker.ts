if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/offline-sw.js").catch(() => {
      // Offline support is best-effort for the web build; the APK bundles assets natively.
    });
  });
}
