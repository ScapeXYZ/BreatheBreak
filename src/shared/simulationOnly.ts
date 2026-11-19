export const simulationOnlyForRuntime=(isPackaged:boolean,buildFlag:boolean):boolean=>!isPackaged&&buildFlag
export const shouldBindSmartSpectra=(simulationOnly:boolean):boolean=>!simulationOnly
