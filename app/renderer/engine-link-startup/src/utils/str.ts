import {yakitNotify} from "@/utils/notification"
import {Buffer} from "buffer"

export function Uint8ArrayToString(fileData: Buffer | Uint8Array, encoding?: "utf8" | "latin1" | any) {
    try {
        return Buffer.from(fileData).toString(encoding ? encoding : "utf8")
    } catch (e) {
        yakitNotify("error", `Uint8ArrayToString (${fileData}) Failed: ${e}`)
        return `${fileData}`
    }
}

export function StringToUint8Array(str: string, encoding?: "latin1" | "ascii" | "utf8") {
    try {
        if (!encoding) {
            return Buffer.from(str, "utf8")
        }
        return Buffer.from(str, encoding)
    } catch (e) {
        yakitNotify("error", `String ${str} Encode Failed: ${e}`)
        return Buffer.from(`${str}`, encoding)
    }
}

export function removeRepeatedElement<T = string>(arr: T[]) {
    return arr.filter((element, index) => {
        return arr.indexOf(element) === index
    })
}
