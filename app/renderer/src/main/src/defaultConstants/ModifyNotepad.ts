import {ModifyNotepadPageInfoProps} from "@/store/pageInfo"
import {NoteFilter} from "@/pages/notepadManage/notepadManage/utils"

export const defaultModifyNotepadPageInfo: ModifyNotepadPageInfoProps = {
    domId: "",
    notepadHash: "",
    title: "",
    keyWord: ""
}

export const defaultNoteFilter: NoteFilter = {
    Id: [],
    Title: [],
    Keyword: []
}
