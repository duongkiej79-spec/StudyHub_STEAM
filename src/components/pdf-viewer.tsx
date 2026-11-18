"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy } from "pdfjs-dist";

type Status = { kind: "loading" } | { kind: "ready"; doc: PDFDocumentProxy } | { kind: "error" };

/**
 * Trình xem PDF nhúng bằng PDF.js (F05). Vẽ từng trang ra canvas nên hoạt động
 * giống nhau trên máy tính và điện thoại (iOS/Android không hiển thị PDF trong iframe ổn định).
 * Trang chỉ được vẽ khi cuộn tới gần (lazy), tự vẽ lại khi đổi kích thước khung.
 */
export function PdfViewer({ src, downloadHref }: { src: string; downloadHref: string }) {
  const [status, setStatus] = useState<Status>({ kind: "loading" });
  const [zoom, setZoom] = useState(1);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let task: { destroy: () => Promise<void> } | null = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
        const loading = pdfjs.getDocument({ url: src, enableXfa: false });
        task = loading;
        const doc = await loading.promise;
        if (!cancelled) setStatus({ kind: "ready", doc });
      } catch {
        if (!cancelled) setStatus({ kind: "error" });
      }
    })();
    return () => {
      cancelled = true;
      task?.destroy();
    };
  }, [src]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b border-line bg-surface px-3 py-2 text-sm">
        <span className="text-muted">
          {status.kind === "ready" ? `${status.doc.numPages} trang` : status.kind === "loading" ? "Đang tải PDF…" : "Không xem được"}
        </span>
        <div className="flex items-center gap-1">
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.2).toFixed(1)))} aria-label="Thu nhỏ">
            −
          </button>
          <span className="w-12 text-center tabular-nums" aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button type="button" className="btn-secondary px-3 py-1.5" onClick={() => setZoom((z) => Math.min(2.4, +(z + 0.2).toFixed(1)))} aria-label="Phóng to">
            +
          </button>
          <a href={src} target="_blank" rel="noopener" className="btn-secondary ml-1 px-3 py-1.5">
            Mở tab mới
          </a>
        </div>
      </div>
      <div ref={wrapRef} className="max-h-[80vh] min-h-64 overflow-auto bg-zinc-100 p-3">
        {status.kind === "loading" && (
          <div className="mx-auto aspect-[1/1.414] w-full max-w-2xl animate-pulse rounded bg-white" aria-hidden />
        )}
        {status.kind === "error" && (
          <div className="py-16 text-center text-sm text-muted">
            Không hiển thị được tệp trên trình duyệt này.{" "}
            <a href={downloadHref} className="font-medium text-brand-700 hover:underline">
              Tải PDF về máy
            </a>
          </div>
        )}
        {status.kind === "ready" && width > 0 && (
          <div className="flex flex-col items-center gap-3">
            {Array.from({ length: status.doc.numPages }, (_, i) => (
              <PdfPage key={i} doc={status.doc} pageNumber={i + 1} width={Math.min(width - 24, 900) * zoom} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PdfPage({ doc, pageNumber, width }: { doc: PDFDocumentProxy; pageNumber: number; width: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const holderRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(pageNumber <= 2);
  const [ratio, setRatio] = useState(1.414);

  useEffect(() => {
    const el = holderRef.current;
    if (!el || visible) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setVisible(true), { rootMargin: "400px" });
    io.observe(el);
    return () => io.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let task: { cancel: () => void; promise: Promise<void> } | null = null;
    let cancelled = false;
    (async () => {
      const page = await doc.getPage(pageNumber);
      if (cancelled) return;
      const base = page.getViewport({ scale: 1 });
      setRatio(base.height / base.width);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = page.getViewport({ scale: (width / base.width) * dpr });
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      task = page.render({ canvas, viewport });
      await task.promise.catch(() => undefined);
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [doc, pageNumber, width, visible]);

  return (
    <div ref={holderRef} className="bg-white shadow-sm" style={{ width, height: width * ratio }}>
      <canvas ref={canvasRef} className="block h-full w-full" aria-label={`Trang ${pageNumber}`} role="img" />
    </div>
  );
}
