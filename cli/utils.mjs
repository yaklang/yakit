/**
 * @name 传入对象数组、左展示字段名、右展示字段名，生成一个展示列表字符串(已带换行)
 * @param {Array} arr 需要生成展示列表的对象数组
 * @param {String} leftKey 左侧展示字段名
 * @param {String} rightKey 右侧展示字段名
 */
const genCLIDisplayList = (arr, leftKey, rightKey) => {
    try {
        // 先找到最长项的长度
        const maxLength = arr.reduce((max, item) => {
            return Math.max(max, item[leftKey].length)
        }, 0)

        return arr
            .map((item) => {
                return `  ${item[leftKey].padEnd(maxLength + 4)}${item[rightKey]}`
            })
            .join("\n")
    } catch (error) {
        return ""
    }
}

export {genCLIDisplayList}
