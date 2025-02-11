import {genDefaultPagination} from "@/pages/invoker/schema"
import {QueryRisksRequest} from "./YakitRiskTableType"

export const defQueryRisksRequest: QueryRisksRequest = {
    Pagination: {Page: 1, Limit: 20, OrderBy: "id", Order: "desc"},
    Search: "",
    Network: "",
    Ports: "",
    RiskType: "",
    Token: "",
    WaitingVerified: false,
    Severity: "",
    FromId: 0,
    UntilId: 0,
    Tags: "",
    IsRead: "", // 全部'' 已读:'true'，未读：'false'
    Title: "",
    RiskTypeList: [],
    SeverityList: [],
    TagList: [],
    IPList: [],
    Ids:[],
    RuntimeId:'',
}
