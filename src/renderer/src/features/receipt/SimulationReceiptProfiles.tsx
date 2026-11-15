import { useState } from 'react'
import { useSession, type Recap } from '../../store/session'
import type { ReceiptKind } from './receipt'

const trace=Object.freeze(Array.from({length:48},(_,index)=>Math.sin(index/4)*.35+Math.cos(index/9)*.08))
export function simulationProfileRecap(kind:ReceiptKind):Recap {
 const base={durationSeconds:83,source:'simulation' as const,guidedPaceCompleted:true,acceptedRateSampleCount:4,uniqueRateSampleCount:7,guideInhaleSeconds:4,guideExhaleSeconds:6,chestTrace:trace}
 if(kind==='full')return Object.freeze({...base,receiptKind:kind,receiptSufficient:true,sampleCount:5,before:12.4,after:9.8,change:-2.6,baselineAcceptedCount:2,guidedAcceptedCount:3})
 if(kind==='partial')return Object.freeze({...base,receiptKind:kind,receiptSufficient:false,sampleCount:3,median:10.8,minimum:9.9,maximum:12.1,baselineAcceptedCount:1,guidedAcceptedCount:2})
 if(kind==='interrupted')return Object.freeze({...base,receiptKind:kind,receiptSufficient:false,pacerInterrupted:true,sampleCount:4,baselineAcceptedCount:2,guidedAcceptedCount:2})
 return Object.freeze({...base,receiptKind:kind,receiptSufficient:false,sampleCount:1,acceptedRateSampleCount:1,baselineAcceptedCount:1,guidedAcceptedCount:0})
}

export function SimulationReceiptProfiles():JSX.Element {
 const[profile,setProfile]=useState<ReceiptKind>('full')
 const phase=useSession(state=>state.phase)
 const preview=():void=>useSession.setState({phase:'recap',source:'simulation',recap:simulationProfileRecap(profile),gatedRates:[],sample:undefined,startedAt:undefined})
 if(phase!=='welcome'&&phase!=='ready')return <></>
 return <div className="simulation-profiles"><label className="field-label">Synthetic receipt profile<select className="field" value={profile} onChange={event=>setProfile(event.target.value as ReceiptKind)}><option value="full">Full</option><option value="partial">Partial</option><option value="insufficient">Insufficient</option><option value="interrupted">Interrupted</option></select></label><button className="button button--secondary" onClick={preview}>Preview synthetic receipt</button></div>
}
