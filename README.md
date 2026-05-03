# DocMark

In-browser PDF measure & markup tool. Upload a PDF, set a scale, then mark up the document with measurements, shapes, and annotations.

- 100 % client-side — your PDF never leaves the browser.
- Static-host friendly (Cloudflare Pages, GitHub Pages, etc).

## Stack
- Vite + React 18 + TypeScript
- pdf.js (`pdfjs-dist`) for rendering
- Konva (`react-konva`) overlay for shape geometry
- Zustand + localStorage for state
- jsPDF for annotated PDF export

## Develop
```
npm install
npm run dev      # http://localhost:5173
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

Alternatively, drag-and-drop the `dist/` folder into Cloudflare Pages or `npx wrangler pages deploy dist`.

## Use
1. Drop a PDF onto the page.
2. Click **Calibrate**, draw a line on something with a known length, double-click to finish, then enter the real-world length (e.g. `5 m`, `5000 mm`, `16ft`, `16'`).
3. Pick a tool — **Distance**, **Area**, **Rectangle**, **Ellipse**, **Arrow**, or **Text**.
4. Hold **Shift** while drawing for angle snap / square / circle / 45° lock — also activates the loupe magnifier.
5. Select a measurement to edit color, thickness, line style, fill opacity, note (annotation), buffer %, and to suspend the label with a leader line.
6. Hold **Alt** to drag the whole selected shape.
7. Use **PNG / PDF / JSON** in the header to export.

Keyboard: `V` select · `L` distance · `P` area · `R` rect · `O` ellipse · `A` arrow · `T` text · `C` calibrate · `Space`-drag or middle-mouse to pan · wheel to zoom · `Delete` to remove selected · `Alt`-drag selected shape to move.

## Notes
- Only the first PDF page is supported in v1.
- PDF bytes aren't persisted — re-upload the same file on reload to restore your scale + measurements (kept in localStorage).
