import { describe, expect, it, vi } from 'vitest'

type PlannedReceipt = Readonly<{
  source: 'smartspectra' | 'simulation'
  before?: number
  after?: number
  change?: number
  beforeCount: number
  afterCount: number
  receiptSufficient: boolean
  pacerInterrupted: boolean
}>

type PlannedExportModule = Readonly<{
  toExportableReceipt(recap: PlannedReceipt): unknown
  exportReceiptPng(receipt: unknown): Promise<void>
}>

async function plannedExporter(): Promise<PlannedExportModule> {
  // @ts-expect-error Task 3 production exporter intentionally does not exist yet.
  return import('./exportReceipt') as Promise<PlannedExportModule>
}

const validReal: PlannedReceipt = {
  source: 'smartspectra', before: 12, after: 9, change: -3,
  beforeCount: 2, afterCount: 2, receiptSufficient: true, pacerInterrupted: false
}

describe.skip('Task 3 local-only PNG export contract (pending implementation)', () => {
  it('allows a valid real receipt to be exported', async () => {
    const exporter = await plannedExporter()
    expect(exporter.toExportableReceipt(validReal)).toBeDefined()
  })

  it.each([
    ['insufficient', { ...validReal, after: undefined, change: undefined, afterCount: 1, receiptSufficient: false }],
    ['interrupted', { ...validReal, pacerInterrupted: true }]
  ])('rejects an %s receipt', async (_case, recap) => {
    const exporter = await plannedExporter()
    expect(exporter.toExportableReceipt(recap)).toBeUndefined()
  })

  it.each(['before', 'after', 'change'] as const)('rejects non-finite %s values', async (field) => {
    const exporter = await plannedExporter()
    expect(exporter.toExportableReceipt({ ...validReal, [field]: Number.NaN })).toBeUndefined()
  })

  it('limits the export model to approved aggregate information', async () => {
    const exporter = await plannedExporter()
    const model = exporter.toExportableReceipt(validReal) as Record<string, unknown>
    expect(Object.keys(model).sort()).toEqual([
      'after', 'afterCount', 'before', 'beforeCount', 'change', 'disclosure', 'source'
    ])
    expect(JSON.stringify(model)).not.toMatch(/readings|camera|api.?key|run.?id|session.?id|frame/i)
  })

  it('revokes its temporary object URL after download', async () => {
    const exporter = await plannedExporter()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:task3-receipt')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    await exporter.exportReceiptPng(exporter.toExportableReceipt(validReal))
    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:task3-receipt')
  })

  it('rejects safely when PNG generation fails', async () => {
    const exporter = await plannedExporter()
    vi.spyOn(URL, 'createObjectURL').mockImplementation(() => { throw new Error('object URL unavailable') })
    await expect(exporter.exportReceiptPng(exporter.toExportableReceipt(validReal))).rejects.toThrow('object URL unavailable')
  })

  it.skip('defines whether a valid simulation receipt can export', () => {
    // Pending Claude decision: disable simulation export or require an unmistakable synthetic watermark.
  })
})
