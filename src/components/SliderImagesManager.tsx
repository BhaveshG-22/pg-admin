'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Plus, Trash2, MoveUp, MoveDown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'

interface ExamplePair {
  before: string
  after: string
  uploadingBefore?: boolean
  uploadingAfter?: boolean
  progressBefore?: number
  progressAfter?: number
}

interface SliderImagesManagerProps {
  value: string[][] // Array of [before, after] URL pairs
  onChange: (examples: string[][]) => void
  showHeader?: boolean // Whether to show the header section
}

async function requestPresignedUrl(file: File): Promise<{ url: string; key: string; headers: Record<string, string> }> {
  const response = await fetch('/api/admin/examples/presign', {
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

export function SliderImagesManager({ value, onChange, showHeader = true }: SliderImagesManagerProps) {
  const [examples, setExamples] = useState<ExamplePair[]>(
    value.map(([before, after]) => ({ before, after }))
  )
  const [error, setError] = useState('')
  const beforeInputRefs = useRef<(HTMLInputElement | null)[]>([])
  const afterInputRefs = useRef<(HTMLInputElement | null)[]>([])

  const updateParent = (updatedExamples: ExamplePair[]) => {
    const formatted = updatedExamples
      .filter(ex => ex.before && ex.after) // Only include complete pairs
      .map(ex => [ex.before, ex.after])
    onChange(formatted)
  }

  const addExample = () => {
    const updated = [...examples, { before: '', after: '' }]
    setExamples(updated)
  }

  const removeExample = (index: number) => {
    const updated = examples.filter((_, i) => i !== index)
    setExamples(updated)
    updateParent(updated)
  }

  const moveExample = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= examples.length) return

    const updated = [...examples]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setExamples(updated)
    updateParent(updated)
  }

  const handleFileUpload = async (index: number, type: 'before' | 'after', file: File) => {
    setError('')

    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    const updated = [...examples]
    if (type === 'before') {
      updated[index].uploadingBefore = true
      updated[index].progressBefore = 0
    } else {
      updated[index].uploadingAfter = true
      updated[index].progressAfter = 0
    }
    setExamples(updated)

    try {
      const presignData = await requestPresignedUrl(file)

      await uploadToS3(
        presignData.url,
        file,
        presignData.headers,
        (progress) => {
          const updatedProgress = [...examples]
          if (type === 'before') {
            updatedProgress[index].progressBefore = progress
          } else {
            updatedProgress[index].progressAfter = progress
          }
          setExamples(updatedProgress)
        }
      )

      // Convert S3 key to full URL
      const bucket = process.env.NEXT_PUBLIC_S3_ADMIN_BUCKET || 'pixelglow-admin-assets'
      const region = process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
      const fullUrl = `https://${bucket}.s3.${region}.amazonaws.com/${presignData.key}`

      const updatedFinal = [...examples]
      if (type === 'before') {
        updatedFinal[index].before = fullUrl
        updatedFinal[index].uploadingBefore = false
        updatedFinal[index].progressBefore = 0
      } else {
        updatedFinal[index].after = fullUrl
        updatedFinal[index].uploadingAfter = false
        updatedFinal[index].progressAfter = 0
      }
      setExamples(updatedFinal)
      updateParent(updatedFinal)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)

      const updatedError = [...examples]
      if (type === 'before') {
        updatedError[index].uploadingBefore = false
        updatedError[index].progressBefore = 0
      } else {
        updatedError[index].uploadingAfter = false
        updatedError[index].progressAfter = 0
      }
      setExamples(updatedError)
    }
  }

  const handleFileSelect = (index: number, type: 'before' | 'after', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    handleFileUpload(index, type, file)
  }

  return (
    <div className="space-y-4">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-lg">Transformation Examples</Label>
            <p className="text-sm text-muted-foreground mt-1">
              Upload before/after image pairs to showcase transformations
            </p>
          </div>
          <Button type="button" onClick={addExample} size="sm" variant="outline">
            <Plus className="mr-2 h-4 w-4" />
            Add Example
          </Button>
        </div>
      )}

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {examples.length === 0 ? (
        <Card className="border-2 border-dashed p-8 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground mb-3">No examples added yet</p>
          <Button type="button" onClick={addExample} variant="outline" size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Add First Example
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {!showHeader && (
            <div className="flex justify-end">
              <Button type="button" onClick={addExample} size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Example
              </Button>
            </div>
          )}
          {examples.map((example, index) => (
            <Card key={index} className="p-4">
              <div className="flex items-start gap-4">
                {/* Before Image */}
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-2 block">Before</Label>
                  {example.before && !example.uploadingBefore ? (
                    <div className="relative group">
                      <img
                        src={example.before}
                        alt="Before"
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const updated = [...examples]
                          updated[index].before = ''
                          setExamples(updated)
                          updateParent(updated)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : example.uploadingBefore ? (
                    <div className="border rounded-lg p-6 text-center h-40 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Uploading... {Math.round(example.progressBefore || 0)}%
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center h-40 flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <input
                        ref={(el) => {
                          beforeInputRefs.current[index] = el
                        }}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(index, 'before', e)}
                        className="hidden"
                        id={`before-${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => beforeInputRefs.current[index]?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>

                {/* Arrow */}
                <div className="flex items-center justify-center pt-8">
                  <ArrowRight className="h-6 w-6 text-muted-foreground" />
                </div>

                {/* After Image */}
                <div className="flex-1">
                  <Label className="text-sm font-medium mb-2 block">After</Label>
                  {example.after && !example.uploadingAfter ? (
                    <div className="relative group">
                      <img
                        src={example.after}
                        alt="After"
                        className="w-full h-40 object-cover rounded-lg border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => {
                          const updated = [...examples]
                          updated[index].after = ''
                          setExamples(updated)
                          updateParent(updated)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : example.uploadingAfter ? (
                    <div className="border rounded-lg p-6 text-center h-40 flex flex-col items-center justify-center">
                      <Loader2 className="h-8 w-8 text-primary animate-spin mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Uploading... {Math.round(example.progressAfter || 0)}%
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center h-40 flex flex-col items-center justify-center">
                      <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                      <input
                        ref={(el) => {
                          afterInputRefs.current[index] = el
                        }}
                        type="file"
                        accept="image/jpeg,image/jpg,image/png,image/webp"
                        onChange={(e) => handleFileSelect(index, 'after', e)}
                        className="hidden"
                        id={`after-${index}`}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => afterInputRefs.current[index]?.click()}
                      >
                        Choose File
                      </Button>
                    </div>
                  )}
                </div>

                {/* Controls */}
                <div className="flex flex-col gap-2 pt-8">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveExample(index, 'up')}
                    disabled={index === 0}
                    className="h-8 w-8"
                  >
                    <MoveUp className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => moveExample(index, 'down')}
                    disabled={index === examples.length - 1}
                    className="h-8 w-8"
                  >
                    <MoveDown className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    onClick={() => removeExample(index)}
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
        Accepted formats: JPEG, PNG, WebP (max 10MB per image). Both before and after images are required for each example.
      </p>
    </div>
  )
}
