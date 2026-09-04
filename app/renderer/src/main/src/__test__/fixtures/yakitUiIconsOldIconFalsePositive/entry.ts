document.querySelector('#load-label')?.addEventListener('click', async () => {
  const { businessLabel } = await import('./lazyBusinessLabel')
  document.body.dataset.businessLabel = businessLabel
})
