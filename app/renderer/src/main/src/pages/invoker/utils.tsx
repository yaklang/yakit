import {YakitTagColor} from "@/components/yakitUI/YakitTag/YakitTagType"
import {ReactNode} from "react"
import {FileActionEnum, PluginExecuteLogFile} from "../plugins/operator/pluginExecuteResult/PluginExecuteResultType.d"
import {YakitEditor} from "@/components/yakitUI/YakitEditor/YakitEditor"

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

export const getFileActionStatus = (
    action: PluginExecuteLogFile.FileActionType,
    action_message: PluginExecuteLogFile.FileActionMessage
) => {
    let content: ReactNode = "" //预览内容
    let message: string = "" //操作描述
    let actionText: string = "未知操作" //操作权限
    let color: YakitTagColor = "white"
    try {
        switch (action) {
            case FileActionEnum.Read_Action:
                const read = {...action_message} as PluginExecuteLogFile.ReadFileActionMessage
                const readContent = read.content || ""
                actionText = "读取"
                message = `${read.offset}-${read.offset + read.length} ${read.unit}`
                content = readContent.length > 200 ? readContent.substring(0, 200) + "..." : readContent
                break
            case FileActionEnum.Write_Action:
                const write = {...action_message} as PluginExecuteLogFile.WriteFileActionMessage
                const writeContent = write.content || ""
                actionText = "修改内容"
                message = `修改方式:${write.mode}`
                content = writeContent.length > 200 ? writeContent.substring(0, 200) + "..." : writeContent
                break
            case FileActionEnum.Create_Action:
                const create = {...action_message} as PluginExecuteLogFile.CreateFileActionMessage
                actionText = "创建"
                color = "success"
                message = `创建${create.isDir ? "文件夹" : "文件"}`
                content = "暂无可预览内容"
                break
            case FileActionEnum.Delete_Action:
                const remove = {...action_message} as PluginExecuteLogFile.DELETEFileActionMessage
                actionText = "删除"
                color = "danger"
                message = `删除${remove.isDir ? "文件夹" : "文件"}`
                content = `${remove.isDir ? "文件夹" : "文件"}已被删除,无法展示预览内容`
                break
            case FileActionEnum.Status_Action:
                const status = {...action_message} as PluginExecuteLogFile.STATUSFileActionMessage
                actionText = "查看元信息"
                content = (
                    <div style={{height: 300}}>
                        {/**NOTE - 个数过多后，可能会有性能影响 */}
                        <YakitEditor readOnly={true} type='yak' value={JSON.stringify(status.status, null, 2)} />
                    </div>
                )
                break
            case FileActionEnum.Chmod_Action:
                const chmod = {...action_message} as PluginExecuteLogFile.CHMODFileActionMessage
                actionText = "修改权限"
                const mode = modeToPermissions(chmod.chmodMode)
                content = (
                    <>
                        所属者权限: {mode ? mode[0] : "未知"}
                        <br />
                        所属组权限: {mode ? mode[1] : "未知"}
                        <br />
                        其他用户权限: {mode ? mode[2] : "未知"}
                    </>
                )
                break
            case FileActionEnum.Find_Action:
                const find = {...action_message} as PluginExecuteLogFile.FINDFileActionMessage
                actionText = "查找"
                message = `通过${find.mode}查找到${find.content.length}个满足条件${find.condition}的文件`
                content = "暂无可预览内容"
                break
            default:
                break
        }
    } catch (error) {
        actionText = action
        message = action_message.message
    }
    return {
        color,
        action: actionText,
        message,
        content
    }
}
