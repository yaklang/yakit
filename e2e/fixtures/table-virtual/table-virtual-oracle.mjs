import { createHash } from 'node:crypto'

const IDENTITY_FIELDS = ['ordinal', 'ID', 'HiddenIndex', 'immutableLabel']
const ORACLE_SOURCES = ['sentinel', 'fixed', 'action']

const encodeIdentityValue = (value) => `${typeof value}:${String(value)}`

export const createTableIdentityDigest = (record) => {
  const identity = IDENTITY_FIELDS.map((field) => `${field}=${encodeIdentityValue(record?.[field])}`).join('\u001f')
  return createHash('sha256').update(identity).digest('hex')
}

const sanitizeTuple = (tuple) => {
  if (!tuple || !Number.isInteger(tuple.ordinal) || typeof tuple.digest !== 'string' || tuple.digest.length === 0) {
    return undefined
  }
  return Object.freeze({ ordinal: tuple.ordinal, digest: tuple.digest })
}

export const compareTableIdentityTuples = ({ expected, sentinel, fixed, action }) => {
  const safeExpected = sanitizeTuple(expected)
  const sources = { sentinel: sanitizeTuple(sentinel), fixed: sanitizeTuple(fixed), action: sanitizeTuple(action) }
  const mismatches = []

  for (const source of ORACLE_SOURCES) {
    const actual = sources[source]
    if (!actual) {
      mismatches.push({ source, kind: 'missing' })
    } else if (!safeExpected || actual.ordinal !== safeExpected.ordinal || actual.digest !== safeExpected.digest) {
      mismatches.push({ source, kind: 'identity-mismatch', ordinal: actual.ordinal, digest: actual.digest })
    }
  }

  return Object.freeze({
    pass: Boolean(safeExpected) && mismatches.length === 0,
    expected: safeExpected,
    sources: Object.freeze(sources),
    mismatches: Object.freeze(mismatches),
  })
}
