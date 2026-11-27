import { yakitShell } from './bridgeFacade'

export const openABSFileLocated = (u: string) => {
  yakitShell.openSpecifiedFile(u)
}
