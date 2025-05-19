import {GetReleaseEdition, PRODUCT_RELEASE_EDITION} from "@/utils/envfile"

export const getNotepadNameByEdition = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return "云文档"
        default:
            return "记事本"
    }
}
