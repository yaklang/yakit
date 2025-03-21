import {ModifyNotepadPageInfoProps} from "@/store/pageInfo"
import {NoteFilter} from "@/pages/notepadManage/notepadManage/utils"

export const defaultModifyNotepadPageInfo: ModifyNotepadPageInfoProps = {
    notepadHash: "",
    title: "",
    keyWordInfo: {
        keyWord: "",
        position: 0
    }
}

export const defaultNoteFilter: NoteFilter = {
    Id: [],
    Title: [],
    Keyword: []
}
