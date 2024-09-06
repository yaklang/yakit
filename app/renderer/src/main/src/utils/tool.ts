import omitBy from "lodash/omitBy"
import isNil from "lodash/isNil"

/** @name 将传入对象中值为null或undefined的键值对删除 */
export const toolDelInvalidKV = (data: any) => {
    try {
        if (!data) return data
        if (!isObject(data)) return data
        for (const key in data) {
            if (isNil(data[key])) {
                delete data[key]
            } else if (isObject(data[key])) {
                toolDelInvalidKV(data[key])
            }
        }
        return data
    } catch (error) {
        return data
    }
}

/**判断值是否为对象 */
export const isObject = (value) => {
    return Object.prototype.toString.call(value) === "[object Object]"
}
/**判断值是否为数组 */
export const isArray = (value) => {
    return Object.prototype.toString.call(value) === "[object Array]"
}

/**是否为空对象 */
export const isEmptyObject = (obj: object) => {
    return !(obj && Object.keys(obj).length > 0)
}

/**是否为有效数字 */
export const isNumberNaN = (n: number) => {
    return Number.isNaN(Number(n))
}
