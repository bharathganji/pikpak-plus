import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import '@ionic/react/css/core.css'
import 'ag-grid-community/styles/ag-grid.css' // Core CSS
import 'ag-grid-community/styles/ag-theme-quartz.css' // Theme
import '@availity/block-ui/src/BlockUi.css'
import { IonApp, setupIonicReact } from '@ionic/react'
import React from 'react'

setupIonicReact()
import { registerSW } from 'virtual:pwa-register'
import { IonReactRouter } from '@ionic/react-router'

registerSW({ immediate: true })
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <IonReactRouter>
      <IonApp>
        <App />
      </IonApp>
    </IonReactRouter>
  </React.StrictMode>,
)
