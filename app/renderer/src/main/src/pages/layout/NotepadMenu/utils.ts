import {isEnpriTrace} from "@/utils/envfile"
import i18n from "@/i18n/i18n"

const t = i18n.getFixedT(null, "notepad")

export const getNotepadNameByEdition = () => {
    /**只要是企业版就显示云文档，不区分其他 */
    if (isEnpriTrace()) {
        return t("NotepadMenu.cloudDocs")
    } else {
        return t("NotepadMenu.notepad")
    }
}
