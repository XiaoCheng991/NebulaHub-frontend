import type { Metadata } from "next";
import "./globals.css";
import BackToTop from "@/components/BackToTop";
import MusicPlayer from "@/components/MusicPlayer";
import RssIcon from "@/components/RssIcon";
import EasterEggs from "@/components/EasterEggs";
import CmdK from "@/components/CmdK";
import { posts } from "@/lib/posts";
import { getDocsList } from "@/lib/docs";

export const metadata: Metadata = {
  title: "Kyon // blog",
  description: "Kyon's Blog — 代码、想法与技术笔记",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <link rel="alternate" type="application/rss+xml" title="Kyon // blog" href="/feed.xml" />
        <title></title>
      </head>
      <body className="bg-background text-foreground scanlines grid-bg min-h-screen">
        {/* Scroll progress bar */}
        <div id="scroll-progress" />

        <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
          <nav className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
            <a
              href="/"
              className="text-primary font-mono text-lg tracking-wider font-bold text-glow nav-glow"
            >
              {'Kyon'}
            </a>
            <div className="flex items-center gap-5 text-sm font-mono">
              <a
                href="/"
                className="text-foreground/70 hover:text-primary transition-colors nav-glow"
              >
                [ blog ]
              </a>
              <a
                href="/tags"
                className="text-foreground/70 hover:text-primary transition-colors nav-glow"
              >
                [ tags ]
              </a>
              <a
                href="/about"
                className="text-foreground/70 hover:text-primary transition-colors nav-glow"
              >
                [ about ]
              </a>
              {/* Music trigger - in nav, opens a popover beneath it.
                  Renders nothing while PLAYLIST is empty. */}
              <MusicPlayer />            </div>
          </nav>
        </header>
        <main className="pt-14 pb-24">
          {children}
        </main>
        <footer className="border-t border-border mt-20">
          <div className="max-w-4xl mx-auto px-4 py-8 text-xs font-mono text-foreground/30 flex justify-between items-center">
            <span>{`/* ${new Date().getFullYear()} Kyon */`}</span>
            <div className="flex items-center gap-4">
              <a
                href="/feed.xml"
                className="text-secondary hover:text-secondary transition-colors flex items-center gap-1.5"
                aria-label="rss feed"
              >
                <RssIcon size={11} />
                feed.xml
              </a>
              <span>powered by Next.js</span>
            </div>
          </div>
        </footer>

        {/* Floating back-to-top button - always visible */}
        <BackToTop />

        {/* Client-only easter eggs (console banner + konami) */}
        <EasterEggs />

        {/* Client-side Cmd+K search palette */}
        <CmdK posts={posts} docs={getDocsList()} />
        </body>
    </html>
  );
}
