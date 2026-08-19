import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Crop, X, Check, Minus, Plus, Grid3X3 } from "lucide-react";

type AspectRatio = "free" | "1:1" | "4:5" | "16:9";

interface CropModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onApply: (croppedFile: File, previewUrl: string) => void;
}

const ASPECT_RATIOS: { label: string; value: AspectRatio; ratio?: number }[] = [
  { label: "Free", value: "free" },
  { label: "1:1", value: "1:1", ratio: 1 },
  { label: "4:5", value: "4:5", ratio: 4 / 5 },
  { label: "16:9", value: "16:9", ratio: 16 / 9 },
];

export default function CropModal({
  open,
  onOpenChange,
  imageSrc,
  onApply,
}: CropModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [aspect, setAspect] = useState<AspectRatio>("free");
  const [imageLoaded, setImageLoaded] = useState(false);
  const [applying, setApplying] = useState(false);
  const [showGrid, setShowGrid] = useState(true);

  // Zoom (1 = fit, max ~3)
  const [zoom, setZoom] = useState(1);

  // Crop box in canvas-relative coordinates
  const [box, setBox] = useState({ x: 0, y: 0, w: 0, h: 0 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizeDir] = useState<string | null>(null);
  const dragStart = useRef({ mx: 0, my: 0, bx: 0, by: 0, bw: 0, bh: 0 });

  // Display scale from natural image → canvas CSS px
  const [scale, setScale] = useState(1);
  // Max canvas CSS dimensions
  const maxDims = useRef({ w: 0, h: 0 });

  // ── Load image when src changes ──────────────────────────
  useEffect(() => {
    if (!open || !imageSrc) return;
    setImageLoaded(false);
    setApplying(false);
    setZoom(1);
    setBox({ x: 0, y: 0, w: 0, h: 0 });
    setScale(1);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      imgRef.current = img;
      setImageLoaded(true);
    };
    img.src = imageSrc;
  }, [open, imageSrc]);

  // ── Draw image + overlay ─────────────────────────────────
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fit image inside max area
    const MAX_W = 520;
    const MAX_H = 380;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let displayW: number;
    let displayH: number;

    if (imgAspect > MAX_W / MAX_H) {
      displayW = MAX_W;
      displayH = MAX_W / imgAspect;
    } else {
      displayH = MAX_H;
      displayW = MAX_H * imgAspect;
    }

    maxDims.current = { w: displayW, h: displayH };

    const dpr = window.devicePixelRatio || 1;
    canvas.width = displayW * dpr;
    canvas.height = displayH * dpr;
    canvas.style.width = `${displayW}px`;
    canvas.style.height = `${displayH}px`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    const s = displayW / img.naturalWidth;
    setScale(s);

    // Draw image
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.drawImage(img, 0, 0, displayW, displayH);

    // Initialize crop box at 80% centered
    const margin = 0.1;
    const bx = displayW * margin;
    const by = displayH * margin;
    const bw = displayW * (1 - 2 * margin);
    const bh = displayH * (1 - 2 * margin);
    setBox({ x: bx, y: by, w: bw, h: bh });
  }, []); // only on image load

  useEffect(() => {
    if (imageLoaded) draw();
  }, [imageLoaded, draw]);

  // ── Redraw overlay on box/zoom change ────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img || !imageLoaded) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayW = canvas.width / dpr;
    const displayH = canvas.height / dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // Draw image (possibly zoomed)
    ctx.clearRect(0, 0, displayW, displayH);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, displayW, displayH);
    ctx.clip();
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number, drawH: number;
    if (imgAspect > displayW / displayH) {
      drawW = displayW * zoom;
      drawH = drawW / imgAspect;
    } else {
      drawH = displayH * zoom;
      drawW = drawH * imgAspect;
    }
    const drawX = (displayW - drawW) / 2;
    const drawY = (displayH - drawH) / 2;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Dim overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, displayW, displayH);

    // Clear crop area
    ctx.save();
    ctx.beginPath();
    ctx.rect(box.x, box.y, box.w, box.h);
    ctx.clip();
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.restore();

    // Crop border (double-line for visibility)
    ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
    ctx.lineWidth = 1;
    ctx.strokeRect(box.x - 1, box.y - 1, box.w + 2, box.h + 2);

    // Rule of thirds grid
    if (showGrid && box.w > 40 && box.h > 40) {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
      ctx.lineWidth = 0.5;
      for (let i = 1; i <= 2; i++) {
        const gx = box.x + (box.w * i) / 3;
        const gy = box.y + (box.h * i) / 3;
        ctx.beginPath();
        ctx.moveTo(gx, box.y);
        ctx.lineTo(gx, box.y + box.h);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(box.x, gy);
        ctx.lineTo(box.x + box.w, gy);
        ctx.stroke();
      }
    }

    // Corner handles
    const hs = 10;
    ctx.fillStyle = "white";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 3;
    const corners = [
      [box.x, box.y],
      [box.x + box.w, box.y],
      [box.x, box.y + box.h],
      [box.x + box.w, box.y + box.h],
    ];
    corners.forEach(([cx, cy]) => {
      ctx.beginPath();
      ctx.arc(cx, cy, hs / 2, 0, Math.PI * 2);
      ctx.fill();
    });
    // Edge handles (smaller)
    ctx.fillStyle = "rgba(255,255,255,0.8)";
    const edges = [
      [box.x + box.w / 2, box.y],
      [box.x + box.w / 2, box.y + box.h],
      [box.x, box.y + box.h / 2],
      [box.x + box.w, box.y + box.h / 2],
    ];
    edges.forEach(([ex, ey]) => {
      ctx.beginPath();
      ctx.arc(ex, ey, 3, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.shadowBlur = 0;
  }, [box, imageLoaded, zoom, showGrid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Pointer helpers ──────────────────────────────────────
  const getCanvasPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const isInBox = (x: number, y: number) =>
    x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h;

  const getResizeDir = (x: number, y: number): string | null => {
    const m = 14;
    const onLeft = Math.abs(x - box.x) < m;
    const onRight = Math.abs(x - (box.x + box.w)) < m;
    const onTop = Math.abs(y - box.y) < m;
    const onBottom = Math.abs(y - (box.y + box.h)) < m;
    if (onTop && onLeft) return "nw";
    if (onTop && onRight) return "ne";
    if (onBottom && onLeft) return "sw";
    if (onBottom && onRight) return "se";
    if (onTop) return "n";
    if (onBottom) return "s";
    if (onLeft) return "w";
    if (onRight) return "e";
    return null;
  };

  const handlePointerDown = (e: React.MouseEvent | React.TouchEvent) => {
    const pos = getCanvasPos(e);
    const dir = getResizeDir(pos.x, pos.y);
    if (dir) {
      setResizeDir(dir);
      dragStart.current = { mx: pos.x, my: pos.y, bx: box.x, by: box.y, bw: box.w, bh: box.h };
    } else if (isInBox(pos.x, pos.y)) {
      setDragging(true);
      dragStart.current = { mx: pos.x, my: pos.y, bx: box.x, by: box.y, bw: box.w, bh: box.h };
    }
  };

  const handlePointerMove = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      if (!dragging && !resizing) return;
      const pos = getCanvasPos(e);
      const maxW = maxDims.current.w;
      const maxH = maxDims.current.h;
      const d = dragStart.current;
      const dx = pos.x - d.mx;
      const dy = pos.y - d.my;

      if (dragging) {
        let nx = d.bx + dx;
        let ny = d.by + dy;
        nx = Math.max(0, Math.min(nx, maxW - d.bw));
        ny = Math.max(0, Math.min(ny, maxH - d.bh));
        setBox((prev) => ({ ...prev, x: nx, y: ny }));
        return;
      }

      if (resizing) {
        let { bx, by, bw, bh } = d;
        const minSize = 40;
        const ratioVal =
          aspect === "free" ? undefined : ASPECT_RATIOS.find((a) => a.value === aspect)?.ratio;

        if (resizing.includes("e")) bw = Math.max(minSize, Math.min(d.bw + dx, maxW - bx));
        if (resizing.includes("w")) {
          bw = Math.max(minSize, d.bw - dx);
          bx = d.bx + d.bw - bw;
          bx = Math.max(0, bx);
          bw = d.bw - (bx - d.bx);
        }
        if (resizing.includes("s")) bh = Math.max(minSize, Math.min(d.bh + dy, maxH - by));
        if (resizing.includes("n")) {
          bh = Math.max(minSize, d.bh - dy);
          by = d.by + d.bh - bh;
          by = Math.max(0, by);
          bh = d.bh - (by - d.by);
        }

        // Enforce aspect ratio
        if (ratioVal) {
          if (resizing.includes("e") || resizing.includes("w")) {
            bh = bw / ratioVal;
          } else {
            bw = bh * ratioVal;
          }
        }

        bw = Math.min(bw, maxW - bx);
        bh = Math.min(bh, maxH - by);
        bx = Math.max(0, bx);
        by = Math.max(0, by);

        setBox({ x: bx, y: by, w: bw, h: bh });
      }
    },
    [dragging, resizing, aspect]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setResizeDir(null);
  }, []);

  // ── Aspect ratio change ──────────────────────────────────
  const handleAspectChange = (newAspect: AspectRatio) => {
    setAspect(newAspect);
    if (newAspect === "free") return;
    const ratioVal = ASPECT_RATIOS.find((a) => a.value === newAspect)?.ratio;
    if (!ratioVal) return;
    const maxW = maxDims.current.w;
    const maxH = maxDims.current.h;
    let bw = Math.min(box.w, maxW * 0.85);
    let bh = bw / ratioVal;
    if (bh > maxH * 0.85) {
      bh = maxH * 0.85;
      bw = bh * ratioVal;
    }
    const bx = (maxW - bw) / 2;
    const by = (maxH - bh) / 2;
    setBox({ x: bx, y: by, w: bw, h: bh });
  };

  // ── Zoom ─────────────────────────────────────────────────
  const handleZoom = (delta: number) => {
    setZoom((z) => Math.max(1, Math.min(3, z + delta)));
  };

  // ── Apply crop ───────────────────────────────────────────
  const handleApply = () => {
    const img = imgRef.current;
    const canvas = canvasRef.current;
    if (!img || !canvas || box.w < 1 || box.h < 1 || applying) return;

    setApplying(true);

    // The overlay effect changes the apparent image position when zoomed,
    // so we need to recalculate from the actual zoomed draw coordinates.
    const displayW = maxDims.current.w;
    const displayH = maxDims.current.h;
    const imgAspect = img.naturalWidth / img.naturalHeight;
    let drawW: number, drawH: number;
    if (imgAspect > displayW / displayH) {
      drawW = displayW * zoom;
      drawH = drawW / imgAspect;
    } else {
      drawH = displayH * zoom;
      drawW = drawH * imgAspect;
    }
    const drawX = (displayW - drawW) / 2;
    const drawY = (displayH - drawH) / 2;

    // Map crop box from display coords → zoomed-image coords
    const cropImgX = (box.x - drawX) / drawW;
    const cropImgY = (box.y - drawY) / drawH;
    const cropImgW = box.w / drawW;
    const cropImgH = box.h / drawH;

    // Clamp
    const sx = Math.max(0, cropImgX) * img.naturalWidth;
    const sy = Math.max(0, cropImgY) * img.naturalHeight;
    const sw = Math.min(cropImgW, 1 - cropImgX) * img.naturalWidth;
    const sh = Math.min(cropImgH, 1 - cropImgY) * img.naturalHeight;

    const outW = Math.round(sw);
    const outH = Math.round(sh);
    if (outW < 1 || outH < 1) {
      setApplying(false);
      return;
    }

    const outCanvas = document.createElement("canvas");
    outCanvas.width = outW;
    outCanvas.height = outH;
    const ctx = outCanvas.getContext("2d");
    if (!ctx) {
      setApplying(false);
      return;
    }

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, outW, outH);

    // Determine output MIME type from source
    const srcType = imgRef.current?.src || "";
    const mime = srcType.includes("png") ? "image/png" : "image/jpeg";
    const quality = mime === "image/jpeg" ? 0.92 : undefined;

    outCanvas.toBlob(
      (blob) => {
        setApplying(false);
        if (!blob) return;
        const file = new File([blob], "cropped-image.jpg", {
          type: blob.type || "image/jpeg",
          lastModified: Date.now(),
        });
        const previewUrl = URL.createObjectURL(blob);
        onApply(file, previewUrl);
        onOpenChange(false);
      },
      mime,
      quality
    );
  };

  // ── Keyboard shortcut ────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onOpenChange(false);
      }
      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleApply();
      }
    };
    window.addEventListener("keydown", handler, true);
    return () => window.removeEventListener("keydown", handler, true);
  }); // intentionally no deps — always fresh

  // ── Cursor ───────────────────────────────────────────────
  const getCursor = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e);
    const dir = getResizeDir(pos.x, pos.y);
    if (dir) {
      const cursors: Record<string, string> = {
        nw: "nwse-resize", se: "nwse-resize",
        ne: "nesw-resize", sw: "nesw-resize",
        n: "ns-resize", s: "ns-resize",
        w: "ew-resize", e: "ew-resize",
      };
      return cursors[dir] || "default";
    }
    if (isInBox(pos.x, pos.y)) return "move";
    return "default";
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in"
        onClick={() => !applying && onOpenChange(false)}
      />

      {/* Modal */}
      <div className="relative z-10 w-full max-w-[600px] mx-4 bg-card border border-border/50 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <h2 className="text-base font-semibold flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                <Crop className="w-4 h-4 text-indigo-500" />
              </div>
              Crop Image
            </h2>
            <p className="text-xs text-muted-foreground mt-1 ml-9">
              Adjust the crop area, then apply.
            </p>
          </div>
          <button
            onClick={() => !applying && onOpenChange(false)}
            disabled={applying}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Canvas workspace */}
        <div className="px-5 flex justify-center">
          <div
            className="relative rounded-xl overflow-hidden bg-neutral-900 border border-border/30"
            style={{ cursor: dragging || resizing ? (dragging ? "move" : getCursor({ clientX: 0, clientY: 0 } as React.MouseEvent)) : undefined }}
          >
            <canvas
              ref={canvasRef}
              onMouseDown={handlePointerDown}
              onMouseMove={(e) => {
                handlePointerMove(e);
                if (!dragging && !resizing && canvasRef.current) {
                  canvasRef.current.style.cursor = getCursor(e);
                }
              }}
              onMouseUp={handlePointerUp}
              onMouseLeave={handlePointerUp}
              onTouchStart={handlePointerDown}
              onTouchMove={handlePointerMove}
              onTouchEnd={handlePointerUp}
              className="block"
            />
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-neutral-900">
                <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
        </div>

        {/* Controls row */}
        <div className="px-5 pt-4 pb-2 space-y-3">
          {/* Aspect ratio + Grid toggle + Zoom */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-muted-foreground font-medium">Aspect:</span>
              {ASPECT_RATIOS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => handleAspectChange(a.value)}
                  disabled={applying}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-all ${
                    aspect === a.value
                      ? "bg-indigo-500 text-white shadow-sm shadow-indigo-500/25"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {a.label}
                </button>
              ))}
              <button
                onClick={() => setShowGrid((g) => !g)}
                disabled={applying}
                className={`ml-1 p-1.5 rounded-lg transition-colors ${
                  showGrid
                    ? "bg-indigo-500/10 text-indigo-500"
                    : "text-muted-foreground hover:bg-muted/60"
                }`}
                title="Toggle rule-of-thirds grid"
              >
                <Grid3X3 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handleZoom(-0.25)}
                disabled={applying || zoom <= 1}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-muted-foreground font-mono w-8 text-center tabular-nums">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => handleZoom(0.25)}
                disabled={applying || zoom >= 3}
                className="p-1 rounded-md text-muted-foreground hover:bg-muted/60 disabled:opacity-30 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-4 border-t border-border/30">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={applying}
            className="gap-1.5"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleApply}
            disabled={!imageLoaded || box.w < 1 || applying}
            className="gap-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-md min-w-[110px]"
          >
            {applying ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Applying…
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                Apply Crop
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
