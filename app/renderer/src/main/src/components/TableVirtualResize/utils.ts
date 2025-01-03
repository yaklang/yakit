/**
 * @name 单元格背景色类型
 * @description 该类型必须按照升序排列
 */
type CellColor = "BLUE" | "CYAN" | "GREEN" | "GREY" | "ORANGE" | "PURPLE" | "RED" | "YELLOW"

/** @name 单元格背景色类型对应Tag */
export const TableCellToColorTag: Record<CellColor, string> = {
    BLUE: "YAKIT_COLOR_BLUE",
    CYAN: "YAKIT_COLOR_CYAN",
    GREEN: "YAKIT_COLOR_GREEN",
    GREY: "YAKIT_COLOR_GREY",
    ORANGE: "YAKIT_COLOR_ORANGE",
    PURPLE: "YAKIT_COLOR_PURPLE",
    RED: "YAKIT_COLOR_RED",
    YELLOW: "YAKIT_COLOR_YELLOW"
}

/**
 * @name 过滤出内容里的颜色Tag并转换成表格单元格可识别的颜色内容
 * @description 传入的内容中Tag是由'|'分割的(该分隔符由后端定义的)
 * @description 过滤出的颜色通过空格分割
 * @description 过滤出来的颜色样式为 "table-cell-bg-{color}"
 */
export const filterColorTag = (content?: string) => {
    if (!content || content.indexOf("YAKIT_COLOR_") === -1) return ""

    let colors: string[] = []
    try {
        colors = content
            .split("|")
            .filter((item) => item.indexOf("YAKIT_COLOR_") > -1)
            .map((item) => (item.split("_").pop() || "").toLowerCase())
            .filter((item) => !!item)
            .sort()
            .map((item) => `table-cell-bg-${item}`)
    } catch (error) {}
    return colors.length === 0 ? "" : colors.join(" ")
}

/**
 * @name 解析数据里传递的颜色内容并生成对应的颜色类名后缀
 * @description 传入的内容中, 对应颜色的内容是由 filterColorTag 生成的
 */
export const parseColorTag = (content?: string) => {
    if (!content) return ""

    let colors: string[] = []
    try {
        colors = content
            .split(" ")
            .map((item) => (item.split("-").pop() || "").toLowerCase())
            .filter((item) => !!item)
            .sort()
            .slice(0, 3)
    } catch (error) {}
    return colors.length === 0 ? "" : colors.join("-")
}

/**
 * @name 判断是否为单色的情况下，同时颜色为红色
 */
export const isCellRedSingleColor = (content?: string) => {
    if (!content) return false

    try {
        const colors: string[] = content.split(" ").filter((item) => !!item && item.indexOf("table-cell-bg-") > -1)
        if (colors.length === 1 && colors[0] === "table-cell-bg-red") return true
        else return false
    } catch (error) {
        return false
    }
}
