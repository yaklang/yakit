export type ManualRequestSubmitAction = 'forward' | 'send-packet'

/**
 * Forward means "send the captured wire request unchanged". Any editor edit
 * or completed file replacement therefore requires SendPacket.
 */
export const resolveManualRequestSubmitAction = (
  requestChanged: boolean,
  hasLargeRequestReplacement: boolean,
): ManualRequestSubmitAction => {
  return requestChanged || hasLargeRequestReplacement ? 'send-packet' : 'forward'
}
