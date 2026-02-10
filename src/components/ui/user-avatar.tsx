"use client"

import { useMemo, useState } from "react"

interface UserAvatarProps {
  avatarUrl?: string | null
  displayName?: string | null
  email?: string | null
  username?: string | null
  size?: "sm" | "md" | "lg"
  className?: string
}

export function UserAvatar({
  avatarUrl,
  displayName,
  email,
  username,
  size = "md",
  className = ""
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  const sizeClasses = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl"
  }

  const sizeClass = sizeClasses[size]

  // 获取用于显示的文字：优先使用 displayName，其次 username，最后 email
  const displayText = useMemo(() => {
    const text = displayName || username || email || ""
    if (!text) return "U"

    // 提取所有中文字符
    const chars = text.split('')
    const chineseChars = chars.filter(char => /[\u4e00-\u9fa5]/.test(char))

    let selectedChar = ""

    if (chineseChars.length > 0) {
      // 有中文，使用第一个中文字符（通常是姓氏或名字的首字，最具辨识度）
      selectedChar = chineseChars[0]
    } else {
      // 没有中文，使用第一个字母
      selectedChar = chars[0].toUpperCase()
    }

    return selectedChar
  }, [displayName, username, email])

  // 生成优雅的默认头像 URL
  const defaultAvatarUrl = useMemo(() => {
    // 生成一个随机的渐变色（基于用户名，但色彩更柔和）
    const seed = (displayName || username || email || "").charCodeAt(0) || 0
    const hue1 = 200 + (seed * 47) % 60  // 蓝色系 (200-260)
    const hue2 = 260 + (seed * 73) % 40  // 紫色系 (260-300)

    const lightness1 = 60 + (seed * 13) % 15  // 60-75%
    const lightness2 = 50 + (seed * 17) % 15  // 50-65%

    // 更优雅的 SVG 设计：添加微妙的图案、阴影和光泽效果
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:hsl(${hue1},75%,${lightness1}%)"/>
            <stop offset="100%" style="stop-color:hsl(${hue2},80%,${lightness2}%)"/>
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000" flood-opacity="0.15"/>
          </filter>
          <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style="stop-color:#fff;stop-opacity:0.3"/>
            <stop offset="50%" style="stop-color:#fff;stop-opacity:0.1"/>
            <stop offset="100%" style="stop-color:#fff;stop-opacity:0"/>
          </linearGradient>
        </defs>

        <!-- 背景圆形 -->
        <circle cx="50" cy="50" r="48" fill="url(#bg)" filter="url(#shadow)"/>

        <!-- 装饰性外圈 -->
        <circle cx="50" cy="50" r="44" fill="none" stroke="#fff" stroke-opacity="0.2" stroke-width="1.5"/>

        <!-- 光泽效果 -->
        <ellipse cx="50" cy="35" rx="30" ry="20" fill="url(#shine)"/>

        <!-- 文字阴影 -->
        <filter id="textShadow">
          <feDropShadow dx="0" dy="1" stdDeviation="1" flood-color="#000" flood-opacity="0.2"/>
        </filter>

        <!-- 用户名字 -->
        <text
          x="50"
          y="52"
          font-family="'PingFang SC', 'Microsoft YaHei', sans-serif"
          font-size="42"
          font-weight="600"
          fill="#fff"
          text-anchor="middle"
          dominant-baseline="central"
          filter="url(#textShadow)"
          letter-spacing="1"
        >${displayText}</text>
      </svg>
    `

    // 转换为 Data URI
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }, [displayText, displayName, username, email])

  const finalAvatarUrl = avatarUrl || defaultAvatarUrl

  return (
    <>
      {(!imageError) ? (
        <img
          src={finalAvatarUrl}
          alt={displayName || "Avatar"}
          className={`${sizeClass} rounded-full object-cover ${className}`}
          onError={() => setImageError(true)}
        />
      ) : (
        <div className={`${sizeClass} rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center shadow-lg ${className}`}>
          <span className="text-white font-bold">{displayText}</span>
        </div>
      )}
    </>
  )
}
