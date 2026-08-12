module.exports = {
  plugins: {
    // CRA/react-scripts 内置了 autoprefixer；Vite 不会自动启用，需显式配置
    // 否则如 mask-image 等在 Electron(Chromium) 里只认 -webkit-* 的属性会失效
    autoprefixer: {},
  },
}
