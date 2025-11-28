import {isEnpriTrace} from "@/utils/envfile"
import i18n from "@/i18n/i18n" // 你的 i18n 初始化文件路径

export const getNotepadNameByEdition = () => {
    const lang = i18n.language || "zh"
    /**只要是企业版就显示云文档，不区分其他 */
    if (isEnpriTrace()) {
        return lang === "zh" ? "云文档" : "Cloud Docs"
    } else {
        return lang === "zh" ? "记事本" : "Notepad"
    }
}
