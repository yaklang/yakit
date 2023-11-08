import omitBy from "lodash/omitBy"
import isNil from "lodash/isNil"

/** @name 将传入对象中值为null或undefined的键值对删除 */
export const toolDelInvalidKV = (data: any) => {
    try {
        return omitBy(data, isNil)
    } catch (error) {
        return data
    }
}
