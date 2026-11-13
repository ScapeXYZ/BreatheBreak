// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuidedPacer, trapTabAtBoundary } from './GuidedPacer'

globalThis.IS_REACT_ACT_ENVIRONMENT=true
let root:Root|undefined
let host:HTMLDivElement|undefined

function Harness({open,onClose}:{open:boolean;onClose():void}):JSX.Element{return <main className="app"><div className="app-stage"><button>Open guided pacer</button></div><GuidedPacer open={open} onClose={onClose} onComplete={()=>{}}/></main>}
function draw(open:boolean,onClose:()=>void):void{if(!host){host=document.createElement('div');document.body.append(host);root=createRoot(host)}act(()=>root!.render(<Harness open={open} onClose={onClose}/>))}
function button(label:string):HTMLButtonElement{const node=document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);if(!node)throw Error('Missing '+label);return node}
function press(target:HTMLElement,key:string,shiftKey=false):void{act(()=>{target.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,shiftKey}))})}

afterEach(()=>{if(root)act(()=>root!.unmount());host?.remove();root=undefined;host=undefined})

describe('guided pacer keyboard accessibility',()=>{
 it('moves focus inside, makes the background inert, and restores the opener',()=>{const onClose=vi.fn();draw(false,onClose);const opener=document.querySelector<HTMLButtonElement>('.app-stage button')!;opener.focus();draw(true,onClose);expect(document.activeElement).toBe(button('Close guided pacer'));expect(document.querySelector<HTMLElement>('.app-stage')?.inert).toBe(true);draw(false,onClose);expect(document.activeElement).toBe(opener);expect(document.querySelector<HTMLElement>('.app-stage')?.inert).not.toBe(true)})
 it('traps Tab and Shift+Tab at the dialog boundaries',()=>{draw(true,()=>{});const shell=document.querySelector<HTMLElement>('.pacer-shell')!,controls=[...shell.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled),[href],[tabindex]:not([tabindex="-1"])')],first=controls[0],last=controls.at(-1)!;last.focus();expect(trapTabAtBoundary(shell,false)).toBe(true);expect(document.activeElement).toBe(first);expect(trapTabAtBoundary(shell,true)).toBe(true);expect(document.activeElement).toBe(last)})
 it('closes with Escape while a control is focused',()=>{const onClose=vi.fn();draw(true,onClose);const select=document.querySelector<HTMLSelectElement>('.pacer-settings select')!;select.focus();press(select,'Escape');expect(onClose).toHaveBeenCalledOnce()})
})
