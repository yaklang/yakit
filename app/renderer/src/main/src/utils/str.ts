export function Uint8ArrayToString(fileData: Uint8Array) {
    return Buffer.from(fileData).toString("latin1")
}


export function StringToUint8Array(str: string) {
    let arr = new Uint8Array(str.length);
    for (let i = 0, j = str.length; i < j; ++i) {
        arr[i] = (str.charCodeAt(i));
    }
    return arr
}