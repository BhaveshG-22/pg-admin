#!/usr/bin/env ts-node
/**
 * Direct model generation script (no queue needed)
 *
 * Usage:
 *   ts-node generate-models-direct.ts --gender male --count 5
 *   ts-node generate-models-direct.ts --gender female --count all
 *   ts-node generate-models-direct.ts --gender both --count 10
 */

import * as dotenv from 'dotenv'
import Replicate from 'replicate'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'

// Load environment variables from .env file
dotenv.config()

interface ModelPrompt {
  id: string
  prompt: string
  negativePrompt: string
}

interface PromptsFile {
  male: ModelPrompt[]
  female: ModelPrompt[]
}

// Initialize Replicate client
const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
})

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2)
  const params: { gender?: string; count?: string } = {}

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--gender' && args[i + 1]) {
      params.gender = args[i + 1]
      i++
    } else if (args[i] === '--count' && args[i + 1]) {
      params.count = args[i + 1]
      i++
    }
  }

  return params
}

/**
 * Download image from URL to local file
 */
async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath)

    https
      .get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download: ${response.statusCode}`))
          return
        }

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          resolve()
        })
      })
      .on('error', (err) => {
        fs.unlinkSync(filepath)
        reject(err)
      })
  })
}

/**
 * Extract image URL from Replicate response
 */
function extractImageUrl(output: any): string {
  if (output && typeof output.url === 'function') {
    return output.url()
  }

  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0]
    if (firstItem && typeof firstItem.url === 'function') {
      return firstItem.url()
    }
    if (typeof firstItem === 'string') {
      return firstItem
    }
  }

  if (typeof output === 'string') {
    return output
  }

  throw new Error(`Unexpected output format from Replicate: ${typeof output}`)
}

/**
 * Generate a single model image
 */
async function generateModelImage(
  promptId: string,
  gender: 'male' | 'female',
  prompt: string,
  negativePrompt: string
): Promise<{ success: boolean; filepath?: string; error?: string }> {
  try {
    console.log(`\n[${ promptId}] Starting generation...`)

    // Run Replicate Nano Banana model
    const output = await replicate.run('google/nano-banana', {
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt,
        output_format: 'png',
        num_inference_steps: 4,
        guidance_scale: 3.5,
      },
    })

    // Extract image URL
    const imageUrl = extractImageUrl(output)
    const imageUrlStr = String(imageUrl)
    console.log(`[${promptId}] Image generated: ${imageUrlStr.slice(0, 80)}...`)

    // Prepare output directory and filepath
    const outputDir = path.join(process.cwd(), 'models', gender)
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    const timestamp = Date.now()
    const filename = `${promptId}_${timestamp}.png`
    const filepath = path.join(outputDir, filename)

    // Download image
    console.log(`[${promptId}] Downloading to ${filepath}...`)
    await downloadImage(imageUrlStr, filepath)

    console.log(`[${promptId}] ✓ Complete!`)

    return { success: true, filepath }
  } catch (error: any) {
    console.error(`[${promptId}] ✗ Failed:`, error.message)
    return { success: false, error: error.message }
  }
}

/**
 * Generate images with concurrency limit
 */
async function generateWithConcurrency(
  tasks: Array<{ promptId: string; gender: 'male' | 'female'; prompt: ModelPrompt }>,
  concurrency: number = 2
): Promise<{ success: number; failed: number }> {
  let successCount = 0
  let failedCount = 0
  const queue = [...tasks]
  const running: Promise<any>[] = []

  while (queue.length > 0 || running.length > 0) {
    // Start new tasks up to concurrency limit
    while (running.length < concurrency && queue.length > 0) {
      const task = queue.shift()!
      const promise = generateModelImage(
        task.prompt.id,
        task.gender,
        task.prompt.prompt,
        task.prompt.negativePrompt
      ).then((result) => {
        if (result.success) {
          successCount++
        } else {
          failedCount++
        }
        // Remove from running array
        const index = running.indexOf(promise)
        if (index > -1) {
          running.splice(index, 1)
        }
      })

      running.push(promise)
    }

    // Wait for at least one task to complete
    if (running.length > 0) {
      await Promise.race(running)
    }
  }

  return { success: successCount, failed: failedCount }
}

async function main() {
  const args = parseArgs()

  if (!args.gender || !args.count) {
    console.error('Usage: ts-node generate-models-direct.ts --gender <male|female|both> --count <number|all>')
    process.exit(1)
  }

  if (!['male', 'female', 'both'].includes(args.gender)) {
    console.error('Gender must be one of: male, female, both')
    process.exit(1)
  }

  if (!process.env.REPLICATE_API_TOKEN) {
    console.error('Error: REPLICATE_API_TOKEN not set in environment')
    process.exit(1)
  }

  // Load prompts
  const promptsPath = path.join(__dirname, 'model-prompts.json')
  const promptsData: PromptsFile = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'))

  // Determine which prompts to use
  let promptsToGenerate: Array<{ gender: 'male' | 'female'; prompt: ModelPrompt }> = []

  if (args.gender === 'both') {
    const count = args.count === 'all' ? Math.min(promptsData.male.length, promptsData.female.length) : parseInt(args.count)

    for (let i = 0; i < count; i++) {
      if (i < promptsData.male.length) {
        promptsToGenerate.push({ gender: 'male', prompt: promptsData.male[i] })
      }
      if (i < promptsData.female.length) {
        promptsToGenerate.push({ gender: 'female', prompt: promptsData.female[i] })
      }
    }
  } else {
    const gender = args.gender as 'male' | 'female'
    const prompts = promptsData[gender]
    const count = args.count === 'all' ? prompts.length : Math.min(parseInt(args.count), prompts.length)

    for (let i = 0; i < count; i++) {
      promptsToGenerate.push({ gender, prompt: prompts[i] })
    }
  }

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Generating ${promptsToGenerate.length} model images`)
  console.log(`Using Replicate Nano Banana`)
  console.log(`Concurrency: 2 images at a time`)
  console.log(`${'='.repeat(60)}`)

  const startTime = Date.now()

  // Generate images with concurrency control
  const results = await generateWithConcurrency(promptsToGenerate, 2)

  const endTime = Date.now()
  const duration = ((endTime - startTime) / 1000 / 60).toFixed(2)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Generation Complete!`)
  console.log(`${'='.repeat(60)}`)
  console.log(`✓ Successful: ${results.success}`)
  console.log(`✗ Failed: ${results.failed}`)
  console.log(`Total time: ${duration} minutes`)
  console.log(`\nImages saved to:`)
  console.log(`  - models/male/`)
  console.log(`  - models/female/`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
