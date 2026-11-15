import { describe, expect, it } from 'vitest'
import { shouldBindSmartSpectra, simulationOnlyForRuntime } from './simulationOnly'

describe('simulation-only runtime policy',()=>{
 it('is source-only and cannot activate in packaged builds',()=>{expect(simulationOnlyForRuntime(false,true)).toBe(true);expect(simulationOnlyForRuntime(true,true)).toBe(false);expect(simulationOnlyForRuntime(false,false)).toBe(false)})
 it('skips SmartSpectra IPC only in simulation-only mode',()=>{expect(shouldBindSmartSpectra(true)).toBe(false);expect(shouldBindSmartSpectra(false)).toBe(true)})
})
