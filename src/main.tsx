import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/globals.css'
import { getMode, isDev, getBackendUrl, getBackendWsUrl } from './utils/env'

// Log application startup
console.log('🚀 Fancy Trader Starting...');
console.log('📦 Environment:', getMode());
console.log('🔧 Dev Mode:', isDev());
console.log('🌐 Backend URL:', getBackendUrl());
console.log('🔌 WebSocket URL:', getBackendWsUrl());
console.log('📄 CSS Import:', 'globals.css loaded');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

console.log('✅ React app rendered');
