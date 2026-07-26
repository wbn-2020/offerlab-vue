// 会话过期处理桥接。
//
// api/client.ts 在拦截到当前会话的 401 时需要跳转登录，但它不能直接 import
// router —— 那会形成 client → router → guards → ops → client 的循环依赖。
// 这里用一个注册表解耦：client 只发出「会话已过期」信号，由 main.ts 在
// router 就绪后注册真正的处理器（SPA 软导航 + 提示），从而避免整页硬刷新
// 丢失用户正在输入的评论、联系请求等内存态。

export interface SessionExpiredContext {
  /** 已通过 safeRedirect 清洗的回跳目标；为空表示回跳首页。 */
  redirect: string
}

type SessionExpiredHandler = (context: SessionExpiredContext) => void | Promise<void>

let handler: SessionExpiredHandler | null = null

export const registerSessionExpiredHandler = (fn: SessionExpiredHandler) => {
  handler = fn
}

/**
 * 通知会话已过期。返回 true 表示已有处理器接管（SPA 软导航），
 * 调用方无需再做整页跳转兜底。
 */
export const notifySessionExpired = async (context: SessionExpiredContext): Promise<boolean> => {
  if (!handler) return false
  try {
    await handler(context)
    return true
  } catch {
    // 处理器异常时交回调用方走硬跳转兜底。
    return false
  }
}
