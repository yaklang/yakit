import {genDefaultPagination} from "@/pages/invoker/schema"
import {QueryRisksRequest} from "./YakitRiskTableType"

export const defQueryRisksRequest: QueryRisksRequest = {
    Pagination: genDefaultPagination(20),
    Search: "",
    Network: "",
    Ports: "",
    RiskType: "",
    Token: "",
    WaitingVerified: false,
    Severity: "",
    FromId: 0,
    UntilId: 0
}
