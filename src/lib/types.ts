// 通用类型定义

export type Message = {
  id: string;
  content: string;
  sender_name: string;
  sender_id: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  reply_to_id: string | null;
  quoted_content: string | null;
  quoted_sender_name: string | null;
};

export type User = {
  id: string;
  name: string;
  avatar?: string;
  created_at: string;
};

// 消息排序辅助函数
export const sortMessagesByTime = (messages: Message[]): Message[] => {
  return [...messages].sort((a, b) =>
    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
};

// 生成随机用户 ID
export const generateUserId = (): string => {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// 从名字生成颜色
export const getAvatarColor = (name: string): string => {
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500',
  ];

  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};
