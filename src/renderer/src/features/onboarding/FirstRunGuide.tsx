import { useEffect, useRef, useState } from 'react'

export const GUIDE_SEEN_STORAGE_KEY='breathebreak.guideSeen.v1'
export const guideWasSeen=():boolean=>typeof localStorage!=='undefined'&&localStorage.getItem(GUIDE_SEEN_STORAGE_KEY)==='true'
export const markGuideSeen=():void=>{if(typeof localStorage!=='undefined')localStorage.setItem(GUIDE_SEEN_STORAGE_KEY,'true')}

const steps=[
  {title:'Privacy and consent',body:'This app does not save video. Your camera stays off until you select it, give consent, and press Start session.'},
  {title:'Frame for a clear signal',body:'Face the camera, keep your upper chest in view, hold still, and use soft, even light.'},
  {title:'Breathe, then guide',body:'Breathe naturally for the baseline. When it unlocks, start the 45-second guided pacer. Your receipt uses accepted readings only.'}
] as const

export function FirstRunGuide({open,onClose}:{open:boolean;onClose:()=>void}):JSX.Element|null {
  const[step,setStep]=useState(0);const headingRef=useRef<HTMLHeadingElement>(null)
  useEffect(()=>{if(open){setStep(0);window.setTimeout(()=>headingRef.current?.focus(),0)}},[open])
  useEffect(()=>{if(open)headingRef.current?.focus()},[open,step])
  if(!open)return null
  const close=():void=>{markGuideSeen();onClose()}
  const next=():void=>setStep((value)=>Math.min(steps.length-1,value+1))
  return <div className="guide-overlay" role="dialog" aria-modal="true" aria-labelledby="guide-title"><section className="guide-card glass-panel">
    <div className="guide-progress" aria-label={`Step ${step+1} of 3`}><span>How it works</span><strong>Step {step+1} of 3</strong></div>
    <ol className="guide-step-list">{steps.map((item,index)=><li key={item.title} data-guide-step hidden={index!==step}><div className="guide-number" aria-hidden="true">{index+1}</div><h2 id={index===step?'guide-title':undefined} ref={index===step?headingRef:undefined} tabIndex={index===step?-1:undefined}>{item.title}</h2><p>{item.body}</p></li>)}</ol>
    <div className="guide-actions"><button className="button button--quiet" onClick={close}>Skip guide</button><div>{step>0&&<button className="button button--secondary" onClick={()=>setStep((value)=>value-1)}>Back</button>}{step<2?<button className="button button--primary" onClick={next} onKeyDown={(event)=>{if(event.key==='Enter')next()}}>Next</button>:<button className="button button--primary" onClick={close}>Continue to consent</button>}</div></div>
  </section></div>
}
