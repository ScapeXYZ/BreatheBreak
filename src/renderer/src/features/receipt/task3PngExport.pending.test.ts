// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { exportReceiptPng, receiptFilename, toExportableReceipt } from './exportReceipt'

const validReal = {
  source: 'smartspectra' as const, receiptKind: 'full' as const,
  before: 12, after: 9, change: -3, baselineAcceptedCount: 2, guidedAcceptedCount: 2,
  sampleCount: 4, receiptSufficient: true, pacerInterrupted: false
}

const context = { fillStyle: '', strokeStyle: '', font: '', fillRect: vi.fn(), beginPath: vi.fn(), roundRect: vi.fn(), fill: vi.fn(), fillText: vi.fn(), moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn() }

beforeEach(() => {
  vi.restoreAllMocks()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context as unknown as CanvasRenderingContext2D)
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(new Blob(['png'], { type: 'image/png' })))
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:task3-receipt') })
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: vi.fn() })
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
})

describe('Task 3 local-only PNG export contract', () => {
  it('allows full real and partial receipts to be exported', () => {
    expect(toExportableReceipt(validReal)).toBeDefined()
    expect(toExportableReceipt({ ...validReal, receiptKind: 'partial', receiptSufficient: false, before: undefined, after: undefined, change: undefined, median: 11, minimum: 9, maximum: 13, sampleCount: 3 })).toBeDefined()
  })

  it.each([
    ['insufficient', { ...validReal, receiptKind: 'insufficient' as const, after: undefined, change: undefined, guidedAcceptedCount: 1, receiptSufficient: false }],
    ['interrupted', { ...validReal, pacerInterrupted: true }]
  ])('rejects an %s receipt', (_case, recap) => expect(toExportableReceipt(recap)).toBeUndefined())

  it.each(['before', 'after', 'change'] as const)('rejects non-finite %s values', (field) => {
    expect(toExportableReceipt({ ...validReal, [field]: Number.NaN })).toBeUndefined()
  })

  it('limits the export model to approved aggregate information', () => {
    const model = toExportableReceipt(validReal) as Record<string, unknown>
    expect(Object.keys(model).sort()).toEqual(['after', 'afterCount', 'before', 'beforeCount', 'change', 'disclosure', 'source'])
    expect(JSON.stringify(model)).not.toMatch(/readings|camera|api.?key|run.?id|session.?id|frame/i)
  })

  it('uses approved real and simulation filenames and disclosure', () => {
    const at = new Date(2026, 10, 15, 9, 7)
    expect(receiptFilename('smartspectra', at)).toBe('reset-receipt-2026-11-15-0907.png')
    expect(receiptFilename('simulation', at)).toBe('reset-receipt-SIMULATION-2026-11-15-0907.png')
    expect(toExportableReceipt({ ...validReal, source: 'simulation' })?.disclosure).toBe('SIMULATION, NOT REAL')
  })

  it('revokes its temporary object URL after download', async () => {
    await exportReceiptPng(toExportableReceipt(validReal))
    expect(URL.createObjectURL).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:task3-receipt')
  })

  it('rejects safely when PNG generation fails', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) => callback(null))
    await expect(exportReceiptPng(toExportableReceipt(validReal))).rejects.toThrow('PNG export failed.')
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
