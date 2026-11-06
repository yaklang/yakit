export interface PartialJSON {
  value: unknown
  complete: boolean
  completed: Set<string>
}

/** A bounded JSON-prefix reader. No eval, repairs of invalid syntax, or code execution.
 * Unfinished values stay partial; completed node objects can render immediately.
 */
export function parseJSONPrefix(source: string): PartialJSON {
  if (source.length > 262144) throw new Error('组件数据超过 256 KiB')
  let i = 0
  const completed = new Set<string>()
  const whitespace = () => {
    while (/\s/.test(source[i] || '') && i < source.length) i++
  }
  const parse = (path: string, depth: number): { value: unknown; done: boolean } => {
    if (depth > 32) throw new Error('组件嵌套过深')
    whitespace()
    const start = i
    const mark = (value: unknown, done: boolean) => {
      if (done) completed.add(path)
      return { value, done }
    }
    if (i >= source.length) return mark(undefined, false)
    const ch = source[i++]
    if (ch === '"') {
      while (i < source.length) {
        const c = source[i++]
        if (c === '"') return mark(JSON.parse(source.slice(start, i)), true)
        if (c === '\\') {
          if (i === source.length) return mark(JSON.parse(`${source.slice(start, i - 1)}"`), false)
          if (source[i++] === 'u') {
            const digits = source.slice(i, i + 4)
            if (!/^[0-9a-fA-F]*$/.test(digits)) throw new Error('无效的 Unicode 转义')
            if (digits.length < 4) return mark(JSON.parse(`${source.slice(start, i - 2)}"`), false)
            i += 4
          }
        }
      }
      return mark(JSON.parse(`${source.slice(start)}"`), false)
    }
    if (ch === '{' || ch === '[') {
      const isObject = ch === '{'
      const result: any = isObject ? Object.create(null) : []
      const close = isObject ? '}' : ']'
      whitespace()
      if (source[i] === close) {
        i++
        return mark(result, true)
      }
      let index = 0
      while (i < source.length) {
        let key = String(index++)
        if (isObject) {
          if (source[i] !== '"') throw new Error('对象键必须是字符串')
          const parsedKey = parse(`${path}#key`, depth + 1)
          if (!parsedKey.done) return mark(result, false)
          key = parsedKey.value as string
          if (Object.hasOwn(result, key)) throw new Error('组件 JSON 包含重复键')
          whitespace()
          if (i === source.length) return mark(result, false)
          if (source[i++] !== ':') throw new Error('对象键后缺少冒号')
        }
        const child = parse(path ? `${path}.${key}` : key, depth + 1)
        if (child.value !== undefined) result[key] = child.value
        if (!child.done) return mark(result, false)
        whitespace()
        if (i === source.length) return mark(result, false)
        if (source[i] === close) {
          i++
          return mark(result, true)
        }
        if (source[i++] !== ',') throw new Error('缺少逗号')
        whitespace()
        if (i === source.length) return mark(result, false)
        if (source[i] === close) throw new Error('不允许尾随逗号')
      }
      return mark(result, false)
    }
    i = start
    while (i < source.length && !/[\s,\]}]/.test(source[i])) i++
    const token = source.slice(start, i)
    if (
      i === source.length &&
      (['true', 'false', 'null'].some((word) => word.startsWith(token)) ||
        /^-?(?:\d+(?:\.\d*)?)?(?:[eE][+-]?\d*)?$/.test(token))
    ) {
      try {
        return mark(JSON.parse(token), false)
      } catch {
        return mark(undefined, false)
      }
    }
    try {
      return mark(JSON.parse(token), true)
    } catch {
      throw new Error('无效的 JSON 值')
    }
  }
  const root = parse('', 0)
  whitespace()
  if (i !== source.length) throw new Error('JSON 后存在多余内容')
  return { value: root.value, complete: root.done, completed }
}
