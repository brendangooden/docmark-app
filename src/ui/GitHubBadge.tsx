import { useEffect } from "react";
import { ensureGithubButtons } from "./githubButtons";

// Inline GitHub mark — Lucide brand icons aren't available in this version.
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.85 9.73.5.1.68-.22.68-.49 0-.24-.01-.87-.01-1.7-2.78.62-3.37-1.37-3.37-1.37-.46-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.57 2.34 1.12 2.91.86.09-.66.35-1.12.63-1.38-2.22-.26-4.55-1.14-4.55-5.06 0-1.12.39-2.04 1.03-2.76-.1-.26-.45-1.3.1-2.71 0 0 .84-.27 2.75 1.05A9.4 9.4 0 0 1 12 7.07c.85.004 1.71.12 2.51.34 1.91-1.32 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.64 1.03 2.76 0 3.93-2.34 4.79-4.57 5.05.36.32.68.94.68 1.9 0 1.37-.01 2.47-.01 2.81 0 .27.18.6.69.49A10.04 10.04 0 0 0 22 12.25C22 6.58 17.52 2 12 2Z"
    />
  </svg>
);

const REPO = "brendangooden/docmark-app";
const REPO_URL = `https://github.com/${REPO}`;

export const GitHubBadge = () => {
  useEffect(() => {
    ensureGithubButtons();
  }, []);

  return (
    <span className="inline-flex items-center gap-2">
      <a
        href={REPO_URL}
        target="_blank"
        rel="noreferrer"
        title={`View ${REPO} on GitHub`}
        className="inline-flex items-center gap-1.5 rounded px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-slate-100"
      >
        <GithubIcon className="h-4 w-4" />
        <span className="hidden md:inline">{REPO}</span>
      </a>
      {/* GitHub Buttons widget — hydrated by buttons.github.io/buttons.js */}
      <a
        className="github-button"
        href={REPO_URL}
        data-color-scheme="no-preference: dark; light: dark; dark: dark;"
        data-icon="octicon-star"
        data-size="small"
        data-show-count="true"
        aria-label={`Star ${REPO} on GitHub`}
      >
        Star
      </a>
    </span>
  );
};
