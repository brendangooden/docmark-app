import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

// One-time storage migration from the previous product name.
try {
  const legacy = localStorage.getItem("rulr.v1");
  if (legacy && !localStorage.getItem("docmark.v1")) {
    localStorage.setItem("docmark.v1", legacy);
  }
} catch {
  /* ignore */
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
