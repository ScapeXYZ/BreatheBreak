import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from '../../src/renderer/src/App'
import { useSession } from '../../src/renderer/src/store/session'
import '../../src/renderer/src/styles.css'

useSession.setState({ source: 'simulation', consented: false, phase: 'welcome' })
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)
