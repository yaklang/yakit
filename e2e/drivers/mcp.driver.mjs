const MCP_PROTOCOL_VERSION = '2025-11-25'
const MCP_SESSION_HEADER = 'mcp-session-id'
const MCP_PROTOCOL_HEADER = 'mcp-protocol-version'
const MCP_REQUEST_TIMEOUT_MS = 30_000

const readResponseBody = async (response) => {
  const text = await response.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`MCP returned invalid JSON (${response.status}): ${text}`, { cause: error })
  }
}

const extractTextContent = (result) => {
  const text = result?.content?.find((item) => item?.type === 'text')?.text
  if (typeof text !== 'string') return result
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export class StreamableMCPClient {
  constructor(endpoint) {
    this.endpoint = endpoint
    this.requestId = 0
    this.sessionId = ''
    this.protocolVersion = MCP_PROTOCOL_VERSION
  }

  /**
   * 发起带统一超时的 fetch 请求。
   * 使用 AbortController 避免测试套件因 MCP 无响应而永久挂起。
   */
  async #request(url, init) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), MCP_REQUEST_TIMEOUT_MS)
    try {
      return await fetch(url, { ...init, signal: controller.signal })
    } catch (error) {
      if (error?.name === 'AbortError') {
        throw new Error(`MCP request timed out after ${MCP_REQUEST_TIMEOUT_MS}ms: ${init.method || 'POST'} ${url}`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  async request(method, params) {
    const headers = {
      accept: 'application/json, text/event-stream',
      'content-type': 'application/json',
    }
    if (this.sessionId) {
      headers[MCP_SESSION_HEADER] = this.sessionId
      headers[MCP_PROTOCOL_HEADER] = this.protocolVersion
    }

    const response = await this.#request(this.endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: ++this.requestId,
        method,
        params,
      }),
    })
    const body = await readResponseBody(response)
    if (!response.ok) {
      throw new Error(`MCP ${method} failed with HTTP ${response.status}: ${JSON.stringify(body)}`)
    }
    if (body?.error) {
      throw new Error(`MCP ${method} failed: ${JSON.stringify(body.error)}`)
    }

    const sessionId = response.headers.get(MCP_SESSION_HEADER)
    const protocolVersion = response.headers.get(MCP_PROTOCOL_HEADER)
    if (sessionId) this.sessionId = sessionId
    if (protocolVersion) this.protocolVersion = protocolVersion
    return body?.result
  }

  async notify(method, params) {
    const response = await this.#request(this.endpoint, {
      method: 'POST',
      headers: {
        accept: 'application/json, text/event-stream',
        'content-type': 'application/json',
        [MCP_SESSION_HEADER]: this.sessionId,
        [MCP_PROTOCOL_HEADER]: this.protocolVersion,
      },
      body: JSON.stringify({ jsonrpc: '2.0', method, ...(params ? { params } : {}) }),
    })
    if (!response.ok) {
      throw new Error(`MCP ${method} notification failed with HTTP ${response.status}: ${await response.text()}`)
    }
  }

  async initialize() {
    const result = await this.request('initialize', {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: {
        name: 'yakit-web-fuzzer-e2e-agent',
        version: '1.0.0',
      },
    })
    await this.notify('notifications/initialized')
    return result
  }

  async listTools() {
    return this.request('tools/list', {})
  }

  async callTool(name, args) {
    const result = await this.request('tools/call', { name, arguments: args })
    if (result?.isError) {
      throw new Error(`MCP tool ${name} returned an error: ${JSON.stringify(result.content)}`)
    }
    return { raw: result, value: extractTextContent(result) }
  }

  async close() {
    if (!this.sessionId) return
    const response = await this.#request(this.endpoint, {
      method: 'DELETE',
      headers: {
        [MCP_SESSION_HEADER]: this.sessionId,
        [MCP_PROTOCOL_HEADER]: this.protocolVersion,
      },
    })
    if (!response.ok && response.status !== 404) {
      throw new Error(`Closing MCP session failed with HTTP ${response.status}: ${await response.text()}`)
    }
    this.sessionId = ''
  }
}

export const startMCPServerThroughYakit = async ({ toolSets = ['http_fuzzer'] } = {}) => {
  const token = `web-fuzzer-mcp-e2e-${Date.now()}-${Math.random().toString(16).slice(2)}`
  const result = await browser.execute(
    (streamToken, tools) =>
      new Promise((resolve) => {
        let settled = false
        const finish = (value) => {
          if (settled) return
          settled = true
          clearTimeout(timeout)
          offData()
          offError()
          offEnd()
          resolve(value)
        }
        const timeout = setTimeout(() => finish({ error: 'Timed out waiting for the MCP server to start' }), 30_000)
        const offData = window.yakitBridge.stream.onData(streamToken, (data) => {
          if (data?.Status === 'running') {
            finish({ endpoint: data.StreamableHttpUrl || String(data.ServerUrl || '').replace(/\/sse$/, '/mcp') })
          } else if (data?.Status === 'error') {
            finish({ error: data.Message || 'MCP server failed to start' })
          }
        })
        const offError = window.yakitBridge.stream.onError(streamToken, (error) => finish({ error: String(error) }))
        const offEnd = window.yakitBridge.stream.onEnd(streamToken, () =>
          finish({ error: 'MCP server stream ended before reporting a running endpoint' }),
        )

        window.yakitBridge.mcp
          .startServer({ Host: '127.0.0.1', Port: 0, Tool: tools, EnableAll: false }, streamToken)
          .catch((error) => finish({ error: String(error) }))
      }),
    token,
    toolSets,
  )

  if (result?.error) throw new Error(result.error)
  if (!result?.endpoint)
    throw new Error(`MCP server did not return a Streamable HTTP endpoint: ${JSON.stringify(result)}`)
  return { endpoint: result.endpoint, token }
}

export const stopMCPServerThroughYakit = async (token) => {
  if (!token) return
  await browser.execute(async (streamToken) => {
    await window.yakitBridge.stream.cancel('StartMcpServer', streamToken)
  }, token)
}
