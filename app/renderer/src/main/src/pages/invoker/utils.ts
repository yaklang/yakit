/**
 *
 * @param fileItem 文件对象
 * @description 判断是否是插件执行日志文件对象
 * @returns
 */
export const isPluginExecuteLogFileItem = (fileItem) => {
    return Object.hasOwn(fileItem, "action")
}

/**根据权限码输出权限内容 */
export const modeToPermissions = (mode) => {
    // 确保输入八进制数
    if (!/^0[0-7]+$/.test(mode)) {
        return null
    }

    // 解析后三位
    const permissions = mode
        .slice(-3)
        .split("")
        .map((digit) => {
            const num = parseInt(digit, 8) // 将八进制字符转换为数字
            return (
                (num & 4 ? "r" : "-") + // 读权限
                (num & 2 ? "w" : "-") + // 写权限
                (num & 1 ? "x" : "-") // 执行权限
            )
        })
    return permissions
}
