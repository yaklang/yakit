export const areMITMDebugHooksEnabled = () => {
  return typeof window !== 'undefined' && window.yakitBridge?.app?.isMITMDebugHooksEnabled?.() === true
}
