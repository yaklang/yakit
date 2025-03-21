import {Note} from "@/pages/notepadManage/notepadManage/utils"
import moment from "moment"

export const defaultNote: Note = {
    Id: 0,
    Title: "",
    Content: "",
    CreateAt: moment().unix(),
    UpdateAt: moment().unix()
}
