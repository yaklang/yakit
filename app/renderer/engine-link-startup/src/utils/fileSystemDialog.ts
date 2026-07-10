import { yakitDialog } from './electronBridge'

/** 引用 electron.d.ts @OpenDialogOptions */
export interface OpenDialogOptions {
  title?: string
  /** 默认值：当前用户的桌面目录 */
  defaultPath?: string
  /**
   * Custom label for the confirmation button, when left empty the default label will
   * be used.
   */
  buttonLabel?: string
  filters?: {
    // Docs: https://electronjs.org/docs/api/structures/file-filter
    extensions: string[]
    name: string
  }[]
  /**
   * Contains which features the dialog should use. The following values are
   * supported:
   */
  properties?: Array<
    | 'openFile'
    | 'openDirectory'
    | 'multiSelections'
    | 'showHiddenFiles'
    | 'createDirectory'
    | 'promptToCreate'
    | 'noResolveAliases'
    | 'treatPackageAsDirectory'
    | 'dontAddToRecent'
  >
  /**
   * Message to display above input boxes.
   *
   * @platform darwin
   */
  message?: string
  /**
   * Create security scoped bookmarks when packaged for the Mac App Store.
   *
   * @platform darwin,mas
   */
  securityScopedBookmarks?: boolean
}

/** 引用 electron.d.ts @OpenDialogReturnValue */
export interface OpenDialogReturnValue {
  /**
   * whether or not the dialog was canceled.
   */
  canceled: boolean
  /**
   * An array of file paths chosen by the user. If the dialog is cancelled this will
   * be an empty array.
   */
  filePaths: string[]
  /**
   * An array matching the `filePaths` array of base64 encoded strings which contains
   * security scoped bookmark data. `securityScopedBookmarks` must be enabled for
   * this to be populated. (For return values, see table here.)
   *
   * @platform darwin,mas
   */
  bookmarks?: string[]
}

/** @name 选择文件(夹)-打开系统文件弹窗 */
export const handleOpenFileSystemDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue> = (options) => {
  return new Promise((resolve, reject) => {
    yakitDialog
      .openFileSystemDialog(options)
      .then((res: OpenDialogReturnValue) => {
        resolve(res)
      })
      .catch(reject)
  })
}
