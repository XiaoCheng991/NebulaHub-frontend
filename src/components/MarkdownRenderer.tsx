"use client";

import MarkdownIt from "markdown-it";
import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
}

/* ------------------------------------------------------------------ */
/*  Pre-process: fix Feishu export escaping (outside math mode)       */
/* ------------------------------------------------------------------ */

function preprocessMarkdown(md: string): string {
  let result = "";
  let inMath = false;
  let i = 0;

  while (i < md.length) {
    const ch = md[i];
    if (ch === "$" && (i === 0 || md[i - 1] !== "\\")) {
      inMath = !inMath;
      result += ch;
      i++;
      continue;
    }
    if (inMath) { result += ch; i++; continue; }
    if (ch === "\\" && i + 1 < md.length) {
      const next = md[i + 1];
      if (next === "." || next === "(" || next === ")" || next === "[" || next === "]") {
        result += next; i += 2; continue;
      }
    }
    result += ch;
    i++;
  }
  return result;
}

/* ------------------------------------------------------------------ */
/*  Wrap headings into <details> (open by default, no collapse)       */
/* ------------------------------------------------------------------ */

function wrapSections(md: string): string {
  const lines = md.split("\n");
  const out: string[] = [];
  const stack: { level: number }[] = [];
  let headingIdx = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) {
      const level = m[1].length;
      const title = m[2].trim();

      while (stack.length > 0 && stack[stack.length - 1].level >= level) {
        stack.pop();
        out.push("</details>");
      }

      headingIdx++;
      const id = `h${headingIdx}`;
      out.push(`<details open id="${id}" data-level="${level}">`);
      out.push(`<summary data-level="${level}">${title}</summary>`);
      stack.push({ level });
    } else {
      out.push(line);
    }
  }

  while (stack.length > 0) {
    stack.pop();
    out.push("</details>");
  }

  return out.join("\n");
}

/* ------------------------------------------------------------------ */
/*  CSS                                                                */
/* ------------------------------------------------------------------ */

const CSS_ID = "md-render-details";

const cssContent = `
.md-render { line-height: 1.7; color: hsl(var(--foreground) / 0.85); }

/* Details (always open) */
.md-render details { margin: 2rem 0 1.5rem 0; }
.md-render details > summary {
  cursor: default; list-style: none; user-select: none;
  color: hsl(var(--foreground)); font-weight: 600; padding: 0;
  pointer-events: none;
}
.md-render details > summary::-webkit-details-marker,
.md-render details > summary::marker { display: none; content: none; }
.md-render details > :not(summary) { margin-left: 0; }
.md-render details details { margin: 1.25rem 0 1rem 0; }

/* Heading sizes — distinct from body text (body is ~0.95rem) */
.md-render details > summary[data-level="1"] { font-size: 2.5rem;  line-height: 1.15; letter-spacing: -0.02em; margin: 0 0 1.75rem 0; }
.md-render details > summary[data-level="2"] { font-size: 1.85rem; line-height: 1.2;  margin: 2rem 0 1rem 0; }
.md-render details > summary[data-level="3"] { font-size: 1.45rem; line-height: 1.25; margin: 1.5rem 0 0.75rem 0; }
.md-render details > summary[data-level="4"] { font-size: 1.15rem; line-height: 1.3;  margin: 1.25rem 0 0.6rem 0; }
.md-render details > summary[data-level="5"] { font-size: 1.05rem; line-height: 1.35; margin: 1rem 0 0.5rem 0; }
.md-render details > summary[data-level="6"] { font-size: 1rem;    line-height: 1.4;   margin: 0.85rem 0 0.4rem 0; }

/* Paragraphs */
.md-render p { margin: 1.25rem 0; line-height: 1.9; }

/* Blockquote — tight padding */
.md-render blockquote {
  border-left: 2px solid hsl(var(--secondary) / 0.5);
  padding: 0.25rem 0.75rem;
  margin: 1.25rem 0;
  color: hsl(var(--foreground) / 0.6);
  font-style: italic;
}
.md-render blockquote p { margin: 0.2rem 0; }

/* Lists */
.md-render ul { list-style: disc; padding-left: 1.75rem; margin: 1.25rem 0; }
.md-render ol { list-style: decimal; padding-left: 1.75rem; margin: 1.25rem 0; }
.md-render li { font-size: 0.925rem; line-height: 1.8; margin: 0.25rem 0; }

/* Images */
.md-render img {
  display: block;
  margin: 1.75rem auto;
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  max-height: 65vh;
  animation: img-reveal 0.6s ease-out both;
}
@keyframes img-reveal {
  from { opacity: 0; filter: blur(8px); }
  to   { opacity: 1; filter: blur(0); }
}

/* Inline code */
.md-render code {
  background: hsl(var(--muted)); padding: 0.15rem 0.4rem;
  font-size: 0.8rem; font-family: 'Space Mono', 'Fira Code', monospace;
  color: hsl(var(--secondary));
}

/* Code blocks — wrap long lines, no horizontal overflow */
.md-render pre {
  background: hsl(var(--muted) / 0.6);
  border: 1px solid hsl(var(--border));
  padding: 1rem 1.25rem;
  margin: 1.25rem 0;
  overflow-x: auto;
  font-family: 'Space Mono', 'Fira Code', 'Courier New', monospace;
  font-size: 0.82rem;
  line-height: 1.65;
  color: hsl(var(--foreground) / 0.85);
  border-radius: 4px;
}
.md-render pre code {
  background: transparent;
  padding: 0;
  color: inherit;
  font-size: inherit;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

/* Links */
.md-render a { color: hsl(var(--primary)); text-decoration: underline; text-underline-offset: 2px; }
.md-render a:hover { text-shadow: 0 0 8px hsl(var(--primary) / 0.3); }

/* Strong / Em */
.md-render strong { color: hsl(var(--primary)); font-weight: 600; }
.md-render em { color: hsl(var(--foreground) / 0.8); }

/* HR */
.md-render hr { border-color: hsl(var(--border)); margin: 3rem 0; }
`;

function injectStyle() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CSS_ID)) return;
  const el = document.createElement("style");
  el.id = CSS_ID;
  el.textContent = cssContent;
  document.head.appendChild(el);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => {
    const md = preprocessMarkdown(content);
    const wrapped = wrapSections(md);
    const renderer = new MarkdownIt({
      html: true,
      linkify: true,
      breaks: false,
    });
    return renderer.render(wrapped);
  }, [content]);

  useMemo(() => injectStyle(), []);

  const htmlWithLazy = useMemo(() =>
    html.replace(/<img([^>]*)>/gi, (_m, attrs) =>
      attrs.includes('loading=') ? `<img${attrs}>` : `<img${attrs} loading="lazy">`
    )
  , [html]);

  return (
    <div className="md-render relative">
      <div dangerouslySetInnerHTML={{ __html: htmlWithLazy }} />
    </div>
  );
}
