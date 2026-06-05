import { createRoot } from 'react-dom/client'
import './index.scss'
import App from './App'
import { ConfigProvider } from 'antd'
import { NotificationProvider } from './utils/notification'

createRoot(document.getElementById('root')!).render(
  <ConfigProvider wave={{ disabled: true }}>
    <NotificationProvider>
      <App />
    </NotificationProvider>
  </ConfigProvider>,
)
