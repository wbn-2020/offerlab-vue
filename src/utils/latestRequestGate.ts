export type LatestRequestLease = {
  signal: AbortSignal
  isCurrent: () => boolean
}

export const createLatestRequestGate = () => {
  let generation = 0
  let controller: AbortController | null = null

  const invalidate = () => {
    generation += 1
    controller?.abort()
    controller = null
  }

  const start = (): LatestRequestLease => {
    invalidate()
    const requestGeneration = generation
    const requestController = new AbortController()
    controller = requestController
    return {
      signal: requestController.signal,
      isCurrent: () => (
        generation === requestGeneration
        && controller === requestController
        && !requestController.signal.aborted
      ),
    }
  }

  return { start, invalidate }
}
