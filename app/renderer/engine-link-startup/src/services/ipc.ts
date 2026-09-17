import { ipc } from '../../../../shared/communication/window-client'

export { ipc }
if (import.meta.hot) import.meta.hot.dispose(() => ipc.dispose())
