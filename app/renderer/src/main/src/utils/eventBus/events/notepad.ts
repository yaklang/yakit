export type NotepadEventProps = {
    /**
     * @name 本地笔记本数据异常信号
     * @param message 错误信息
     * @param noteId
     * */
    localDataError: string
    /**刷新定位元素，滚动到定位 */
    refreshPositionElement: string
}