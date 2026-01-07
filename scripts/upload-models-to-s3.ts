#!/usr/bin/env ts-node
/**
 * Upload model images to S3
 *
 * Usage:
 *   ts-node upload-models-to-s3.ts
 */

import * as dotenv from 'dotenv'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import * as fs from 'fs'
import * as path from 'path'

// Load environment variables
dotenv.config()

interface ModelImageMapping {
  id: string
  gender: 'male' | 'female'
  localPath: string
  s3Key: string
  s3Url: string
}

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
})

const BUCKET_NAME = process.env.S3_ADMIN_BUCKET!

/**
 * Upload a single file to S3
 */
async function uploadToS3(
  filePath: string,
  s3Key: string
): Promise<string> {
  const fileContent = fs.readFileSync(filePath)

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: s3Key,
    Body: fileContent,
    ContentType: 'image/png',
    CacheControl: 'public, max-age=31536000', // Cache for 1 year
  })

  await s3Client.send(command)

  // Return the public URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`
}

/**
 * Get all model images from local directories
 */
function getModelImages(): Array<{ gender: 'male' | 'female'; filePath: string; filename: string }> {
  const images: Array<{ gender: 'male' | 'female'; filePath: string; filename: string }> = []

  const genders: Array<'male' | 'female'> = ['male', 'female']

  for (const gender of genders) {
    const dir = path.join(process.cwd(), 'models', gender)

    if (!fs.existsSync(dir)) {
      console.log(`Warning: Directory ${dir} does not exist`)
      continue
    }

    const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'))

    for (const file of files) {
      images.push({
        gender,
        filePath: path.join(dir, file),
        filename: file,
      })
    }
  }

  return images
}

/**
 * Main upload function
 */
async function main() {
  console.log('\n' + '='.repeat(60))
  console.log('Uploading Model Images to S3')
  console.log('='.repeat(60))
  console.log(`Bucket: ${BUCKET_NAME}`)
  console.log(`Region: ${process.env.AWS_REGION}`)
  console.log('='.repeat(60) + '\n')

  // Validate environment variables
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('Error: AWS credentials not set in environment')
    process.exit(1)
  }

  if (!process.env.S3_ADMIN_BUCKET) {
    console.error('Error: S3_ADMIN_BUCKET not set in environment')
    process.exit(1)
  }

  // Get all model images
  const images = getModelImages()

  if (images.length === 0) {
    console.error('Error: No model images found in models/ directory')
    process.exit(1)
  }

  console.log(`Found ${images.length} images to upload`)
  console.log(`  Male: ${images.filter((i) => i.gender === 'male').length}`)
  console.log(`  Female: ${images.filter((i) => i.gender === 'female').length}`)
  console.log('')

  // Upload all images
  const mappings: ModelImageMapping[] = []
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < images.length; i++) {
    const image = images[i]
    const s3Key = `models/${image.gender}/${image.filename}`

    try {
      console.log(`[${i + 1}/${images.length}] Uploading ${image.filename}...`)

      const s3Url = await uploadToS3(image.filePath, s3Key)

      // Extract model ID from filename (e.g., male_01_1767713191241.png -> male_01)
      const modelId = image.filename.split('_').slice(0, 2).join('_')

      mappings.push({
        id: modelId,
        gender: image.gender,
        localPath: image.filePath,
        s3Key,
        s3Url,
      })

      console.log(`    ✓ Uploaded to: ${s3Url}`)
      successCount++
    } catch (error: any) {
      console.error(`    ✗ Failed: ${error.message}`)
      failCount++
    }
  }

  // Save mappings to JSON file
  const mappingsPath = path.join(process.cwd(), 'model-s3-mappings.json')
  fs.writeFileSync(mappingsPath, JSON.stringify(mappings, null, 2))

  console.log('\n' + '='.repeat(60))
  console.log('Upload Complete!')
  console.log('='.repeat(60))
  console.log(`✓ Successful: ${successCount}`)
  console.log(`✗ Failed: ${failCount}`)
  console.log(`\nMappings saved to: model-s3-mappings.json`)
  console.log('='.repeat(60) + '\n')

  // Print example usage
  console.log('Example S3 URLs:')
  console.log(`  Male:   ${mappings.find((m) => m.gender === 'male')?.s3Url || 'N/A'}`)
  console.log(`  Female: ${mappings.find((m) => m.gender === 'female')?.s3Url || 'N/A'}`)
  console.log('')
}

main().catch((error) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
