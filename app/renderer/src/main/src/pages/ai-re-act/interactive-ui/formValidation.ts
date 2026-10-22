import validator from '@rjsf/validator-ajv8'
import type { UINode } from './validate'

// A schema-shaped prop can still describe an unusable form. Check it before
// handing it to RJSF, preserving other nodes when this form cannot render.
export function normalizeForm(node: UINode, diagnose: (path: string, message: string) => void): boolean {
  if (node.component !== 'ParameterForm') return true
  const schema = node.props.schema
  const invalid = () => {
    diagnose('props.schema', '表单 Schema 无效或约束无法满足，组件已丢弃')
    return false
  }
  try {
    if (validator.rawValidation(schema, {}).validationError) return invalid()
  } catch {
    return invalid()
  }
  if ((schema.required || []).some((key: string) => !Object.hasOwn(schema.properties, key))) return invalid()
  for (const field of Object.values(schema.properties) as Record<string, any>[]) {
    if (field.type === 'array' && !field.items) return invalid()
    for (const [min, max] of [
      ['minimum', 'maximum'],
      ['minLength', 'maxLength'],
      ['minItems', 'maxItems'],
    ]) {
      if (field[min] !== undefined && field[max] !== undefined && field[min] > field[max]) return invalid()
    }
  }
  return true
}
