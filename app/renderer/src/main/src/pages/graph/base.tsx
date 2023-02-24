export interface GraphData {
    type: "pie" | "bar" | "wordcloud" | string
    data: {id?: string, key: string, value: any}[]
}

export interface GraphProps extends GraphData{
    width?: number | string | any
    height?: number | string | any
    color?: string[]
}