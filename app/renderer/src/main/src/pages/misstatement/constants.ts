export const defTablePage = {
    page: 1,
    limit: 20,
    order_by: "id",
    order: "desc"
}

export interface TablePage {
    page: number
    limit: number
    order_by: string
    order: string
}
