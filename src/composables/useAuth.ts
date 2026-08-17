import { useAuthStore } from '@/stores/auth'
import { authApi, AUTH_PROFILE_TIMEOUT_MS } from '@/api/auth'
import { authTokenStore } from '@/utils/authTokenStore'

interface AuthOperationOwner {
  requestId: number
  sessionGeneration: number
}

class AuthOperationSupersededError extends Error {
  constructor() {
    super('认证操作已被更新的会话替代')
    this.name = 'AuthOperationSupersededError'
  }
}

let authOperationRequestId = 0

export function useAuth() {
  const authStore = useAuthStore()

  const beginAuthOperation = (): AuthOperationOwner => ({
    requestId: ++authOperationRequestId,
    sessionGeneration: authStore.getSessionGeneration(),
  })

  const authOperationRequestIsCurrent = (owner: AuthOperationOwner) => (
    owner.requestId === authOperationRequestId
  )

  const authOperationBoundaryIsCurrent = (owner: AuthOperationOwner) => (
    authOperationRequestIsCurrent(owner)
    && owner.sessionGeneration === authStore.getSessionGeneration()
  )

  const requireCurrentAuthOperation = (owner: AuthOperationOwner) => {
    if (!authOperationBoundaryIsCurrent(owner)) {
      throw new AuthOperationSupersededError()
    }
  }

  const loginWithOwner = async (
    owner: AuthOperationOwner,
    account: string,
    password: string,
  ) => {
    const result = await authApi.login({ account, password }).catch((error) => {
      requireCurrentAuthOperation(owner)
      throw error
    })
    requireCurrentAuthOperation(owner)
    const token = result.data?.token
    if (!token) {
      throw new Error('登录响应缺少 token')
    }
    authStore.setToken(token)
    owner.sessionGeneration = authStore.getSessionGeneration()
    const sessionVersion = authTokenStore.getVersion()
    const me = await authApi.fetchMe(AUTH_PROFILE_TIMEOUT_MS).catch((error) => {
      if (!authOperationRequestIsCurrent(owner)) {
        throw new AuthOperationSupersededError()
      }
      if (authStore.ownsSession(token, sessionVersion, owner.sessionGeneration)) {
        authStore.logout()
      }
      throw error
    })
    if (
      !authOperationRequestIsCurrent(owner)
      || !authStore.ownsSession(token, sessionVersion, owner.sessionGeneration)
    ) {
      throw new AuthOperationSupersededError()
    }
    if (!me.data) {
      authStore.logout()
      throw new Error('账号资料为空，请重新登录。')
    }
    authStore.setUser(me.data)
  }

  const login = async (account: string, password: string) => {
    const owner = beginAuthOperation()
    await loginWithOwner(owner, account, password)
  }

  const register = async (email: string, password: string, nickname: string) => {
    const owner = beginAuthOperation()
    await authApi.register({ email, password, nickname }).catch((error) => {
      requireCurrentAuthOperation(owner)
      throw error
    })
    requireCurrentAuthOperation(owner)
    await loginWithOwner(owner, email, password)
  }

  const logout = async () => {
    const owner = beginAuthOperation()
    const token = authTokenStore.get()
    const sessionVersion = authTokenStore.getVersion()
    try {
      await authApi.logout()
    } catch (error) {
      if (!authOperationRequestIsCurrent(owner)) {
        throw new AuthOperationSupersededError()
      }
      if (!authOperationBoundaryIsCurrent(owner) && authTokenStore.get() === null) {
        return
      }
      throw error
    }
    requireCurrentAuthOperation(owner)
    if (token && !authStore.ownsSession(token, sessionVersion, owner.sessionGeneration)) {
      throw new AuthOperationSupersededError()
    }
    authStore.logout()
  }

  return {
    user: authStore.user,
    isLoggedIn: authStore.isLoggedIn,
    login,
    register,
    logout,
  }
}
