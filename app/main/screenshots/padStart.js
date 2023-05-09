/**
 * 如果string字符串长度小于 length 则在左侧填充字符
 * 如果超出length长度则截断超出的部分。
 * @param {unknown} string
 * @param {number} length
 * @param {string} chars
 * @returns {string}
 */
module.exports = function padStart(string, length = 0, chars = " ") {
    let str = String(string)
    while (str.length < length) {
        str = `${chars}${str}`
    }
    return str
}
