document.querySelector('#load-oldicon')?.addEventListener('click', async () => {
  const { retainedOldIconName } = await import('./lazyOldIcon')
  document.body.dataset.retainedOldIcon = retainedOldIconName
})
