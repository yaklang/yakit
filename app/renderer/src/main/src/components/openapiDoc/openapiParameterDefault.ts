import { OpenAPIOperationParameter } from './openapiDocType'

/** 与后端 openapi.ValueViaField 保持一致的参数默认值推断 */
export function getParameterDefaultValue(param: OpenAPIOperationParameter): string {
  if (param.example !== undefined && param.example !== null && param.example !== '') {
    return String(param.example)
  }

  const type = (param.type || 'string').toLowerCase()
  const name = param.name.toLowerCase()

  if (type === 'integer' || type === 'int' || type === 'number') {
    return '1'
  }
  if (type === 'boolean' || type === 'bool') {
    return 'false'
  }

  if (name.includes('uuid') || name.endsWith('uid') || name === 'sid') {
    return '00000000-0000-0000-0000-000000000001'
  }
  if (name.includes('id')) {
    return '1'
  }
  if (name.includes('name')) {
    return 'mock_name'
  }
  if (name.includes('email') || name.includes('mail')) {
    return 'admin@example.com'
  }
  if (name.includes('phone') || name.includes('mobile')) {
    return '13800000001'
  }
  if (name.includes('password')) {
    return 'admin123'
  }
  if (name.includes('url') || name.includes('link')) {
    return 'https://www.example.com'
  }
  if (name.includes('ip')) {
    return '127.0.0.1'
  }

  return `mock_${param.name}`
}

export function buildEffectiveParameterValues(
  parameters: OpenAPIOperationParameter[] | undefined,
  values: Record<string, string>,
): Record<string, string> {
  const result: Record<string, string> = {}
  parameters?.forEach((param) => {
    const userValue = values[param.name]
    if (userValue !== undefined && userValue !== '') {
      result[param.name] = userValue
    } else {
      result[param.name] = getParameterDefaultValue(param)
    }
  })
  return result
}

export function initParameterValues(parameters: OpenAPIOperationParameter[] | undefined): Record<string, string> {
  const result: Record<string, string> = {}
  parameters?.forEach((param) => {
    result[param.name] = getParameterDefaultValue(param)
  })
  return result
}
