/**
 * 认证相关工具函数（统一入口）
 * 客户端组件：从 @/lib/api/modules/auth 导入
 * 服务端组件：从 server-auth.ts 导入
 */

// 客户端函数 - 使用新的双 Token 管理器
export {
  login,
  register,
  logout,
  getUserInfo,
  getLocalUserInfo,
  refreshTokenApi as refreshAccessToken,
  getTokenRemainingTime,
  startTokenRefreshTimer,
  type LoginRequest,
  type RegisterRequest,
  type LoginResponse,
} from './api/modules/auth'

// 从 Token Manager 导出
export {
  getAccessToken as getToken,
  getRefreshToken,
  isAuthenticated,
  initTokenManager,
} from './auth/dual-token-manager'

// 重新导出 ApiResponse 类型（兼容旧代码）
export type { ApiResponse } from './api/types'

// 服务端函数
export {
  getServerToken,
  isServerAuthenticated,
  getServerUserInfo,
  type ServerUserInfo,
} from './server-auth'
