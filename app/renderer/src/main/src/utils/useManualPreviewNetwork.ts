import { useRef } from 'react'
import type { PreviewNetwork } from './httpPreviewResources'

interface ResponseSnapshot {
  body: string
  packet?: Uint8Array
  url?: string
  id?: string
}
const sameResponse = (a: ResponseSnapshot, b: ResponseSnapshot) =>
  a.body === b.body &&
  a.url === b.url &&
  a.id === b.id &&
  (a.packet === b.packet ||
    (!!a.packet &&
      !!b.packet &&
      a.packet.length === b.packet.length &&
      a.packet.every((byte, index) => byte === b.packet![index])))

/** A render-mode preference cannot authorize network requests for another response. */
export const useManualPreviewNetwork = (snapshot: ResponseSnapshot, getNetwork?: () => PreviewNetwork | undefined) => {
  const grant = useRef<{ snapshot: ResponseSnapshot; network: PreviewNetwork }>()
  if (grant.current && !sameResponse(grant.current.snapshot, snapshot)) grant.current = undefined
  return {
    onRenderClick: (checked: boolean) => {
      const network = checked ? getNetwork?.() : undefined
      grant.current = network ? { snapshot, network } : undefined
    },
    consume: () => {
      const current = grant.current
      grant.current = undefined
      return current && sameResponse(current.snapshot, snapshot) ? current.network : undefined
    },
  }
}
