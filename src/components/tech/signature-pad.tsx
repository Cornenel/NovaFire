"use client";

import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";

/** Touch/stylus signature pad drawing to a canvas; exports a PNG blob. */

export function SignaturePad({
  onChange,
}: {
  onChange: (blob: Blob | null) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Scale for device pixel ratio so strokes are crisp
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  function pos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function emit() {
    canvasRef.current?.toBlob((blob) => onChange(blob), "image/png");
  }

  function handleDown(e: React.PointerEvent<HTMLCanvasElement>) {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    canvasRef.current!.setPointerCapture(e.pointerId);
  }

  function handleMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const { x, y } = pos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (isEmpty) setIsEmpty(false);
  }

  function handleUp() {
    if (!drawing.current) return;
    drawing.current = false;
    emit();
  }

  function clear() {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  }

  return (
    <div>
      <div className="relative rounded-xl border border-white/15 bg-[#101010] overflow-hidden">
        <canvas
          ref={canvasRef}
          className="w-full h-44 touch-none cursor-crosshair"
          onPointerDown={handleDown}
          onPointerMove={handleMove}
          onPointerUp={handleUp}
          onPointerLeave={handleUp}
        />
        {isEmpty && (
          <p className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm pointer-events-none">
            Customer signs here
          </p>
        )}
        <button
          type="button"
          onClick={clear}
          className="absolute top-2 right-2 p-2 rounded-lg bg-white/5 text-zinc-500 hover:text-white transition-colors"
          aria-label="Clear signature"
        >
          <Eraser className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
