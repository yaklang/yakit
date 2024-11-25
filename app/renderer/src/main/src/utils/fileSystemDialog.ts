const {ipcRenderer} = window.require("electron")

/** 引用 electron.d.ts @OpenDialogOptions */
interface OpenDialogOptions {
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
        | "openFile"
        | "openDirectory"
        | "multiSelections"
        | "showHiddenFiles"
        | "createDirectory"
        | "promptToCreate"
        | "noResolveAliases"
        | "treatPackageAsDirectory"
        | "dontAddToRecent"
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
interface OpenDialogReturnValue {
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
        ipcRenderer
            .invoke("open-file-system-dialog", options)
            .then((res: OpenDialogReturnValue) => {
                resolve(res)
            })
            .catch(reject)
    })
}

/** 引用 electron.d.ts @SaveDialogOptions */
interface SaveDialogOptions {
    /**
     * The dialog title. Cannot be displayed on some _Linux_ desktop environments.
     */
    title?: string
    /**
     * Absolute directory path, absolute file path, or file name to use by default.
     * 默认值：当前用户的桌面目录
     */
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
     * Message to display above text fields.
     *
     * @platform darwin
     */
    message?: string
    /**
     * Custom label for the text displayed in front of the filename text field.
     *
     * @platform darwin
     */
    nameFieldLabel?: string
    /**
     * Show the tags input box, defaults to `true`.
     *
     * @platform darwin
     */
    showsTagField?: boolean
    properties?: Array<
        | "showHiddenFiles"
        | "createDirectory"
        | "treatPackageAsDirectory"
        | "showOverwriteConfirmation"
        | "dontAddToRecent"
    >
    /**
     * Create a security scoped bookmark when packaged for the Mac App Store. If this
     * option is enabled and the file doesn't already exist a blank file will be
     * created at the chosen path.
     *
     * @platform darwin,mas
     */
    securityScopedBookmarks?: boolean
}
/** 引用 electron.d.ts @SaveDialogReturnValue */
interface SaveDialogReturnValue {
    /**
     * whether or not the dialog was canceled.
     */
    canceled: boolean
    /**
     * If the dialog is canceled, this will be `undefined`.
     */
    filePath?: string
    /**
     * Base64 encoded string which contains the security scoped bookmark data for the
     * saved file. `securityScopedBookmarks` must be enabled for this to be present.
     * (For return values, see table here.)
     *
     * @platform darwin,mas
     */
    bookmark?: string
}
/** @name 保存文件-打开系统文件弹窗 */
export const handleSaveFileSystemDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue> = (options) => {
    return new Promise((resolve, reject) => {
        ipcRenderer
            .invoke("save-file-system-dialog", options)
            .then((res: SaveDialogReturnValue) => {
                resolve(res)
            })
            .catch(reject)
    })
}
