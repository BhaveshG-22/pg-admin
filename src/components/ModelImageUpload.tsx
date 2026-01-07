'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { uploadModelImage, validateFile } from '@/lib/upload'

interface ModelImageUploadProps {
  value: string
  onChange: (url: string) => void
  label?: string
}

export function ModelImageUpload({ value, onChange, label = 'Model Image' }: ModelImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')

    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      setError(validation.error || 'Invalid file')
      return
    }

    setUploading(true)
    setProgress(0)

    try {
      await uploadModelImage({
        file,
        onProgress: setProgress,
        onSuccess: (url) => {
          onChange(url)
          setUploading(false)
          setProgress(0)
        },
        onError: (err) => {
          let errorMsg = err
          if (err.includes('network error')) {
            errorMsg = 'Upload failed: Check S3 bucket configuration (CORS settings). See S3_SETUP.md for help.'
          }
          setError(errorMsg)
          setUploading(false)
          setProgress(0)
        },
      })
    } catch (err) {
      let errorMsg = err instanceof Error ? err.message : 'Upload failed'
      if (errorMsg.includes('network error')) {
        errorMsg = 'Upload failed: Check S3 bucket configuration (CORS settings). See S3_SETUP.md for help.'
      }
      setError(errorMsg)
      setUploading(false)
      setProgress(0)
    }
  }

  const handleRemove = () => {
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>

      {value && !uploading && (
        <div className="relative inline-block">
          <img
            src={value}
            alt="Model preview"
            className="w-32 h-32 object-cover rounded-lg border"
          />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!value && !uploading && (
        <div className="border-2 border-dashed rounded-lg p-6 text-center">
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground mb-2">
            Upload image or enter URL below
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
            id="model-image-upload"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            Choose File
          </Button>
        </div>
      )}

      {uploading && (
        <div className="border rounded-lg p-6 text-center">
          <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin mb-2" />
          <p className="text-sm text-muted-foreground">
            Uploading... {Math.round(progress)}%
          </p>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="modelImageUrl">Or enter URL directly</Label>
        <Input
          id="modelImageUrl"
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          disabled={uploading}
        />
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <p className="text-xs text-muted-foreground">
        Accepted formats: JPEG, PNG, WebP (max 10MB)
      </p>
    </div>
  )
}
