export const isEqual = (obj1: object, obj2: object) => {
    // 判断两个变量是否为对象类型
    let isObj = toString.call(obj1) === "[object Object]" && toString.call(obj2) === "[object Object]"
    if (!isObj) {
        return false
    }

    // 判断两个对象的长度是否相等，不相等则直接返回 fase
    if (Object.keys(obj1).length !== Object.keys(obj2).length) {
        return false
    }

    // 判断两个对象的每个属性值是否相等
    for (const key in obj1) {
        // 判断两个对象的键是否相等
        if (obj2.hasOwnProperty.call(obj2, key)) {
            let obj1Type = toString.call(obj1[key])
            let obj2Type = toString.call(obj2[key])
            // 如果值是对象，则递归
            if (obj1Type === "[object Object]" || obj2Type === "[object Object]") {
                if (!isEqual(obj1[key], obj2[key])) {
                    return false
                }
            } else if (obj1[key] !== obj2[key]) {
                return false // 如果不是对象，则判断值是否相等
            }
        } else {
            return false
        }
    }
    return true // 上面条件都通过，则返回 true
}
