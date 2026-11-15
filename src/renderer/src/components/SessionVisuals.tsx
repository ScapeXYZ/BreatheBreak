import type { TracePoint } from '../features/sessions/recorder'

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
