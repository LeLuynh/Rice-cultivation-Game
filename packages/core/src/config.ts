export type Stage = 'dry' | 'plowed' | 'seedling' | 'seedlingReady' | 'young' | 'green' | 'flowering' | 'ripe' | 'bundled'
export type Task = 'plow' | 'sow' | 'transplant' | 'water' | 'drain' | 'fertilize' | 'weed' | 'pestControl' | 'harvest' | 'thresh'
export type ToolId = 'hoe' | 'seedBasket' | 'waterScoop' | 'fertilizerBag' | 'sickle' | 'hands'
export type ToolLevel = 1 | 2 | 3

export const CONFIG = {
  startingXu: 50,
  plotCount: 20,
  landlordPlotIds: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as number[],
  forSalePlotIds: [13, 14, 15, 16, 17, 18, 19, 20] as number[],
  landPrice: 2000,
  seedPrice: 30,
  fertilizerPrice: 40,
  ricePricePerKg: 8,
  yieldKg: { min: 40, max: 100 },
  toolUpgradeCost: { 2: 300, 3: 1000 },
  toolSpeedMultiplier: { 1: 1, 2: 0.7, 3: 0.4 },
  npcUnlockPlotCount: 5,
  landlordJobTimeoutSec: 60,
  playerNpcDelaySec: 20,
  stageDurationSec: { seedling: 180, young: 300, green: 300, flowering: 240 },
  water: {
    start: 100,
    drainPer10s: 5,
    threshold: 30,
    drainingStages: ['seedling', 'seedlingReady', 'young', 'green'] as Stage[],
  },
  penalty: {
    dryPer10s: 2,
    weedPer10s: 1,
    pestPer10s: 2,
    noFertilizer: 15,
    noDrain: 10,
    overripeAfterSec: 180,
    overripeKgPer10s: 2,
  },
  pests: {
    checkIntervalSec: 60,
    weedChance: 0.3,
    pestChance: 0.25,
    weedStages: ['young', 'green'] as Stage[],
    pestStages: ['green', 'flowering'] as Stage[],
  },
  wages: { plow: 15, sow: 10, transplant: 20, water: 5, drain: 5, fertilize: 10, weed: 10, pestControl: 10, harvest: 20, thresh: 15 } as Record<Task, number>,
  tasks: {
    plow: { tool: 'hoe', baseSec: 6 },
    sow: { tool: 'seedBasket', baseSec: 4 },
    transplant: { tool: 'seedBasket', baseSec: 6 },
    water: { tool: 'waterScoop', baseSec: 2 },
    drain: { tool: 'waterScoop', baseSec: 2 },
    fertilize: { tool: 'fertilizerBag', baseSec: 3 },
    weed: { tool: 'sickle', baseSec: 3 },
    pestControl: { tool: 'hands', baseSec: 3 },
    harvest: { tool: 'sickle', baseSec: 6 },
    thresh: { tool: 'hands', baseSec: 5 },
  } as Record<Task, { tool: ToolId; baseSec: number }>,
  autosaveIntervalSec: 10,
  day: { lengthSec: 360, startHour: 6, endHour: 22 },
} as const
