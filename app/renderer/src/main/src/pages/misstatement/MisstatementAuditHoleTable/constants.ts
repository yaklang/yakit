import {API} from "@/services/swagger/resposeType"

export const defSSARiskWhereRequest: API.SSARiskWhereRequest = {
    page: 1,
    limit: 20,
    order_by: "id",
    order: "desc"
}
