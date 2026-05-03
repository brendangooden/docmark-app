import { useCallback, useRef, useState } from "react";

type Props = {
  onFile: (file: File) => void;
  hint?: string | null;
};

export const FileDrop = ({ onFile, hint }: Props) => {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const accept = useCallback(
    (file: File | null | undefined) => {
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
        alert("Please upload a PDF file.");
        return;
      }
      onFile(file);
    },
    [onFile],
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files?.[0]);
      }}
      onClick={() => inputRef.current?.click()}
      className={[
        "m-auto flex h-full w-full max-w-3xl cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-12 text-center transition",
        over
          ? "border-cyan-400 bg-cyan-500/5"
          : "border-slate-700 hover:border-slate-500",
      ].join(" ")}
    >
      <div className="text-5xl">📐</div>
      <h2 className="text-xl font-semibold text-slate-100">Drop a PDF to start</h2>
      <p className="max-w-md text-sm text-slate-400">
        Everything happens in your browser — your file never leaves this device.
        Set a scale, draw lines, get totals.
      </p>
      {hint && <p className="text-xs text-amber-300">{hint}</p>}
      <button
        type="button"
        className="mt-2 rounded bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
      >
        Choose file…
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={(e) => accept(e.target.files?.[0])}
      />
    </div>
  );
};
