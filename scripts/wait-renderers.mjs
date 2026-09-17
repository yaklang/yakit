// Used by `cli dev`; a listening TCP port is insufficient during Vite's first compilation.
const deadline = Date.now() + 120_000
for (const port of [3000, 5173]) {
  let ready = false
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}`, { signal: AbortSignal.timeout(2000) })
      if (response.status === 200 && /<script|<div\s+id=["']root["']/.test(await response.text())) {
        ready = true
        break
      }
    } catch {
      /* Retry while Vite starts. */
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  if (!ready) throw new Error(`Renderer on port ${port} did not return ready HTML within 120 seconds`)
}
