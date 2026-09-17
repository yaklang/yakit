export const areMITMDebugHooksEnabled = () => {
  return typeof window !== 'undefined' && window.yakitDebugHooks === true
}
