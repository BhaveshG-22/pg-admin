interface PresignResponse {
  url: string
  key: string
  headers: Record<string, string>
  expiresIn: number
}

interface UploadOptions {
  file: File
  onProgress?: (progress: number) => void
  onSuccess?: (url: string) => void
  onError?: (error: string) => void
}

export async function requestPresignedUrl(file: File): Promise<PresignResponse> {
  const response = await fetch('/api/admin/thumbnails/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get presigned URL')
  }

  return response.json()
}

export async function uploadToS3(
  presignedUrl: string,
  file: File,
  headers: Record<string, string>,
  onProgress?: (progress: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    if (onProgress) {
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100
          onProgress(progress)
        }
      })
    }

    xhr.addEventListener('load', () => {
      if (xhr.status === 200) {
        resolve()
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`))
      }
    })

    xhr.addEventListener('error', () => {
      reject(new Error('Upload failed due to network error'))
    })

    xhr.addEventListener('abort', () => {
      reject(new Error('Upload was aborted'))
    })

    xhr.open('PUT', presignedUrl)

    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value)
    })

    xhr.send(file)
  })
}

export async function requestPresignedUrlForModel(file: File): Promise<PresignResponse> {
  const response = await fetch('/api/admin/models/presign', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to get presigned URL')
  }

  return response.json()
}

export async function uploadThumbnail(options: UploadOptions) {
  const { file, onProgress, onSuccess, onError } = options

  try {
    const presignData = await requestPresignedUrl(file)

    await uploadToS3(presignData.url, file, presignData.headers, onProgress)

    // Convert S3 key to full URL (using admin bucket for preset thumbnails)
    const bucket = process.env.NEXT_PUBLIC_S3_ADMIN_BUCKET || 'pixelglow-admin-assets'
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
    const fullUrl = `https://${bucket}.s3.${region}.amazonaws.com/${presignData.key}`

    onSuccess?.(fullUrl)
    return { url: fullUrl, key: presignData.key }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    onError?.(errorMessage)
    throw error
  }
}

export async function uploadModelImage(options: UploadOptions) {
  const { file, onProgress, onSuccess, onError } = options

  try {
    const presignData = await requestPresignedUrlForModel(file)

    await uploadToS3(presignData.url, file, presignData.headers, onProgress)

    // Convert S3 key to full URL (using admin bucket for model images)
    const bucket = process.env.NEXT_PUBLIC_S3_ADMIN_BUCKET || 'pixelglow-admin-assets'
    const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
    const fullUrl = `https://${bucket}.s3.${region}.amazonaws.com/${presignData.key}`

    onSuccess?.(fullUrl)
    return { url: fullUrl, key: presignData.key }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Upload failed'
    onError?.(errorMessage)
    throw error
  }
}

export function validateFile(file: File) {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  const maxSize = 10 * 1024 * 1024 // 10MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'Invalid file type. Only JPEG, PNG, and WebP are allowed.',
    }
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File too large. Maximum size is 10MB.`,
    }
  }

  return { valid: true }
}
