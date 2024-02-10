import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@ionic/react/css/core.css'
import 'ag-grid-community/styles/ag-grid.css' // Core CSS
import 'ag-grid-community/styles/ag-theme-quartz.css' // Theme
import '@availity/block-ui/src/BlockUi.css'
import { IonApp, setupIonicReact } from '@ionic/react'
import React from 'react'
import { registerSW } from 'virtual:pwa-register'

registerSW({
  onOfflineReady() {},
})

setupIonicReact()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonApp>
      <App />
    </IonApp>
  </React.StrictMode>,
)
