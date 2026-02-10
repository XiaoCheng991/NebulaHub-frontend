"use client";
import React from 'react';
import Link from 'next/link';
import { UserAvatar } from '@/components/ui/user-avatar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { useUser } from '@/lib/user-context';
import { MessageCircle, Settings, Sparkles, FolderUp, LogOut, Loader2 } from 'lucide-react';

type GlobalHeaderProps = {
  className?: string;
};

const GlobalHeader: React.FC<GlobalHeaderProps> = ({
  className = '',
}) => {
  const { user, loading } = useUser()
  const [src, setSrc] = React.useState<string>('/logo_icon.svg');

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    if (src !== '/public/logo_icon.svg') {
      img.src = '/public/logo_icon.svg';
      setSrc('/public/logo_icon.svg');
    }
  };

  return (
    <header className={`w-full sticky top-0 z-50 bg-transparent backdrop-blur-xl border-b border-gray-200/50 dark:border-gray-700/50 ${className}`} aria-label="站点头部">
      <div className="container mx-auto px-6 py-3 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <img src={src} alt="NebulaHub Logo" style={{ height: 40, width: 'auto' }} onError={handleError} className="rounded-xl" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-slate-800 dark:text-white tracking-tight">
              Nebula<span className="font-semibold text-slate-500 dark:text-slate-400">Hub</span>
            </span>
            <span className="text-[11px] font-medium text-orange-500 tracking-wide leading-tight">
              <span className="text-slate-500">Nova Pro</span>
              <span className="mx-1.5 text-slate-400">|</span>
              橙光
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center space-x-1 mx-auto">
          <Link 
            href="/dashboard" 
            className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:block">仪表盘</span>
          </Link>
          <Link 
            href="/chat" 
            className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          >
            <MessageCircle className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:block">消息</span>
          </Link>
          <Link 
            href="/drive" 
            className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          >
            <FolderUp className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:block">文件</span>
          </Link>
          <Link 
            href="/settings" 
            className="flex items-center gap-2 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100/50 dark:hover:bg-gray-800/50"
          >
            <Settings className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:block">设置</span>
          </Link>
        </nav>
        
        <div className="flex items-center gap-2">
          {loading ? (
            <div className="flex items-center gap-2 px-3">
              <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
            </div>
          ) : user ? (
            <>
              <Link href="/settings" className="flex items-center gap-2.5 p-2 rounded-xl bg-transparent hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-all duration-200">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 hidden sm:block">
                  Hi {user.displayName || user.username}!
                </span>
                <UserAvatar
                  avatarUrl={user.avatarUrl}
                  displayName={user.displayName}
                  size="sm"
                />
              </Link>
              <LogoutButton iconOnly />
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100/60 dark:bg-gray-800/60 hover:bg-gray-200/80 dark:hover:bg-gray-700/80 border border-gray-300/50 dark:border-gray-600/50 transition-all text-slate-700 dark:text-slate-300"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white transition-all shadow-md shadow-blue-500/20"
              >
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

export default GlobalHeader;
