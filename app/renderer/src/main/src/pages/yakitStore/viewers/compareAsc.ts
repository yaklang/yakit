export const compareAsc = (value1: object, value2: object, text: string, isNumber?: boolean) => {
  try {
    if (isNumber || isNumber === undefined) {
      if (Number(value1[text]) < Number(value2[text])) {
        return -1
      } else if (Number(value1[text]) > Number(value2[text])) {
        return 1
      } else {
        return 0
      }
    } else {
      // 按照ASCII码排序
      const b = value2[text] + ''
      const a = value1[text] + ''
      return a.localeCompare(b, undefined, { sensitivity: 'base' })
    }
  } catch (error) {
    return 0
  }
}

// 降序
export const compareDesc = (value1: object, value2: object, text: string, isNumber?: boolean) => {
  try {
    if (isNumber || isNumber === undefined) {
      if (Number(value1[text]) > Number(value2[text])) {
        return -1
      } else if (Number(value1[text]) < Number(value2[text])) {
        return 1
      } else {
        return 0
      }
    } else {
      // 按照ASCII码排序
      const b = value2[text] + ''
      const a = value1[text] + ''
      return b.localeCompare(a, undefined, { sensitivity: 'base' })
    }
  } catch (error) {
    return 0
  }
}