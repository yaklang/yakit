document.querySelector('#load-first')?.addEventListener('click', async () => {
  const { firstOldIconName } = await import('./lazyFirstOldIcon')
  document.body.dataset.firstOldIconName = firstOldIconName
})

document.querySelector('#load-second')?.addEventListener('click', async () => {
  const { secondOldIconName } = await import('./lazySecondOldIcon')
  document.body.dataset.secondOldIconName = secondOldIconName
})
