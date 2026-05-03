/**
 * Idempotently injects GitHub's official `buttons.js` script so that
 * `<a class="github-button">` elements get hydrated into the live widget.
 * Resolves once the script is ready (or immediately if already present).
 */
const SCRIPT_SRC = "https://buttons.github.io/buttons.js";

let loadPromise: Promise<void> | null = null;

declare global {
  interface Window {
    __githubButtonsRendered?: () => void;
  }
}

export const ensureGithubButtons = (): Promise<void> => {
  if (typeof document === "undefined") return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve) => {
    const existing = document.querySelector(
      `script[src="${SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => resolve(); // Fail open — link still works.
    document.head.appendChild(script);
  });
  return loadPromise;
};
