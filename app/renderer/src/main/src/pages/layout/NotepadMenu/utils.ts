import {GetReleaseEdition, PRODUCT_RELEASE_EDITION} from "@/utils/envfile"
import i18n from "@/i18n/i18n" // 你的 i18n 初始化文件路径

export const getNotepadNameByEdition = () => {
    const lang = i18n.language || "zh"
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return lang === "zh" ? "云文档" : "Cloud Docs"
        default:
            return lang === "zh" ? "记事本" : "Notepad"
    }
}
