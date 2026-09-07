import { describe, expect, it } from 'vitest'
import {
  E2E_FIXTURE_ARGUMENT_PREFIX,
  E2E_FIXTURE_NAME,
  E2E_FIXTURE_PROTOCOL_VERSION,
  parseE2EFixtureStartupCapability,
  resolveE2EFixtureStartupCapability,
} from '../e2eEnvironment'

const resolveCapability = (overrides = {}) =>
  resolveE2EFixtureStartupCapability({
    e2eEnabled: true,
    isDev: false,
    fixtureEnabled: true,
    ...overrides,
  })

describe('resolveE2EFixtureStartupCapability', () => {
  it('does not issue a capability when the isolated E2E environment is invalid', () => {
    expect(resolveCapability({ e2eEnabled: false })).toBeNull()
  })

  it('does not issue a capability when the fixture flag is missing', () => {
    expect(resolveCapability({ fixtureEnabled: false })).toBeNull()
  })

  it('does not issue a capability for a development renderer', () => {
    expect(resolveCapability({ isDev: true })).toBeNull()
  })

  it('issues a versioned capability only for the supported fixture startup', () => {
    expect(resolveCapability()).toEqual({
      name: E2E_FIXTURE_NAME,
      protocolVersion: E2E_FIXTURE_PROTOCOL_VERSION,
      argument: `${E2E_FIXTURE_ARGUMENT_PREFIX}${E2E_FIXTURE_NAME}:${E2E_FIXTURE_PROTOCOL_VERSION}`,
    })
  })
})

describe('parseE2EFixtureStartupCapability', () => {
  const validArgument = `${E2E_FIXTURE_ARGUMENT_PREFIX}${E2E_FIXTURE_NAME}:${E2E_FIXTURE_PROTOCOL_VERSION}`

  it('parses one supported process capability without exposing argv', () => {
    expect(parseE2EFixtureStartupCapability(['electron', validArgument])).toEqual({
      name: E2E_FIXTURE_NAME,
      protocolVersion: E2E_FIXTURE_PROTOCOL_VERSION,
    })
  })

  it('fails closed when a capability argument is duplicated', () => {
    expect(parseE2EFixtureStartupCapability([validArgument, validArgument])).toBeNull()
  })

  it('fails closed when a capability argument is malformed', () => {
    expect(parseE2EFixtureStartupCapability([`${E2E_FIXTURE_ARGUMENT_PREFIX}malformed`])).toBeNull()
  })

  it('fails closed when the protocol version is unknown', () => {
    expect(
      parseE2EFixtureStartupCapability([
        `${E2E_FIXTURE_ARGUMENT_PREFIX}${E2E_FIXTURE_NAME}:${E2E_FIXTURE_PROTOCOL_VERSION + 1}`,
      ]),
    ).toBeNull()
  })
})
