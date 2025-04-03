import {LocalGVS} from "@/enums/localGlobal"
import {GetReleaseEdition, PRODUCT_RELEASE_EDITION} from "../envfile"

export const getEnginePortCacheKey = () => {
    switch (GetReleaseEdition()) {
        case PRODUCT_RELEASE_EDITION.EnpriTrace:
            return LocalGVS.EEYaklangEnginePort

        case PRODUCT_RELEASE_EDITION.EnpriTraceAgent:
        case PRODUCT_RELEASE_EDITION.BreachTrace:
            return LocalGVS.SEYaklangEnginePort

        case PRODUCT_RELEASE_EDITION.IRify:
            return LocalGVS.IRIFYYaklangEnginePort

        case PRODUCT_RELEASE_EDITION.IRifyEnpriTrace:
            return LocalGVS.IRIFYEEYaklangEnginePort

        case PRODUCT_RELEASE_EDITION.Yakit:
            return LocalGVS.YaklangEnginePort

        default:
            return LocalGVS.YaklangEnginePort
    }
}
