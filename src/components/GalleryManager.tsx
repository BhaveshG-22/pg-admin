'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Plus, Trash2, MoveUp, MoveDown, ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface GalleryImage {
  url: string
  uploading?: boolean
  progress?: number
}

interface GalleryManagerProps {
  value: string[] // Array of image URLs
  onChange: (images: string[]) => void
}

async function requestPresignedUrl(file: File): Promise<{ url: string; key: string; headers: Record<string, string> }> {
  const response = await fetch('/api/admin/gallery/presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

async function uploadToS3(
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
      reject(new Error('Upload failed: Check S3 bucket configuration (CORS settings)'))
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

function validateFile(file: File) {
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

export function GalleryManager({ value, onChange }: GalleryManagerProps) {
  const [images, setImages] = useState<GalleryImage[]>(
    value.map(url => ({ url }))
  )
  const [error, setError] = useState('')
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const updateParent = (updatedImages: GalleryImage[]) => {
    const urls = updatedImages
      .filter(img => img.url && !img.uploading) // Only include uploaded images
      .map(img => img.url)
    onChange(urls)
  }

  const addImage = () => {
    const updated = [...images, { url: '' }]
    setImages(updated)
  }

  const removeImage = (index: number) => {
    const updated = images.filter((_, i) => i !== index)
    setImages(updated)
    updateParent(updated)
  }

  const moveImage = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= images.length) return

    const updated = [...images]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setImages(updated)
    updateParent(updated)
  }

  const handleFileUpload = async (index: number, file: File) => {
    setError('')

    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    const updated = [...images]
    updated[index].uploading = true
    updated[index].progress = 0
    setImages(updated)

    try {
      const presignData = await requestPresignedUrl(file)

      await uploadToS3(
        presignData.url,
        file,
        presignData.headers,
        (progress) => {
          const updatedProgress = [...images]
          updatedProgress[index].progress = progress
          setImages(updatedProgress)
        }
      )

      // Convert S3 key to full URL
      const bucket = process.env.NEXT_PUBLIC_S3_ADMIN_BUCKET || 'pixelglow-admin-assets'
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
      const fullUrl = `https://${bucket}.s3.${region}.amazonaws.com/${presignData.key}`

      const updatedFinal = [...images]
      updatedFinal[index].url = fullUrl
      updatedFinal[index].uploading = false
      updatedFinal[index].progress = 0
      setImages(updatedFinal)
      updateParent(updatedFinal)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)

      const updatedError = [...images]
      updatedError[index].uploading = false
      updatedError[index].progress = 0
      setImages(updatedError)
    }
  }

  const handleFileSelect = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleFileUpload(index, file)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-lg">Gallery Images</Label>
          <p className="text-sm text-muted-foreground mt-1">
            Upload example images generated with this preset to help users visualize results
          </p>
        </div>
        <Button type="button" onClick={addImage} size="sm" variant="outline">
          <Plus className="mr-2 h-4 w-4" />
          Add Image
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {images.length === 0 ? (
        <Card className="border-2 border-dashed p-8 text-center">
          <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">No gallery images added yet</p>
          <Button type="button" onClick={addImage} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add First Image
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {images.map((image, index) => (
            <Card key={index} className="p-3">
              <div className="space-y-2">
                {image.url && !image.uploading ? (
                  <div className="relative group">
                    <img
                      src={image.url}
                      alt={`Gallery ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg border"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => {
                        const updated = [...images]
                        updated[index].url = ''
                        setImages(updated)
                        updateParent(updated)
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : image.uploading ? (
                  <div className="border rounded-lg h-48 flex flex-col items-center justify-center">
                    <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Uploading... {Math.round(image.progress || 0)}%
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg h-48 flex flex-col items-center justify-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <input
                      ref={(el) => {
                        fileInputRefs.current[index] = el
                      }}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      onChange={(e) => handleFileSelect(index, e)}
                      className="hidden"
                      id={`gallery-${index}`}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRefs.current[index]?.click()}
                    >
                      Choose File
                    </Button>
                  </div>
                )}

                {/* Controls */}
                <div className="flex gap-2 justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveImage(index, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8"
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveImage(index, 'down')}
                    disabled={index === images.length - 1}
                    className="h-8 w-8"
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeImage(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Accepted formats: JPEG, PNG, WebP (max 10MB per image). Upload example images to help users see what they can create.
      </p>
    </div>
  )
}
