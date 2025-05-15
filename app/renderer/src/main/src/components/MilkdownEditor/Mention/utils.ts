import {APIFunc} from "@/apiUtils/type"
import {NetWorkApi} from "@/services/fetch"
import {API} from "@/services/swagger/resposeType"
import {yakitNotify} from "@/utils/notification"

export const apiNotepadEit: APIFunc<API.NotepadEitRequest, API.ActionSucceeded> = (query, hiddenError) => {
    return new Promise((resolve, reject) => {
        NetWorkApi<API.NotepadEitRequest, API.ActionSucceeded>({
            method: "post",
            url: "notepad/eit",
            data: {...query}
        })
            .then(resolve)
            .catch((err) => {
                if (!hiddenError) yakitNotify("error", "获取记事本列表失败:" + err)
                reject(err)
            })
    })
}
