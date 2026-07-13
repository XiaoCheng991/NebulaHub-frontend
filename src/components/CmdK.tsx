"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Post } from "@/lib/posts";
import type { DocFile } from "@/lib/docs";

export interface SearchItem {
  title: string;
  summary: string;
  href: string;
  tags: string[];
  date?: string;
  kind: "post" | "doc";
}

interface Props {
  posts?: Post[];
  docs?: DocFile[];
}

const SCORE_TERM = 10;
const SCORE_TITLE = 5;
const SCORE_TAG = 3;
const SCORE_PREFIX = 2;

function score(item: SearchItem, q: string): number {
  if (!q) return 0;
  const ql = q.toLowerCase();
  let s = 0;
  if (item.title.toLowerCase().includes(ql)) s += SCORE_TITLE * 3;
  if (item.title.toLowerCase().startsWith(ql)) s += SCORE_PREFIX;
  if (item.summary.toLowerCase().includes(ql)) s += SCORE_TERM;
  if (item.tags.some((t) => t.toLowerCase().includes(ql))) s += SCORE_TAG;
  if (item.date && item.date.includes(ql)) s += SCORE_TERM / 2;
  return s;
}

export default function CmdK({ posts = [], docs = [] }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const router = useRouter();
  const openRef = useRef(open);
  openRef.current = open;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const items: SearchItem[] = useMemo(() => {
    const ps = posts.map<SearchItem>((p) => ({
      title: p.title,
      summary: p.summary,
      href: `/blog/${p.slug}`,
      tags: p.tags,
      date: p.date,
      kind: "post",
    }));
    const ds = docs.map<SearchItem>((d) => ({
      title: d.title,
      summary: d.summary,
      href: `/blog/docs/${d.urlSlug}`,
      tags: d.tags,
      date: d.date,
      kind: "doc",
    }));
    return [...ps, ...ds];
  }, [posts, docs]);

  const ranked = useMemo(() => {
    if (!query.trim()) return items.slice(0, 8);
    const scored = items
      .map((it) => ({ it, s: score(it, query) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s);
    return scored.slice(0, 12).map((x) => x.it);
  }, [query, items]);

  // Keyboard: Ctrl/Cmd+K toggles, Esc closes (stable listener, no re-subscribe churn)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((p) => !p);
      } else if (e.key === "Escape" && openRef.current) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Open when the nav search box dispatches the global event
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("kyon:search", onOpen as EventListener);
    return () => window.removeEventListener("kyon:search", onOpen as EventListener);
  }, []);

  // Reset state on open / focus input
  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      // Focus after next tick (input rendered)
      const t = setTimeout(() => inputRef.current?.focus(), 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clamp active to ranked length
  useEffect(() => {
    if (active >= ranked.length) setActive(Math.max(0, ranked.length - 1));
  }, [ranked.length, active]);

  // Keep active item scrolled into view
  useEffect(() => {
    if (!listRef.current) return;
    const child = listRef.current.children[active] as HTMLElement | undefined;
    if (child) child.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  const onSelect = (it: SearchItem) => {
    setOpen(false);
    router.push(it.href);
  };

  return (
    <div
      role="dialog"
      aria-label="search posts"
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4 font-mono"
      style={{
        background: "hsl(var(--background) / 0.85)",
        backdropFilter: "blur(6px)",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div
        className="w-full max-w-xl border border-primary/40 bg-background/95 shadow-[0_8px_32px_hsl(var(--background)/0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* input row */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-primary/20">
          <span className="text-primary text-xs">grep</span>
          <span className="text-foreground/30 text-xs">/</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActive((p) => Math.min(p + 1, Math.max(0, ranked.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActive((p) => Math.max(0, p - 1));
              } else if (e.key === "Enter") {
                e.preventDefault();
                const it = ranked[active];
                if (it) onSelect(it);
              }
            }}
            placeholder="search posts, docs, tags..."
            className="flex-1 bg-transparent text-foreground text-sm placeholder:text-foreground/30 focus:outline-none"
          />
          <span className="text-foreground/30 text-[10px] hidden sm:inline">
            esc · ↵ · ↑↓
          </span>
        </div>

        {/* results */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto"
        >
          {ranked.length === 0 ? (
            <p className="px-4 py-8 text-foreground/40 text-xs text-center">
              // no matches
            </p>
          ) : (
            ranked.map((it, idx) => {
              const isActive = idx === active;
              return (
                <button
                  key={it.href}
                  type="button"
                  onMouseEnter={() => setActive(idx)}
                  onClick={() => onSelect(it)}
                  className={[
                    "block w-full text-left px-4 py-3 border-l-2 transition-colors",
                    isActive
                      ? "bg-primary/8 border-primary"
                      : "bg-transparent border-transparent hover:bg-primary/4",
                  ].join(" ")}
                  style={{ paddingLeft: 16 }}
                >
                  <div className="flex items-baseline justify-between gap-3 mb-1">
                    <span
                      className={[
                        "text-sm",
                        isActive
                          ? "text-primary"
                          : "text-foreground group-hover:text-primary",
                      ].join(" ")}
                    >
                      {it.title}
                    </span>
                    <span className="text-[10px] text-foreground/30 tabular-nums">
                      {it.kind === "doc" ? "DOCS" : "POST"}
                      {it.date ? " · " + it.date : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-foreground/45 leading-snug mb-2 line-clamp-2">
                    {it.summary}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {it.tags.map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-[1px] border border-primary/15 text-primary/55"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* footer */}
        <div className="border-t border-primary/15 px-4 py-2 text-[10px] text-foreground/30 flex justify-between">
          <span>{ranked.length} match{ranked.length === 1 ? "" : "es"}</span>
          <span/>{/* spacer */}
          <span>powered by hand-rolled score</span>
        </div>
      </div>
    </div>
  );
}
