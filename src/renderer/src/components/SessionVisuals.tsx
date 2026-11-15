import type { TracePoint } from '../features/sessions/recorder'
import { GardenCanvas } from './GardenCanvas'

export function WelcomeInstrument():JSX.Element {
  const circumference=2*Math.PI*176
  return <div className="welcome-instrument">
    <div className="instrument-glow" aria-hidden="true"/>
    <div className="instrument-ring" role="img" aria-label="Preview breathing ring, one minute">
      <svg viewBox="0 0 380 380" aria-hidden="true"><defs><linearGradient id="heroRingGradient" x1="0" y1="1" x2="1" y2="0"><stop stopColor="#3e8799"/><stop offset=".56" stopColor="#79e7df"/><stop offset="1" stopColor="#d4fffb"/></linearGradient><filter id="ringLeadGlow"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs><circle className="instrument-track" cx="190" cy="190" r="176"/><circle className="instrument-progress" cx="190" cy="190" r="176" strokeDasharray={circumference} strokeDashoffset={circumference*.18}/><circle className="instrument-lead" cx="338" cy="95" r="5"/></svg>
      <div className="instrument-flower"><GardenCanvas readChest={()=>undefined} active preview quality="low"/></div>
      <div className="instrument-readout"><span>Natural breathing</span><strong>1:00</strong><small>Preview</small></div>
    </div>
    <div className="welcome-waveform" aria-label="No signal yet"><div className="waveform-heading"><span>Breathing signal</span><strong>No signal yet</strong></div><svg viewBox="0 0 660 54" preserveAspectRatio="none" aria-hidden="true"><path d="M0 27 C90 27 120 27 170 27 S260 27 330 27 S470 27 540 27 S620 27 660 27"/></svg></div>
  </div>
}

export function SessionRing({elapsedSeconds,totalSeconds=180,guided}:{elapsedSeconds:number;totalSeconds?:number;guided:boolean}):JSX.Element {
  const progress=Math.min(1,Math.max(0,elapsedSeconds/totalSeconds));const circumference=2*Math.PI*46
  return <div className="session-ring" role="img" aria-label={`${guided?'Guided':'Session'} progress, ${Math.round(progress*100)} percent`}>
    <div className="ring-glow" aria-hidden="true"/><svg viewBox="0 0 108 108" aria-hidden="true"><circle className="ring-track" cx="54" cy="54" r="46"/><circle className="ring-progress" cx="54" cy="54" r="46" strokeDasharray={circumference} strokeDashoffset={circumference*(1-progress)}/></svg>
    <div className="ring-label"><span>{guided?'GUIDED':'SESSION'}</span><strong>{Math.floor(elapsedSeconds/60)}:{String(elapsedSeconds%60).padStart(2,'0')}</strong></div>
  </div>
}

export function LiveWaveform({points,live}:{points:readonly TracePoint[];live:boolean}):JSX.Element {
  const values=points.slice(-80).map(point=>point.value);const minimum=values.length?Math.min(...values):0;const maximum=values.length?Math.max(...values):1;const span=Math.max(maximum-minimum,.0001)
  const polyline=values.length>1?values.map((value,index)=>`${(index/(values.length-1))*100},${18-((value-minimum)/span)*14}`).join(' '):'0,18 100,18'
  return <div className="live-waveform"><div className="waveform-label"><span>Chest trace</span>{live&&values.length>1&&<strong>LIVE</strong>}</div><svg viewBox="0 0 100 22" preserveAspectRatio="none" role="img" aria-label={live&&values.length>1?'Live measured chest trace':'Chest trace waiting for live data'}><path d="M0 18H100"/><polyline points={polyline}/></svg></div>
}
