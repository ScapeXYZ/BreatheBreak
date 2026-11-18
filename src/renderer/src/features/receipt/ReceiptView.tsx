import { useMemo, useState } from 'react'
import type { Recap } from '../../store/session'
import { exportReceiptPng, toExportableReceipt } from './exportReceipt'
import { formatDuration, RECEIPT_DISCLOSURE, RECEIPT_INSUFFICIENT_COPY, type ReceiptKind } from './receipt'

const rate=(value:number|undefined):string=>value?.toFixed(1)??'—'
const signed=(value:number|undefined):string=>value===undefined?'—':`${value>=0?'+':''}${value.toFixed(1)}`

export function receiptMeaning(before:number|undefined,after:number|undefined,change:number|undefined):string {
  if(before===undefined||after===undefined||change===undefined)return 'There were not enough valid measurements in both phases to calculate a Before/After comparison.'
  const direction=change<0?'decreased':change>0?'increased':'did not change'
  const amount=Math.abs(change).toFixed(1)
  return `Before ${before.toFixed(1)} and After ${after.toFixed(1)} means the measured breathing rate ${direction}${change===0?'':` by ${amount} breaths per minute`}. This is a measurement comparison, not proof of stress reduction, medical improvement, or treatment effectiveness. A lower breathing rate is not always better.`
}

function TraceStrip({values}:{values:readonly number[]}):JSX.Element {
  if(values.length<2)return <div className="trace-empty">No stable chest trace was available.</div>
  const minimum=Math.min(...values),maximum=Math.max(...values),span=Math.max(maximum-minimum,.0001)
  const points=values.map((value,index)=>`${(index/(values.length-1))*100},${24-((value-minimum)/span)*20}`).join(' ')
  return <svg className="receipt-trace" viewBox="0 0 100 28" preserveAspectRatio="none" role="img" aria-label="Decimated measured chest trace"><path d="M0 25H100"/><polyline points={points}/></svg>
}

export function ReceiptView({recap,onDone}:{recap:Recap;onDone:()=>void}):JSX.Element {
  const [exportStatus,setExportStatus]=useState('')
  const kind:ReceiptKind=recap.pacerInterrupted?'interrupted':recap.receiptKind??(recap.receiptSufficient?'full':recap.sampleCount>=2?'partial':'insufficient')
  const exportable=useMemo(()=>toExportableReceipt(recap),[recap])
  const exportPng=async():Promise<void>=>{if(!exportable)return;setExportStatus('');try{await exportReceiptPng(exportable);setExportStatus('PNG saved locally.')}catch{setExportStatus('PNG export was unavailable. Nothing was saved.')}}
  const real=recap.source==='smartspectra'
  const status=kind==='full'?'Complete':kind==='partial'?'Partial':'Unavailable'
  const sampleQuality=kind==='full'?'Enough valid measurements were collected in both phases.':kind==='partial'?'Some valid measurements were collected, but not enough in both phases for a comparison.':'Not enough valid measurements were collected for a comparison.'
  return <section className={`receipt receipt--${kind}`} aria-labelledby="recap-title">
    <header className="receipt-header"><div><p className="receipt-eyebrow">Session complete</p><h2 id="recap-title" tabIndex={-1}>Your Reset Receipt</h2></div><div className="receipt-duration"><span>Session duration</span><strong>{formatDuration(recap.durationSeconds)}</strong></div></header>
    {recap.source==='simulation'&&<div className="receipt-simulation">SIMULATION, NOT REAL</div>}
    {kind==='full'&&<div className="receipt-full" data-receipt-state="full">
      <div className="comparison-card"><span>Before</span><strong>{rate(recap.before)}</strong><small>breaths/min · n={recap.baselineAcceptedCount??0}</small></div>
      <div className="comparison-arrow" aria-hidden="true">→</div>
      <div className="comparison-card"><span>After</span><strong>{rate(recap.after)}</strong><small>breaths/min · n={recap.guidedAcceptedCount??0}</small></div>
      <div className="comparison-change"><span>Change</span><strong>{signed(recap.change)}</strong><small>breaths/min</small></div>
    </div>}
    {kind==='partial'&&<div className="receipt-partial" data-receipt-state="partial"><div><span>Session median</span><strong>{rate(recap.median)}</strong><small>breaths/min</small></div><div><span>Observed range</span><strong>{rate(recap.minimum)}–{rate(recap.maximum)}</strong><small>breaths/min</small></div><div><span>Accepted readings</span><strong>{recap.sampleCount}</strong><small>No Before/After comparison</small></div></div>}
    {kind==='insufficient'&&<div className="receipt-notice" data-receipt-state="insufficient"><strong>{RECEIPT_INSUFFICIENT_COPY}</strong><p>For a clearer receipt next time, hold still, keep your upper chest in view, and use even light.</p></div>}
    {kind==='interrupted'&&<div className="receipt-notice receipt-notice--interrupted" data-receipt-state="interrupted"><strong>Guided pacer: Interrupted</strong><p>The timing gap invalidated the comparison. No measured values or PNG can be issued for this session.</p></div>}
    <section className="receipt-explanation" aria-labelledby="receipt-explanation-title"><div className="receipt-result-meta"><div><span>Result status</span><strong>{status}</strong></div><div><span>Sample quality</span><strong>{sampleQuality}</strong></div></div><h3 id="receipt-explanation-title">What this means</h3>{kind==='full'?<><dl className="receipt-definitions"><div><dt>Before</dt><dd>Breathing rate measured before the guided exercise.</dd></div><div><dt>After</dt><dd>Breathing rate measured after the guided exercise.</dd></div><div><dt>Change</dt><dd>The difference between the two measurements, in breaths per minute.</dd></div></dl><p>{receiptMeaning(recap.before,recap.after,recap.change)}</p></>:<p>{receiptMeaning(undefined,undefined,undefined)} Partial and unavailable results never invent a change.</p>}</section>
    <div className="receipt-details"><div><span>Readings that met the SDK threshold</span><strong>{recap.acceptedRateSampleCount??0} of {recap.uniqueRateSampleCount??0}</strong></div><div><span>Guide pace</span><strong>{recap.guideInhaleSeconds&&recap.guideExhaleSeconds?`${recap.guideInhaleSeconds}s in · ${recap.guideExhaleSeconds}s out`:'Not completed'}</strong></div></div>
    <div className="receipt-phase-counts" aria-label="Accepted readings by phase"><span>Before n={recap.baselineAcceptedCount??0}</span><span>After n={recap.guidedAcceptedCount??0}</span></div>
    <div className="trace-card"><div><strong>Measured breathing trace</strong><span>Decimated chest movement during this session</span></div><TraceStrip values={recap.chestTrace??[]}/></div>
    <footer className="receipt-footer"><div><p className={real?'receipt-disclosure':'receipt-disclosure receipt-disclosure--simulation'}>{real?RECEIPT_DISCLOSURE:'SIMULATION, NOT REAL. Synthetic data, not evidence.'}</p><p className="receipt-privacy">Camera off. This app does not save video.</p></div><div className="receipt-actions">{exportable&&<button className="button button--secondary" onClick={()=>void exportPng()}>Export PNG</button>}<button className="button button--primary recap-action" onClick={onDone}>Done</button></div></footer>
    {exportStatus&&<p className="export-status" role="status">{exportStatus}</p>}
  </section>
}
