/**
 * @name 检测引入模块是否存在，若不存在则提示安装依赖并退出进程
 * @param {String} packageName 模块名
 * @param {Function} selector 从模块中选择需要的部分
 */
const importWithHint = async (packageName, selector) => {
    try {
        const mod = await import(packageName)
        return selector(mod)
    } catch (error) {
        const msg = String(error?.message || "")
        const isMissingDependency = error?.code === "ERR_MODULE_NOT_FOUND" && msg.includes(`'${packageName}'`)

        if (isMissingDependency) {
            console.log(`\n缺少依赖: ${packageName}`)
            console.log("请先在项目根目录执行: yarn install\n")
            process.exit(1)
        }
        throw error
    }
}

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

export {importWithHint, genCLIDisplayList}
