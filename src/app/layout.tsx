import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import GlobalHeader from '@/components/branding/GlobalHeader';
import { Toaster } from "@/components/ui/toaster";
import { UserProvider } from '@/lib/user-context';
import ScrollTopOnMount from '@/components/ScrollTopOnMount';

// 强制动态渲染，避免构建时的cookie访问错误
export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NebulaHub 橙光 - 你的实用朋友小站",
  description: "一个面向朋友之间的实用小站，帮助协作、分享与日常生活的快速入口",
  keywords: ["NebulaHub", "橙光", "实用站点", "朋友协作", "工具"],
  icons: {
    icon: [
      { url: '/logo_icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/logo_icon.svg',
    shortcut: '/logo_icon.svg',
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${inter.className} scroll-smooth`}>
        <UserProvider>
          <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
            <GlobalHeader />
            <main className="flex-1 w-full">
              {children}
            </main>
          </div>
          <ScrollTopOnMount />
          <Toaster />
        </UserProvider>
      </body>
    </html>
  );
}
