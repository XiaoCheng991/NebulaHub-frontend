"use client";

import { Search } from "lucide-react";

export default function SearchTrigger() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent("kyon:search"))}
      aria-label="打开搜索"
      className="group flex w-9 items-center gap-2 rounded-sm border border-border bg-background/40 px-2.5 py-1.5 text-foreground/50 transition-colors hover:border-primary/60 hover:text-primary hover:shadow-[0_0_10px_hsl(var(--primary)/0.2)] nav-glow md:w-52"
    >
      <Search size={14} className="shrink-0" />
      <span className="hidden truncate text-xs font-mono md:inline">搜索…</span>
      <kbd className="ml-auto hidden rounded-sm border border-border px-1 text-[10px] font-mono text-foreground/40 group-hover:border-primary/40 md:inline">
        ⌘K
      </kbd>
    </button>
  );
}
