import { ipc } from '../../../../../shared/communication/window-client'

export { ipc }
if (import.meta.hot) import.meta.hot.dispose(() => ipc.dispose({ preserveMITM: true }))
export type {
  GrpcApi,
  GrpcApiOfKind,
  GrpcInput,
  GrpcOutput,
  StreamOptions,
  LocalCallOptions,
} from '../../../../../shared/communication/protocol'
export type { StreamTask } from '../../../../../shared/communication/client'

export { BridgeError } from '../../../../../shared/communication/errors'
