const TRANSIENT_ELECTRON_CDP_MESSAGES = new Set([
  'Promise was collected',
  'CDP bridge is not available, API is disabled',
])

export const isTransientElectronCDPError = (error) => TRANSIENT_ELECTRON_CDP_MESSAGES.has(error?.message)

// Callers must only wrap commands that are safe to execute again. The retry is
// deliberately limited to exact Electron CDP bridge transport errors observed
// while the bridge is collecting a remote result or briefly reattaching.
export const runIdempotentElectronCDPCommand = async (command, { onRetry } = {}) => {
  try {
    return await command()
  } catch (error) {
    if (!isTransientElectronCDPError(error)) throw error
    await onRetry?.(error)
    return command()
  }
}
