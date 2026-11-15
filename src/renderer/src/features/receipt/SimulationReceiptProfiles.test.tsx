// @vitest-environment jsdom
import { describe,expect,it } from 'vitest'
import { simulationProfileRecap } from './SimulationReceiptProfiles'
import { toExportableReceipt } from './exportReceipt'

describe('simulation-only receipt profiles',()=>{
 it.each(['full','partial','insufficient','interrupted'] as const)('provides a clearly synthetic %s profile',(kind)=>{const recap=simulationProfileRecap(kind);expect(recap).toMatchObject({source:'simulation',receiptKind:kind});expect(Object.isFrozen(recap)).toBe(true)})
 it('exports only eligible profiles with the simulation watermark',()=>{expect(toExportableReceipt(simulationProfileRecap('full'))?.disclosure).toBe('SIMULATION, NOT REAL');expect(toExportableReceipt(simulationProfileRecap('partial'))?.disclosure).toBe('SIMULATION, NOT REAL');expect(toExportableReceipt(simulationProfileRecap('insufficient'))).toBeUndefined();expect(toExportableReceipt(simulationProfileRecap('interrupted'))).toBeUndefined()})
})
