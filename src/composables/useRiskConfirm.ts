import { reactive } from 'vue'

export type RiskLevel = 'medium' | 'high' | 'critical'

export interface RiskConfirmRequest {
  title: string
  level: RiskLevel
  reversible: boolean
  impactCount: number | string
  objects?: string[]
  context?: string[]
  confirmText?: string
  requireNote?: boolean
  noteLabel?: string
  notePlaceholder?: string
  confirmationPhrase?: string
}

interface RiskConfirmState {
  open: boolean
  request: RiskConfirmRequest | null
}

export const useRiskConfirm = () => {
  const riskConfirmState = reactive<RiskConfirmState>({
    open: false,
    request: null,
  })

  let pendingResolve: ((note: string | null) => void) | null = null

  const closeRiskConfirm = (note: string | null) => {
    riskConfirmState.open = false
    riskConfirmState.request = null
    pendingResolve?.(note)
    pendingResolve = null
  }

  const confirmRisk = (request: RiskConfirmRequest) => new Promise<string | null>((resolve) => {
    if (pendingResolve) pendingResolve(null)
    pendingResolve = resolve
    riskConfirmState.request = request
    riskConfirmState.open = true
  })

  const resolveRiskConfirm = (note: string) => closeRiskConfirm(note)
  const cancelRiskConfirm = () => closeRiskConfirm(null)

  return {
    riskConfirmState,
    confirmRisk,
    resolveRiskConfirm,
    cancelRiskConfirm,
  }
}
