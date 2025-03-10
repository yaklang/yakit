import {Note, NoteFilter} from "../utils"

export interface NotepadManageLocalProps {}
export interface NotepadLocalActionProps {
    /**@name 当前操作的数据 */
    record: Note
    /**@name 当前打开的笔记本编辑页面数据 */
    notepadPageList: PageNodeItemProps[]
    /**@name 删除事件回调 */
    onSingleRemoveAfter: () => void
}
export interface NotepadImportProps {
    /**@name 导入成功的事件回调 */
    onImportSuccessAfter: () => void
    /**@name 关闭事件回调 */
    onClose: () => void
}

export interface NotepadExportProps {
    /**@name 导出查询条件 */
    filter: NoteFilter
    /**@name 关闭事件回调 */
    onClose: () => void
}
