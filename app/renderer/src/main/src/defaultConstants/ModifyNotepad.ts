import {ModifyNotepadPageInfoProps} from "@/store/pageInfo"
import {NoteFilter} from "@/pages/notepadManage/notepadManage/utils"

export const defaultModifyNotepadPageInfo: ModifyNotepadPageInfoProps = {
    notepadHash: "",
    title: ""
}

export const defaultNoteFilter: NoteFilter = {
    Id: [],
    Title: [],
    ContentKeyword: []
}