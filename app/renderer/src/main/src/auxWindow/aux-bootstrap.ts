// 静态加载模式复用 aux HTML，但不启动 React、Monaco 和辅助窗口的数据协议。
if (new URLSearchParams(window.location.search).get('mode') === 'child-loading') {
  document.body.dataset.mode = 'child-loading'
  document.querySelector('#initial-loading span')!.textContent = '正在准备加载资源，请稍候...'
  const { ipcRenderer } = window.require('electron')
  ipcRenderer.send('ready-to-load-child')
} else {
  void import('./aux-entry')
}

export {}
