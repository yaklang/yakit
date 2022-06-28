/* eslint-disable */
import {saveAs} from "file-saver"
import moment from "moment"
import * as XLSX from "xlsx"
import * as XLSXStyle from "xlsx-style"

function sheet_from_array_of_arrays(data, optsSingleCellSetting) {
    var ws = {}
    var range = {
        s: {
            c: 10000000,
            r: 10000000
        },
        e: {
            c: 0,
            r: 0
        }
    }
    for (var R = 0; R != data.length; ++R) {
        for (var C = 0; C != data[R].length; ++C) {
            if (range.s.r > R) range.s.r = R
            if (range.s.c > C) range.s.c = C
            if (range.e.r < R) range.e.r = R
            if (range.e.c < C) range.e.c = C
            var cell: XLSX.CellObject = {
                v: data[R][C],
                t: "s"
            }
            if (cell.v == null) continue
            // 根据单元格内容设置单元格样式
            if (R > 0 && C === optsSingleCellSetting.c) {
                if (typeof cell.v === "string" || typeof cell.v === "number") {
                    cell.s = optsSingleCellSetting.colorObj[cell.v]
                }
            }
            var cell_ref = XLSX.utils.encode_cell({
                c: C,
                r: R
            })

            if (typeof cell.v === "number") cell.t = "n"
            else if (typeof cell.v === "boolean") cell.t = "b"
            else cell.t = "s"

            ws[cell_ref] = cell
        }
    }
    if (range.s.c < 10000000) ws["!ref"] = XLSX.utils.encode_range(range)
    return ws
}

function s2ab(s) {
    var buf = new ArrayBuffer(s.length)
    var view = new Uint8Array(buf)
    for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xff
    return buf
}

interface ExcelJsonProps {
    header: string[]
    data: Array<string[]>
    filename: string
    autoWidth: boolean
    bookType: string
    optsSingleCellSetting?: CellSetting
    optsUnifiedCellSetting?: any
}

export interface CellSetting {
    c: number
    colorObj?: any
}

export function export_json_to_excel({
    header = [],
    data = [],
    filename = "",
    autoWidth = true,
    bookType = "xlsx",
    optsSingleCellSetting, //  单个单元格样式
    optsUnifiedCellSetting // 整列或者整行的单元格样式，这个暂时没有做，因为没有需求
}: ExcelJsonProps) {
    /* original data */
    filename = filename || "excel-list"
    data = [...data]
    data.unshift(header)

    var ws_name = "SheetJS"
    var wb: XLSX.WorkBook = {
            SheetNames: [],
            Sheets: {}
        },
        ws = sheet_from_array_of_arrays(data, optsSingleCellSetting)

    if (autoWidth) {
        /*设置worksheet每列的最大宽度*/
        const colWidth = data.map((row) =>
            row.map((val) => {
                /*先判断是否为null/undefined*/
                if (val == null) {
                    return {
                        wch: 10
                    }
                } else if (val.toString().charCodeAt(0) > 255) {
                    /*再判断是否为中文*/
                    return {
                        wch: val.toString().length * 2
                    }
                } else {
                    return {
                        wch: val.toString().length
                    }
                }
            })
        )
        /*以第一行为初始值*/
        let result = colWidth[0]
        for (let i = 1; i < colWidth.length; i++) {
            for (let j = 0; j < colWidth[i].length; j++) {
                if (result[j]["wch"] < colWidth[i][j]["wch"]) {
                    result[j]["wch"] = colWidth[i][j]["wch"]
                }
            }
        }
        ws["!cols"] = result
    }

    /* add worksheet to workbook */
    wb.SheetNames.push(ws_name)
    wb.Sheets[ws_name] = ws

    var wbout = XLSXStyle.write(wb, {
        bookType: bookType,
        bookSST: false,
        type: "binary"
    })
    saveAs(
        new Blob([s2ab(wbout)], {
            type: "application/octet-stream"
        }),
        `${filename}(${moment().valueOf()}).${bookType}`
    )
}
