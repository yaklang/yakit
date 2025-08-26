/**
 * 
 * @param fileItem 文件对象
 * @description 判断是否是插件执行日志文件对象
 * @returns 
 */
export const isPluginExecuteLogFileItem = (fileItem) => {
    return Object.hasOwn(fileItem, "action")
}
