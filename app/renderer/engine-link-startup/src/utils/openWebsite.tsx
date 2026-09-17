import { ipc } from '../../../../shared/communication/window-client'
export const openABSFileLocated = (u: string) => {
  ipc.invoke('local', 'open-specified-file', u)
}
