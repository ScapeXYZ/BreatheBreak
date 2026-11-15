import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/instrument-sans/400.css'
import '@fontsource/instrument-sans/500.css'
import '@fontsource/figtree/400.css'
import '@fontsource/figtree/500.css'
import { App } from './App'
import { SimulationReceiptProfiles } from './features/receipt/SimulationReceiptProfiles'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App />{window.breathebreak.simulationOnly&&<SimulationReceiptProfiles/>}</React.StrictMode>)
