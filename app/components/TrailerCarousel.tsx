"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";

interface MediaItem {
  type: "video" | "image";
  key?: string;       // YouTube key for videos
  src?: string;       // image URL
  alt?: string;
}

interface Props {
  items: MediaItem[];
}

export default function TrailerCarousel({ items }: Props) {
  const [current, setCurrent] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [loaded, setLoaded] = useState<Set<number>>(new Set([0]));
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragX = useMotionValue(0);

  // Autoplay
  useEffect(() => {
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      setCurrent((c) => (c + 1) % items.length);
    }, 6000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, items.length]);

  // Lazy load adjacent items
  useEffect(() => {
    const next = (current + 1) % items.length;
    const prev = (current - 1 + items.length) % items.length;
    setLoaded((s) => new Set([...s, current, next, prev]));
  }, [current, items.length]);

  const goTo = useCallback((index: number) => {
    setCurrent(index);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    setCurrent((c) => (c + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    setCurrent((c) => (c - 1 + items.length) % items.length);
  }, [items.length]);

  // Keyboard navigation — roving tab index
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") goNext();
    if (e.key === "ArrowLeft") goPrev();
    if (e.key === " ") setIsPlaying((p) => !p);
  }

  // Drag/swipe with inertial scroll
  function handleDragEnd(_: any, info: any) {
    if (info.offset.x < -50) goNext();
    if (info.offset.x > 50) goPrev();
    dragX.set(0);
  }

  if (!items.length) return null;

  const item = items[current];

  return (
    <section
      aria-label="Media carousel"
      aria-roledescription="carousel"
      className="relative w-full rounded-xl overflow-hidden bg-black"
      ref={containerRef}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Main slide */}
      <div className="relative aspect-video w-full">
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            style={{ x: dragX }}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -60 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0"
            role="group"
            aria-roledescription="slide"
            aria-label={`Slide ${current + 1} of ${items.length}`}
          >
            {item.type === "video" && item.key ? (
              <iframe
                src={`https://www.youtube.com/embed/${item.key}?autoplay=0&modestbranding=1`}
                title="Movie trailer"
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
                allowFullScreen
                loading="lazy"
              />
            ) : item.type === "image" && item.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={loaded.has(current) ? item.src : ""}
                alt={item.alt ?? "Movie image"}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500">
                No media
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Prev / Next buttons */}
      <button
        onClick={goPrev}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80
                   text-white w-10 h-10 rounded-full flex items-center justify-center
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      >
        ‹
      </button>
      <button
        onClick={goNext}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 bg-black/60 hover:bg-black/80
                   text-white w-10 h-10 rounded-full flex items-center justify-center
                   focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      >
        ›
      </button>

      {/* Dot indicators — roving tab index */}
      <div
        role="tablist"
        aria-label="Slides"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10"
      >
        {items.map((_, i) => (
          <button
            key={i}
            role="tab"
            aria-selected={i === current}
            aria-label={`Go to slide ${i + 1}`}
            tabIndex={i === current ? 0 : -1}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-all focus-visible:outline-none
              focus-visible:ring-2 focus-visible:ring-yellow-400
              ${i === current ? "bg-yellow-400 w-4" : "bg-gray-500"}`}
          />
        ))}
      </div>

      {/* Play/pause */}
      <button
        onClick={() => setIsPlaying((p) => !p)}
        aria-label={isPlaying ? "Pause autoplay" : "Start autoplay"}
        className="absolute bottom-3 right-3 z-10 bg-black/60 text-white text-xs px-2 py-1
                   rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
      >
        {isPlaying ? "⏸" : "▶"}
      </button>
    </section>
  );
}