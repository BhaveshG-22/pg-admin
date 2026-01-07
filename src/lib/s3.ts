import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

let s3Client: S3Client

export function getS3Client() {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env.AWS_REGION!,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    })
  }
  return s3Client
}

export async function createPresignedPutUrl(
  key: string,
  contentType: string,
  expiresIn: number = 300
) {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_ADMIN_BUCKET!,
    Key: key,
    ContentType: contentType,
  })

  return getSignedUrl(getS3Client(), command, { expiresIn })
}

export function generateThumbnailKey(originalFilename?: string): string {
  const timestamp = Date.now()
  const uuid = crypto.randomUUID()
  const extension = originalFilename?.split('.').pop() || 'jpg'

  return `preset-thumbnails/${timestamp}-${uuid}.${extension}`
}

export function generateExampleKey(originalFilename?: string): string {
  const timestamp = Date.now()
  const uuid = crypto.randomUUID()
  const extension = originalFilename?.split('.').pop() || 'jpg'

  return `preset-examples/${timestamp}-${uuid}.${extension}`
}

export function generateModelImageKey(originalFilename?: string): string {
  const timestamp = Date.now()
  const uuid = crypto.randomUUID()
  const extension = originalFilename?.split('.').pop() || 'jpg'

  return `model-images/${timestamp}-${uuid}.${extension}`
}

export function validateUpload(mimeType: string, fileSize: number) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']

  if (!allowedTypes.includes(mimeType)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
    }
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (fileSize > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is 10MB.`,
    }
  }

  return { valid: true }
}

export function s3KeyToUrl(s3Key: string): string {
  const bucket = process.env.S3_ADMIN_BUCKET || 'pixelglow-admin-assets'
  const region = process.env.AWS_REGION || 'us-east-1'
  return `https://${bucket}.s3.${region}.amazonaws.com/${s3Key}`
}
