// @vitest-environment jsdom
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { GuidedPacer, trapTabAtBoundary } from './GuidedPacer'
import type { PacerClock } from './pacer'

globalThis.IS_REACT_ACT_ENVIRONMENT=true
let root:Root|undefined
let host:HTMLDivElement|undefined

class FakeClock implements PacerClock{time=0;callbacks=new Set<()=>void>();now=()=>this.time;setInterval=(callback:()=>void):unknown=>{this.callbacks.add(callback);return callback};clearInterval=(id:unknown):void=>{this.callbacks.delete(id as ()=>void)};advance(ms:number):void{for(let elapsed=0;elapsed<ms;elapsed+=100){this.time+=100;for(const callback of [...this.callbacks])callback()}}}
function Harness({open,onClose,onComplete=()=>{},onStart,onEnd,clock}:{open:boolean;onClose():void;onComplete?():void;onStart?():void;onEnd?():void;clock?:PacerClock}):JSX.Element{return <main className="app"><div className="app-stage"><button>Open guided pacer</button></div><GuidedPacer open={open} onClose={onClose} onComplete={onComplete} onStart={onStart} onEnd={onEnd} clock={clock}/></main>}
function draw(open:boolean,onClose:()=>void,onComplete=()=>{},clock?:PacerClock,onStart?:()=>void,onEnd?:()=>void):void{if(!host){host=document.createElement('div');document.body.append(host);root=createRoot(host)}act(()=>root!.render(<Harness open={open} onClose={onClose} onComplete={onComplete} onStart={onStart} onEnd={onEnd} clock={clock}/>))}
function button(label:string):HTMLButtonElement{const node=document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);if(!node)throw Error('Missing '+label);return node}
function press(target:HTMLElement,key:string,shiftKey=false):void{act(()=>{target.dispatchEvent(new KeyboardEvent('keydown',{key,bubbles:true,cancelable:true,shiftKey}))})}

afterEach(()=>{if(root)act(()=>root!.unmount());host?.remove();root=undefined;host=undefined})

describe('guided pacer keyboard accessibility',()=>{
 it('moves focus inside, makes the background inert, and restores the opener',()=>{const onClose=vi.fn();draw(false,onClose);const opener=document.querySelector<HTMLButtonElement>('.app-stage button')!;opener.focus();draw(true,onClose);expect(document.activeElement).toBe(button('Close guided pacer'));expect(document.querySelector<HTMLElement>('.app-stage')?.inert).toBe(true);draw(false,onClose);expect(document.activeElement).toBe(opener);expect(document.querySelector<HTMLElement>('.app-stage')?.inert).not.toBe(true)})
 it('traps Tab and Shift+Tab at the dialog boundaries',()=>{draw(true,()=>{});const shell=document.querySelector<HTMLElement>('.pacer-shell')!,controls=[...shell.querySelectorAll<HTMLElement>('button:not(:disabled),select:not(:disabled),input:not(:disabled),textarea:not(:disabled),[href],[tabindex]:not([tabindex="-1"])')],first=controls[0],last=controls.at(-1)!;last.focus();expect(trapTabAtBoundary(shell,false)).toBe(true);expect(document.activeElement).toBe(first);expect(trapTabAtBoundary(shell,true)).toBe(true);expect(document.activeElement).toBe(last)})
 it('closes with Escape while a control is focused',()=>{const onClose=vi.fn();draw(true,onClose);const select=document.querySelector<HTMLSelectElement>('.pacer-settings select')!;select.focus();press(select,'Escape');expect(onClose).toHaveBeenCalledOnce()})
 it('disposes an interrupted exercise without recording completion or focusing a removed opener',()=>{const clock=new FakeClock(),onComplete=vi.fn();draw(false,()=>{},onComplete,clock);const opener=document.querySelector<HTMLButtonElement>('.app-stage button')!;opener.focus();draw(true,()=>{},onComplete,clock);act(()=>{[...document.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent==='Start guided pacing')!.click()});expect(clock.callbacks.size).toBe(1);opener.remove();draw(false,()=>{},onComplete,clock);expect(clock.callbacks.size).toBe(0);act(()=>clock.advance(70000));expect(onComplete).not.toHaveBeenCalled();expect(document.activeElement).not.toBe(opener)})
 it('emits one start and one end callback for the actual exercise lifecycle',()=>{const clock=new FakeClock(),onStart=vi.fn(),onEnd=vi.fn();draw(true,()=>{},()=>{},clock,onStart,onEnd);act(()=>{[...document.querySelectorAll<HTMLButtonElement>('button')].find(node=>node.textContent==='Start guided pacing')!.click()});expect(onStart).toHaveBeenCalledOnce();act(()=>clock.advance(48000));expect(onEnd).toHaveBeenCalledOnce();draw(false,()=>{},()=>{},clock,onStart,onEnd);expect(onEnd).toHaveBeenCalledOnce()})
})
