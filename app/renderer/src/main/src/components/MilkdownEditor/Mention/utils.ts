import {APIFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"
import i18n from "@/i18n/i18n"

const tOriginal = i18n.getFixedT(null, "components")

export const apiNotepadEit: APIFunc<API.NotepadEitRequest, API.ActionSucceeded> = (query, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.NotepadEitRequest, API.ActionSucceeded>({
            method: "post",
            url: "notepad/eit",
            data: {...query}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", tOriginal("MilkdownEditor.mention.apiNotepadEitFailed", {error: String(err)}))
                reject(err)
            })
    })
}
