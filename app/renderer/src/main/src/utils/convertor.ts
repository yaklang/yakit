export const fixEncoding = (encoding?: string) => {
    switch ((encoding || "").toLowerCase()) {
        case "gbk":
        case "iso8859-1":
        case "iso-8859-1":
        case "gb-18030":
        case "binary":
        case "latin1":
            return "latin1"
        case "utf16":
        case "utf-16":
        case "utf-16-le":
        case "utf-16le":
        case "utf16le":
            return "utf16"
        case "utf8":
        case "utf-8":
            return "utf8"
        default:
            return "latin1"
    }
}