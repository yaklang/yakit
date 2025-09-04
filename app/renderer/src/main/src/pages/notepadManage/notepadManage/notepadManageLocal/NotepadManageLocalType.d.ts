import {Note, NoteContent, NoteFilter} from "../utils"

export interface NotepadManageLocalListProps {}
export interface NotepadManageLocalProps {}
export interface NotepadLocalActionProps {
    /**@name 当前操作的数据 */
    record: Note
    /**@name 删除事件回调 */
    onSingleRemoveAfter: () => void
}
export interface NotepadImportProps {
    /**@name 导入成功的事件回调 */
    onImportSuccessAfter: () => void
    /**@name 关闭事件回调 */
    onClose: () => void
    /**@name 弹窗作用域 */
    getContainer?: HTMLElement
}

export interface NotepadExportProps {
    /**@name 导出查询条件 */
    filter: NoteFilter
    /**@name 关闭事件回调 */
    onClose: () => void
    /**@name 弹窗作用域 */
    getContainer?: HTMLElement
}

export interface NotepadLocalSearchProps {}
