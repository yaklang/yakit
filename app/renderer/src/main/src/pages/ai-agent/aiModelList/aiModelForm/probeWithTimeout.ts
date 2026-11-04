export async function probeWithTimeout<T>(request: Promise<T>, milliseconds = 15000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      request,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Reasoning probe timeout')), milliseconds)
      }),
    ])
  } finally {
    clearTimeout(timer)
  }
}
