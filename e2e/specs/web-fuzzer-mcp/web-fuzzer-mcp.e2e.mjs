import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  confirmStartupWorkspace,
  connectRemoteEngineThroughUI,
  enterDefaultProjectThroughUI,
  waitForMainWindow,
  waitForShellWindows,
} from '../../drivers/application.driver.mjs'
import {
  startMCPServerThroughYakit,
  stopMCPServerThroughYakit,
  StreamableMCPClient,
} from '../../drivers/mcp.driver.mjs'
import { waitForWebFuzzerTabState } from '../../drivers/web-fuzzer.driver.mjs'

const specDir = path.dirname(fileURLToPath(import.meta.url))
const scenarioPath = path.resolve(specDir, '../../fixtures/mcp/web-fuzzer-agent-calls.json')

const variablePattern = /^\$ref:([A-Za-z][A-Za-z0-9_]*)$/

const resolveScenarioValue = (value, variables) => {
  if (typeof value === 'string') {
    const match = value.match(variablePattern)
    if (!match) return value
    if (!(match[1] in variables)) throw new Error(`Scenario variable ${match[1]} has not been captured`)
    return variables[match[1]]
  }
  if (Array.isArray(value)) return value.map((item) => resolveScenarioValue(item, variables))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, resolveScenarioValue(item, variables)]))
  }
  return value
}

const valueAtPath = (value, pathExpression, label) => {
  const result = String(pathExpression)
    .split('.')
    .filter(Boolean)
    .reduce((current, segment) => current?.[segment], value)
  if (result === undefined) {
    throw new Error(`${label}: MCP result has no ${pathExpression}: ${JSON.stringify(value)}`)
  }
  return result
}

const loadEngineCredentials = () => {
  if (process.env.YAKIT_E2E_ENGINE_FIXTURE !== 'external') {
    throw new Error('The Web Fuzzer MCP suite must be started with --with-yak-engine')
  }
  const port = Number(process.env.YAKIT_E2E_ENGINE_PORT)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error(`Invalid YAKIT_E2E_ENGINE_PORT: ${process.env.YAKIT_E2E_ENGINE_PORT}`)
  }
  return {
    Host: process.env.YAKIT_E2E_ENGINE_HOST,
    Port: port,
    Mode: 'remote',
    IsTLS: false,
    Password: '',
  }
}

const expectObjectSubset = (actual, expected, label) => {
  for (const [key, expectedValue] of Object.entries(expected || {})) {
    if (actual?.[key] === undefined) {
      throw new Error(`${label}: MCP result has no ${key}: ${JSON.stringify(actual)}`)
    }
    expect(actual[key]).toEqual(expectedValue)
  }
}

const expectResultPaths = (actual, expectedPaths, variables, label) => {
  for (const [pathExpression, unresolvedExpected] of Object.entries(expectedPaths || {})) {
    expect(valueAtPath(actual, pathExpression, label)).toEqual(resolveScenarioValue(unresolvedExpected, variables))
  }
}

describe('AI manages Web Fuzzer tabs through the real MCP server', () => {
  it('applies mocked agent tool calls to the live Electron UI', async () => {
    const scenario = JSON.parse(await readFile(scenarioPath, 'utf8'))
    expect(scenario.schemaVersion).toBe(2)

    await waitForShellWindows()
    await confirmStartupWorkspace()
    await connectRemoteEngineThroughUI(loadEngineCredentials())
    await waitForMainWindow()
    await enterDefaultProjectThroughUI()

    let server
    let client
    const variables = {}
    const startServerAndClient = async () => {
      server = await startMCPServerThroughYakit({ toolSets: ['http_fuzzer'] })
      client = new StreamableMCPClient(server.endpoint)
      const initialized = await client.initialize()
      expect(initialized?.serverInfo?.name).toBe('Yaklang MCP Server')

      const toolList = await client.listTools()
      const availableTools = new Set((toolList?.tools || []).map((tool) => tool.name))
      for (const requiredTool of scenario.requiredTools) {
        if (!availableTools.has(requiredTool)) throw new Error(`MCP did not expose ${requiredTool}`)
      }
    }
    const stopServerAndClient = async () => {
      await client?.close()
      await stopMCPServerThroughYakit(server?.token)
      client = undefined
      server = undefined
    }
    try {
      await startServerAndClient()

      for (const call of scenario.calls) {
        if (call.restartMcpBefore) {
          await stopServerAndClient()
          await startServerAndClient()
        }

        const argumentsValue = resolveScenarioValue(call.arguments, variables)
        let result
        let callError
        try {
          result = await client.callTool(call.tool, argumentsValue)
        } catch (error) {
          callError = error
        }

        if (call.expectError) {
          if (!callError) throw new Error(`${call.id}: expected MCP call to fail`)
          expect(String(callError)).toContain(resolveScenarioValue(call.expectError, variables))
        } else {
          if (callError) throw callError
          const expectedResult = resolveScenarioValue(call.expectResult, variables)
          expectObjectSubset(result.value, expectedResult, call.id)
          expectResultPaths(result.value, call.expectResultPaths, variables, call.id)
          for (const [variableName, pathExpression] of Object.entries(call.capture || {})) {
            variables[variableName] = valueAtPath(result.value, pathExpression, call.id)
          }
        }

        if (call.expectUI) {
          await waitForWebFuzzerTabState(resolveScenarioValue(call.expectUI, variables), call.id)
        }
      }
    } finally {
      await stopServerAndClient()
    }
  })
})
