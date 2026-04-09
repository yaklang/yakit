import { yakitShell } from './electronBridge'

export const openABSFileLocated = (u: string) => {
  yakitShell.openSpecifiedFile(u)
}
