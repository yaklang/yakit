import validator from '@rjsf/validator-ajv8'
import type { RJSFSchema } from '@rjsf/utils'
import { normalize, matchesSchema } from './validate'
import contract from './questionForm.schema.json'
import type { QuestionForm } from './types'

export function readQuestionForm(value: QuestionForm): QuestionForm | undefined {
  let invalid = false
  const form = normalize(contract as RJSFSchema, value, 'form', () => {
    invalid = true
  }) as QuestionForm | undefined
  if (!form || invalid) return undefined
  const schema = form.schema
  try {
    if (validator.rawValidation(schema, {}).validationError) return undefined
  } catch {
    return undefined
  }
  const properties = schema.properties || {}
  if ([...(schema.required || []), ...(form.fieldOrder || [])].some((key) => !Object.hasOwn(properties, key)))
    return undefined
  for (const field of Object.values(properties) as RJSFSchema[]) {
    if (field.type === 'array' && !field.items) return undefined
    for (const [min, max] of [
      ['minimum', 'maximum'],
      ['minLength', 'maxLength'],
      ['minItems', 'maxItems'],
    ]) {
      if (field[min] !== undefined && field[max] !== undefined && field[min] > field[max]) return undefined
    }
    if (field.default !== undefined && !matchesSchema(field, field.default)) return undefined
  }
  for (const [key, value] of Object.entries(form.initial || {})) {
    if (!properties[key] || !matchesSchema(properties[key] as RJSFSchema, value)) return undefined
  }
  return form
}
