import { useEffect } from "react";
import { ensureGithubButtons } from "./githubButtons";

const REPO = "brendangooden/docmark-app";
const REPO_URL = `https://github.com/${REPO}`;
const AUTHOR_URL = "https://github.com/brendangooden";

export const Footer = () => {
  useEffect(() => {
    ensureGithubButtons();
  }, []);

  return (
    <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-slate-800 bg-slate-900 px-4 py-1.5 text-[11px] text-slate-400">
      <span>
        Made by{" "}
        <a
          href={AUTHOR_URL}
          target="_blank"
          rel="noreferrer"
          className="text-slate-200 hover:text-cyan-300 hover:underline"
        >
          Brendan Gooden
        </a>
      </span>
      <span className="inline-flex items-center gap-2">
        <a
          href={REPO_URL}
          target="_blank"
          rel="noreferrer"
          className="hidden text-slate-400 hover:text-slate-200 hover:underline sm:inline"
        >
          {REPO}
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
    </footer>
  );
};
