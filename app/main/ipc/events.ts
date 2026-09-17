import type { WebContents } from 'electron'
import { EVENT_CHANNEL } from '../../shared/communication/protocol'

export function sendEvent(
  contents: Pick<WebContents, 'send'> & Partial<Pick<WebContents, 'isDestroyed'>>,
  name: string,
  ...args: unknown[]
) {
  if (contents.isDestroyed?.()) return
  contents.send(EVENT_CHANNEL, { type: 'app', name, args })
}
