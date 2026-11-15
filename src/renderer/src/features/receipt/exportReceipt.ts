import { RECEIPT_DISCLOSURE } from './receipt'
import type { Recap } from '../../store/session'

export type ExportableReceipt = Readonly<Record<string, unknown> & {
  source: 'smartspectra' | 'simulation'
  disclosure: string
}>

type ReceiptExportInput = Pick<Recap, 'source'|'receiptKind'|'receiptSufficient'|'pacerInterrupted'|'before'|'after'|'change'|'median'|'minimum'|'maximum'|'sampleCount'|'baselineAcceptedCount'|'guidedAcceptedCount'> & {beforeCount?:number;afterCount?:number}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

export function toExportableReceipt(recap: ReceiptExportInput): ExportableReceipt | undefined {
  if (recap.pacerInterrupted) return undefined
  const source=recap.source
  const disclosure=source==='simulation'?'SIMULATION, NOT REAL':RECEIPT_DISCLOSURE
  const beforeCount=recap.baselineAcceptedCount??recap.beforeCount??0
  const afterCount=recap.guidedAcceptedCount??recap.afterCount??0
  const kind=recap.receiptKind??(recap.receiptSufficient?'full':undefined)
  if (kind==='full'&&finite(recap.before)&&finite(recap.after)&&finite(recap.change)&&beforeCount>=2&&afterCount>=2) return Object.freeze({source,before:recap.before,after:recap.after,change:recap.change,beforeCount,afterCount,disclosure})
  if (kind==='partial'&&finite(recap.median)&&finite(recap.minimum)&&finite(recap.maximum)&&recap.sampleCount>=2) return Object.freeze({source,median:recap.median,minimum:recap.minimum,maximum:recap.maximum,count:recap.sampleCount,disclosure})
  return undefined
}

const pad=(value:number):string=>String(value).padStart(2,'0')
export function receiptFilename(source:'smartspectra'|'simulation',at=new Date()):string {
  const stamp=`${at.getFullYear()}-${pad(at.getMonth()+1)}-${pad(at.getDate())}-${pad(at.getHours())}${pad(at.getMinutes())}`
  return `reset-receipt-${source==='simulation'?'SIMULATION-':''}${stamp}.png`
}

function drawReceipt(context:CanvasRenderingContext2D,receipt:ExportableReceipt):void {
  const simulation=receipt.source==='simulation'
  context.fillStyle='#08111d';context.fillRect(0,0,1200,675)
  context.fillStyle='#122232';context.beginPath();context.roundRect(64,64,1072,547,28);context.fill()
  context.fillStyle='#75e2d5';context.font='500 24px "Instrument Sans", sans-serif';context.fillText('RESET RECEIPT',104,120)
  context.fillStyle='#eef8f7';context.font='500 58px "Instrument Sans", sans-serif';context.fillText('Your Reset Receipt',104,195)
  if(simulation){context.fillStyle='#f5d77b';context.font='700 28px Figtree, sans-serif';context.fillText('SIMULATION, NOT REAL',104,247)}
  context.fillStyle='#b7c9cf';context.font='22px Figtree, sans-serif'
  if('before'in receipt){
    context.fillText('BEFORE',104,315);context.fillText('AFTER',466,315);context.fillText('CHANGE',828,315)
    context.fillStyle='#eef8f7';context.font='500 52px "Instrument Sans", sans-serif'
    context.fillText(`${Number(receipt.before).toFixed(1)}`,104,380);context.fillText(`${Number(receipt.after).toFixed(1)}`,466,380);context.fillText(`${Number(receipt.change)>=0?'+':''}${Number(receipt.change).toFixed(1)}`,828,380)
    context.fillStyle='#b7c9cf';context.font='20px Figtree, sans-serif';context.fillText(`breaths/min · n=${receipt.beforeCount}`,104,418);context.fillText(`breaths/min · n=${receipt.afterCount}`,466,418);context.fillText('breaths/min',828,418)
  }else{
    context.fillText('SESSION MEDIAN',104,315);context.fillText('OBSERVED RANGE',466,315);context.fillText('ACCEPTED',828,315)
    context.fillStyle='#eef8f7';context.font='500 52px "Instrument Sans", sans-serif';context.fillText(`${Number(receipt.median).toFixed(1)}`,104,380);context.fillText(`${Number(receipt.minimum).toFixed(1)}–${Number(receipt.maximum).toFixed(1)}`,466,380);context.fillText(`${receipt.count}`,828,380)
    context.fillStyle='#b7c9cf';context.font='20px Figtree, sans-serif';context.fillText('breaths/min',104,418);context.fillText('breaths/min',466,418);context.fillText('stable readings',828,418)
  }
  context.strokeStyle='#315266';context.beginPath();context.moveTo(104,474);context.lineTo(1096,474);context.stroke()
  context.fillStyle=simulation?'#f5d77b':'#b7c9cf';context.font='21px Figtree, sans-serif';context.fillText(String(receipt.disclosure),104,530)
  context.fillStyle='#78949d';context.font='18px Figtree, sans-serif';context.fillText('Camera off. Nothing stored.',104,570)
}

export async function receiptPngBlob(receipt:ExportableReceipt):Promise<Blob> {
  const canvas=document.createElement('canvas');canvas.width=1200;canvas.height=675
  const context=canvas.getContext('2d');if(!context)throw new Error('PNG export is unavailable.')
  drawReceipt(context,receipt)
  return new Promise((resolve,reject)=>canvas.toBlob((blob)=>blob?resolve(blob):reject(new Error('PNG export failed.')),'image/png'))
}

export async function exportReceiptPng(value:unknown):Promise<void> {
  if(!value||typeof value!=='object')throw new Error('Receipt is not exportable.')
  const receipt=value as ExportableReceipt
  const blob=await receiptPngBlob(receipt)
  const url=URL.createObjectURL(blob)
  try{const link=document.createElement('a');link.href=url;link.download=receiptFilename(receipt.source);link.click()}finally{URL.revokeObjectURL(url)}
}
