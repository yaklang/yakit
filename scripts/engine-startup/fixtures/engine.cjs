// A bounded subprocess fixture for the old/new CLI contract. No user home or database access.
const { grpc, Yak } = require(process.env.YAKIT_TEST_GRPC_HELPER)
const { spawn } = require('node:child_process')
const { writeFileSync } = require('node:fs')
const args = process.argv.slice(2)
const port = Number(args[args.indexOf('--port') + 1])
const password = args[args.indexOf('--local-password') + 1]
const mode = process.env.YAKIT_TEST_CONTRACT || 'v2'
const scenario = process.env.YAKIT_TEST_SCENARIO || 'success'
const marker = '50551aa97b5aa5ae8a3c3243ac60a8a7'
const check = args[0] === 'check-secret-local-grpc'
const budget = setTimeout(() => process.exit(90), 12000)

function writeCheck(data) {
  process.stdout.write(`<json-${marker}>\n${JSON.stringify(data)}\n</json-${marker}>\n`, () => {
    clearTimeout(budget)
  })
}

if (scenario === 'hang') {
  process.stdout.write('fixture waiting\n')
} else if (scenario === 'tree') {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 12000)'], {
    stdio: 'ignore',
    windowsHide: true,
  })
  writeFileSync(process.env.YAKIT_TEST_DESCENDANT, String(child.pid))
  process.stdout.write('fixture tree ready\n')
} else if (scenario === 'crash') {
  process.exitCode = 7
  clearTimeout(budget)
} else if (check) {
  const server = require('node:net').createServer()
  server.once('error', () => {
    writeCheck(
      mode === 'legacy'
        ? { ok: false, port, reason: ['unrelated', 'net.Listen error'], info: 'listen: address already in use' }
        : { ok: false, port, phase: 'listen', reasonCode: 'tcp_bind_in_use', reason: ['[tcp_bind_in_use] occupied'] },
    )
  })
  server.listen(port, '127.0.0.1', () => {
    server.close(() =>
      writeCheck({ ok: true, port, secret: mode === 'legacy' ? 'old-secret' : '***', version: 'test' }),
    )
  })
} else {
  if (args[0] !== 'grpc' || !password || args.includes('--transport')) process.exit(8)
  const server = new grpc.Server()
  server.addService(Yak.service, {
    Echo(call, done) {
      if (scenario === 'slow-rpc') return
      if (scenario === 'wrong-auth' || call.metadata.get('authorization')[0] !== `bearer ${password}`) {
        return done({ code: grpc.status.UNAUTHENTICATED, details: 'Invalid credentials' })
      }
      done(null, { result: call.request.text })
    },
  })
  server.bindAsync(`127.0.0.1:${port}`, grpc.ServerCredentials.createInsecure(), (error) => {
    if (error) {
      process.stdout.write('yak grpc failed {"phase":"listen","reasonCode":"tcp_bind_in_use"}\n')
      process.exitCode = 1
      clearTimeout(budget)
      return
    }
    server.start()
    if (mode !== 'legacy' && scenario !== 'quiet') {
      const event = JSON.stringify({
        schemaVersion: mode === 'v1' ? 1 : 2,
        address: `127.0.0.1:${port}`,
        transport: scenario === 'wrong-transport' ? 'unix' : 'tcp',
      })
      // Deliberately split protocol output across writes, including CRLF.
      process.stdout.write('yak grpc rea')
      process.stdout.write(`dy ${event}\r\n`)
    }
    process.stdout.write(`{"secret":"${password}"}\n`)
  })
}
