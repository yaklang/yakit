export const Uint8ArrayToString = (data: Uint8Array, encoding?: "utf-8" | "gbk") => {
    if (!data) {
        return ""
    }
    return new Buffer(data).toString(fixEncoding(encoding))
    // let buffer = new Buffer(data.buffer) // (Buffer).from(data.buffer);
    // const result = buffer.toString(encoding && "utf-8");
    // return resultz
    // return data.reduce((acc, i) => acc += String.fromCharCode.apply(null, [i]), '')
}

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
        default:
            return "utf8"
    }
}