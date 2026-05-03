# DocMark

[![Live at docmark.app](https://img.shields.io/badge/live-docmark.app-22d3ee?style=for-the-badge)](https://docmark.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)](LICENSE)

In-browser document measure & markup tool. Drop a **PDF**, **JPG**, or **PNG**, set a scale, then chain distances, draw shapes, and add annotations — all without leaving the browser.

**Try it now** → <https://docmark.app>

- 100 % client-side — your file never leaves the browser. No backend, no accounts, no tracking.
- Static-host friendly (deployed on Cloudflare Pages).
- Works with construction plans, screenshots, photos of drawings, AI-generated mockups — anything you can drop in.

## Features
- **Calibrate** by drawing a line on a known dimension and entering its real-world length.
- **Distance** (chained polyline) and **Area** (closed polygon) measurements.
- **Shapes**: rectangle, ellipse, arrow, free-text note.
- **Styling per shape**: colour, thickness, solid / dashed / dotted, fill opacity, font size.
- **Annotations**: each shape has a note that can be docked inline or *suspended* with a leader line.
- **Buffer %** at start/end for distance measurements (waste/overlap allowance).
- **Magnifier loupe** (hold Shift) — 2× zoom with crosshairs for precision picks.
- **Alt-drag** to move whole selected shape; vertex handles for fine corner edits.
- **Rotation** (90 / 180 / 270°) with measurements staying anchored to the underlying document.
- **Exports**: annotated PNG, annotated PDF, JSON of all measurements (round-trippable).
- **Autosave** to localStorage — re-upload the same file to restore your scale + markup.

## Stack
- Vite + React 18 + TypeScript
- pdf.js (`pdfjs-dist`) for PDF rendering
- Konva (`react-konva`) overlay for shape geometry
- Zustand + localStorage for state, with versioned migrations
- jsPDF for annotated PDF export
- Tailwind CSS + lucide-react

## Develop
```
npm install
npm run dev      # http://localhost:5173
npm run lint
npm run build    # production bundle into dist/
npm run preview  # serve dist/ locally
```

## Deploy to Cloudflare Pages
1. Push the repo to GitHub/GitLab.
2. In Cloudflare Pages → **Create project** → connect repo.
3. Framework preset: **Vite**.
   - Build command: `npm run build`
   - Build output directory: `dist`
4. Deploy. No env vars needed.

Node version is pinned via `.nvmrc`. Security headers + SPA fallback live in `public/_headers` and `public/_redirects`.

Alternatively: drag-and-drop the `dist/` folder into Cloudflare Pages, or `npx wrangler pages deploy dist`.

## Use
1. Drop a **PDF, JPG, or PNG** onto the page.
2. Click **Calibrate** (highlighted while no scale is set), draw a line on something of known length, double-click to finish, then enter the real-world length (e.g. `5 m`, `5000 mm`, `16ft`, `16'`).
3. Pick a tool — **Distance**, **Area**, **Rectangle**, **Ellipse**, **Arrow**, or **Text**.
4. Select a shape to edit colour / thickness / line style / fill / note / buffer %, or suspend the note with a leader line.

### Shortcuts

| Keys | Action |
|---|---|
| `V` `L` `P` `R` `O` `A` `T` `C` | Tools (select / distance / area / rect / ellipse / arrow / text / calibrate) |
| `Shift` | Snap to angle / square / circle / 45° + activates the loupe |
| `Alt` | Drag a selected shape to move it |
| `Space` (hold) + drag, or middle-mouse | Pan the canvas |
| Wheel | Zoom |
| Click label | Selects the parent shape |
| Drag suspended label | Reposition (leader line tracks back to the shape) |
| Dbl-click suspended label | Dock back inline |
| `Delete` | Remove selected shape |
| `Esc` | Cancel an in-progress draft |
| `Enter` | Finish current polyline / polygon |

The same shortcuts list is also available in-app via the floating **?** button (bottom-right).

## Notes
- PDFs: only the first page is rendered in v1.
- File bytes are *not* persisted between sessions — re-upload the same file on reload to restore your scale + measurements (which *are* persisted in localStorage).
- Image documents store geometry in image-pixel units; PDFs use PDF units (1/72 inch).

## License
[MIT](LICENSE) © Brendan Gooden
