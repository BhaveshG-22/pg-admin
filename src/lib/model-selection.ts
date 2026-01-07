import { prisma } from './prisma'
import * as fs from 'fs'
import * as path from 'path'

export interface SelectedModel {
  id: string
  name: string
  imageUrl: string
  gender: 'MALE' | 'FEMALE'
}

interface ModelFromJson {
  id: string
  gender: 'male' | 'female'
  s3Url: string
}

interface ModelsJson {
  male: ModelFromJson[]
  female: ModelFromJson[]
}

// Load models from models.json
let modelsCache: ModelsJson | null = null
function loadModels(): ModelsJson {
  if (!modelsCache) {
    const modelsPath = path.join(process.cwd(), 'models.json')
    modelsCache = JSON.parse(fs.readFileSync(modelsPath, 'utf-8'))
  }
  return modelsCache!
}

/**
 * Selects models for preset example generation
 * - Selects equal number of male and female models
 * - Excludes models that have already been used for this preset
 * - Randomly selects from available models
 */
export async function selectModelsForPreset(
  presetId: string,
  totalModels: number
): Promise<SelectedModel[]> {
  // Load models from models.json
  const allModels = loadModels()

  // Get models already used for this preset
  const usedModels = await prisma.presetModelUsage.findMany({
    where: { presetId },
    select: { modelId: true },
  })

  const usedModelIds = new Set(usedModels.map((um) => um.modelId))

  // Calculate how many of each gender to select
  const modelsPerGender = Math.floor(totalModels / 2)

  // Filter available models (not already used)
  const availableMaleModels = allModels.male
    .filter((m) => !usedModelIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.id,
      imageUrl: m.s3Url,
      gender: 'MALE' as const,
    }))

  const availableFemaleModels = allModels.female
    .filter((m) => !usedModelIds.has(m.id))
    .map((m) => ({
      id: m.id,
      name: m.id,
      imageUrl: m.s3Url,
      gender: 'FEMALE' as const,
    }))

  // Check if we have enough models
  if (
    availableMaleModels.length < modelsPerGender ||
    availableFemaleModels.length < modelsPerGender
  ) {
    throw new Error(
      `Not enough available models. Need ${modelsPerGender} of each gender. ` +
        `Available: ${availableMaleModels.length} male, ${availableFemaleModels.length} female`
    )
  }

  // Randomly select models
  const selectedMaleModels = shuffleArray(availableMaleModels).slice(
    0,
    modelsPerGender
  )
  const selectedFemaleModels = shuffleArray(availableFemaleModels).slice(
    0,
    modelsPerGender
  )

  return [...selectedMaleModels, ...selectedFemaleModels]
}

/**
 * Records that specific models were used for a preset
 */
export async function recordModelUsage(
  presetId: string,
  modelIds: string[]
): Promise<void> {
  await prisma.presetModelUsage.createMany({
    data: modelIds.map((modelId) => ({
      presetId,
      modelId,
    })),
    skipDuplicates: true,
  })
}

/**
 * Fisher-Yates shuffle algorithm
 */
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}
