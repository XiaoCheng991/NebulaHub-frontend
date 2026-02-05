/**
 * 认证相关工具函数（统一入口）
 * 客户端组件：从 client-auth.ts 导入
 * 服务端组件：从 server-auth.ts 导入
 */

// 客户端函数
export {
  login,
  register,
  logout,
  getUserInfo,
  getLocalUserInfo,
  isAuthenticated,
  getToken,
  type LoginRequest,
  type RegisterRequest,
  type LoginResponse,
  type ApiResponse,
} from './client-auth'

// 服务端函数
export {
  getServerToken,
  isServerAuthenticated,
  getServerUserInfo,
  type ServerUserInfo,
} from './server-auth'
