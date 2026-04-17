"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { subscribeToWatchlistChannel } from "@/lib/watchlistChannel";
import {
  addToWatchlist,
  removeFromWatchlist,
  isInWatchlist,
} from "@/lib/repository/watchlistRepo";

interface Props {
  id: string;
  title: string;
  poster?: string;
  mediaType?: "movie" | "tv";
}

type ButtonState = "idle" | "loading" | "success" | "error";

export default function WatchlistToggle({ id, title, poster, mediaType }: Props) {
  const [active, setActive] = useState(false);
  const [btnState, setBtnState] = useState<ButtonState>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    isInWatchlist(id).then((exists) => {
      if (isMounted.current) setActive(exists);
    });
    return () => { isMounted.current = false; };
  }, [id]);

  useEffect(() => {
    const unsubscribe = subscribeToWatchlistChannel((msg) => {
      if (!isMounted.current) return;
      if (msg.type === "added" && msg.item.id === id) {
        setActive(true);
        setStatusMessage("Added on another tab");
      } else if (msg.type === "removed" && msg.id === id) {
        setActive(false);
        setStatusMessage("Removed on another tab");
      }
    });
    return unsubscribe;
  }, [id]);

  const toggle = useCallback(async () => {
    if (btnState === "loading") return;
    const wasActive = active;
    setBtnState("loading");
    setActive(!wasActive);
    setStatusMessage(wasActive ? "Removing from watchlist…" : "Adding to watchlist…");

    try {
      if (wasActive) {
        await removeFromWatchlist(id);
        if (isMounted.current) {
          setBtnState("success");
          setStatusMessage("Removed from watchlist");
        }
      } else {
        await addToWatchlist({ id, title, poster, mediaType });
        if (isMounted.current) {
          setBtnState("success");
          setStatusMessage("Added to watchlist");
        }
      }
      setTimeout(() => {
        if (isMounted.current) setBtnState("idle");
      }, 1200);
    } catch {
      if (isMounted.current) {
        setActive(wasActive);
        setBtnState("error");
        setStatusMessage(
          wasActive ? "Could not remove — please retry" : "Could not add — please retry"
        );
        setTimeout(() => {
          if (isMounted.current) setBtnState("idle");
        }, 2000);
      }
    }
  }, [active, btnState, id, title, poster, mediaType]);

  const label =
    btnState === "loading"
      ? active ? "Adding…" : "Removing…"
      : btnState === "success"
      ? active ? "✓ Added" : "Removed"
      : btnState === "error"
      ? "Try again"
      : active
      ? "✓ In Watchlist"
      : "+ Watchlist";

  const bgClass =
    btnState === "error"
      ? "bg-red-600 hover:bg-red-500"
      : active
      ? "bg-green-600 hover:bg-green-500"
      : "bg-blue-600 hover:bg-blue-500";

  return (
    <>
      <motion.button
        whileTap={{ scale: 0.88 }}
        animate={{ scale: btnState === "success" ? 1.1 : active ? 1.03 : 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 18 }}
        onClick={toggle}
        disabled={btnState === "loading"}
        aria-pressed={active}
        aria-label={active ? `Remove ${title} from watchlist` : `Add ${title} to watchlist`}
        data-testid={`watchlist-toggle-${id}`}
        className={`relative px-5 py-2 rounded-lg font-semibold transition-colors
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          focus-visible:ring-blue-400 disabled:opacity-60 disabled:cursor-not-allowed
          ${bgClass}`}
      >
        <AnimatePresence>
          {btnState === "success" && (
            <motion.span
              key="ripple"
              className="absolute inset-0 rounded-lg bg-white/20"
              initial={{ opacity: 0.6, scale: 0.8 }}
              animate={{ opacity: 0, scale: 1.4 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            />
          )}
        </AnimatePresence>
        {btnState === "loading" && (
          <motion.span
            className="inline-block w-3 h-3 border-2 border-white border-t-transparent
                       rounded-full mr-2 align-middle"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 0.7, ease: "linear" }}
          />
        )}
        {label}
      </motion.button>
      <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {statusMessage}
      </div>
    </>
  );
}