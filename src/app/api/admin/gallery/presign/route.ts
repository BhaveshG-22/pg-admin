import { NextRequest, NextResponse } from 'next/server'
import { createPresignedPutUrl, generateGalleryKey, validateUpload } from '@/lib/s3'

export const runtime = 'nodejs'

interface PresignRequest {
  filename: string
  mimeType: string
  fileSize: number
}

export async function POST(req: NextRequest) {
  try {
    const { filename, mimeType, fileSize }: PresignRequest = await req.json()

    if (!filename || !mimeType || !fileSize) {
      return NextResponse.json(
        { error: 'Missing required fields: filename, mimeType, fileSize' },
        { status: 400 }
      )
    }

    const validation = validateUpload(mimeType, fileSize)
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const s3Key = generateGalleryKey(filename)

    const presignedUrl = await createPresignedPutUrl(s3Key, mimeType, 300)

    return NextResponse.json({
      url: presignedUrl,
      key: s3Key,
      headers: {
        'Content-Type': mimeType,
      },
      expiresIn: 300,
    })
  } catch (error) {
    console.error('Presign URL error:', error)
    return NextResponse.json(
      { error: 'Failed to generate presigned URL' },
      { status: 500 }
    )
  }
}
