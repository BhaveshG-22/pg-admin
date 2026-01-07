import { Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import Replicate from 'replicate'
import * as fs from 'fs'
import * as path from 'path'
import * as https from 'https'
import { ModelGenerationJob } from '../../generate-models'

// Initialize Replicate client (singleton pattern)
let replicateClient: Replicate
function getReplicateClient() {
  if (!replicateClient) {
    replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })
  }
  return replicateClient
}

const connection = new Redis(process.env.GENERATE_QUEUE!, {
  maxRetriesPerRequest: null,
})

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
 * Generate a single model image using Nano Banana on Replicate
 */
async function generateModelImage(
  prompt: string,
  negativePrompt: string
): Promise<string> {
  const replicate = getReplicateClient()

  console.log(`Generating with Nano Banana...`)
  console.log(`Prompt: ${prompt.slice(0, 150)}...`)

  try {
    // Run Nano Banana model
    const output = await replicate.run('google/nano-banana', {
      input: {
        prompt: prompt,
        negative_prompt: negativePrompt,
        output_format: 'png',
        num_inference_steps: 4, // Nano Banana is fast, only needs 4 steps
        guidance_scale: 3.5,
      },
    })

    console.log('Replicate output type:', typeof output)

    // Extract image URL from response
    const imageUrl = extractImageUrl(output)

    console.log('Generated image URL:', imageUrl)

    return imageUrl
  } catch (error) {
    console.error('Replicate generation error:', error)
    throw error
  }
}

/**
 * Extract image URL from Replicate response (handles multiple formats)
 */
function extractImageUrl(output: any): string {
  // Case 1: ReadableStream (binary data)
  if (output instanceof ReadableStream) {
    throw new Error(
      'ReadableStream output not supported. Need to handle buffer conversion.'
    )
  }

  // Case 2: File object with url() method
  if (output && typeof output.url === 'function') {
    return output.url()
  }

  // Case 3: Array of results
  if (Array.isArray(output) && output.length > 0) {
    const firstItem = output[0]

    // File object in array
    if (firstItem && typeof firstItem.url === 'function') {
      return firstItem.url()
    }

    // String URL in array
    if (typeof firstItem === 'string') {
      return firstItem
    }
  }

  // Case 4: Direct string URL
  if (typeof output === 'string') {
    return output
  }

  throw new Error(`Unexpected output format from Replicate: ${typeof output}`)
}

/**
 * Worker to process model generation jobs
 */
const worker = new Worker<ModelGenerationJob>(
  'model-generation',
  async (job: Job<ModelGenerationJob>) => {
    const { promptId, gender, prompt, negativePrompt } = job.data

    console.log(`\n${'='.repeat(60)}`)
    console.log(`Starting generation for ${promptId} (${gender})`)
    console.log(`${'='.repeat(60)}`)

    // Update job progress
    await job.updateProgress(10)

    // Generate image using Replicate
    await job.updateProgress(30)
    const imageUrl = await generateModelImage(prompt, negativePrompt)

    // Download image to local directory
    await job.updateProgress(70)
    const outputDir = path.join(process.cwd(), 'models', gender)

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
    }

    // Generate filename
    const timestamp = Date.now()
    const filename = `${promptId}_${timestamp}.png`
    const filepath = path.join(outputDir, filename)

    console.log(`Downloading image to: ${filepath}`)

    await downloadImage(imageUrl, filepath)

    await job.updateProgress(100)

    console.log(`✓ Completed: ${promptId} saved to ${filepath}`)
    console.log(`${'='.repeat(60)}\n`)

    return {
      success: true,
      promptId,
      gender,
      filepath,
      imageUrl,
    }
  },
  {
    connection,
    concurrency: 2, // Process 2 images at a time (adjust based on your needs)
  }
)

worker.on('completed', (job) => {
  console.log(`✓ Job ${job.id} completed successfully`)
})

worker.on('failed', (job, err) => {
  console.error(`✗ Job ${job?.id} failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('Worker error:', err)
})

console.log('\n' + '='.repeat(60))
console.log('Model generation worker started')
console.log('Waiting for jobs...')
console.log('='.repeat(60) + '\n')

export default worker
