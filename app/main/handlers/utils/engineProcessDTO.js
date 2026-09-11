const { validPort } = require('./engineEndpoint')

// Return a whitelist, never the raw process object or nested origin/cmd.
function observedEngine(process) {
  const command = typeof process.cmd === 'string' ? process.cmd : ''
  const mode = /(?:^|\s)--transport(?:=|\s+)(npipe|unix|tcp)(?:\s|$)/.exec(command)?.[1]
  const portText = /(?:^|\s)--port(?:=|\s+)(\d+)(?:\s|$)/.exec(command)?.[1]
  const port = (!mode || mode === 'tcp') && validPort(portText) ? Number(portText) : undefined
  const transport = mode || (port ? 'tcp' : 'unknown')
  return {
    id: `observed-${process.pid}`,
    pid: Number.isSafeInteger(process.pid) ? process.pid : undefined,
    ppid: Number.isSafeInteger(process.ppid) ? process.ppid : undefined,
    port,
    transport,
    displayEndpoint: port ? `127.0.0.1:${port}` : '',
    state: 'observed',
    current: false,
    ownership: 'external',
    actions: { stop: false, connect: false },
    actionReason: 'external_read_only',
  }
}

module.exports = { observedEngine }
