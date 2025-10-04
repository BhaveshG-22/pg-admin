'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Pencil, ExternalLink } from 'lucide-react'

interface Preset {
  id: string
  title: string
  slug: string
  description: string
  category: string
  provider: string
  credits: number
  isActive: boolean
  badge: string
  badgeColor: string
  thumbnailUrl: string | null
  prompt: string
  createdAt: string
  updatedAt: string
}

export default function PresetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [preset, setPreset] = useState<Preset | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPreset()
  }, [id])

  const fetchPreset = async () => {
    try {
      const res = await fetch(`/api/admin/presets/${id}`)
      const data = await res.json()
      setPreset(data)
    } catch (err) {
      console.error('Failed to fetch preset:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading preset...</div>
      </div>
    )
  }

  if (!preset) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Preset not found</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 max-w-4xl">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{preset.title}</h1>
          <p className="text-muted-foreground mt-2">Preset Details</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/presets/${preset.id}/edit`}>
            <Button>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" asChild>
            <a
              href={`/studio/${preset.slug}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Open in Studio
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preset.thumbnailUrl && (
              <div>
                <img
                  src={preset.thumbnailUrl}
                  alt={preset.title}
                  className="w-full max-w-md rounded-lg"
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Slug</p>
                <p className="font-medium">{preset.slug}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">
                  {preset.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-600">Inactive</span>
                  )}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Category</p>
                <p className="font-medium">{preset.category || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Provider</p>
                <p className="font-medium">{preset.provider}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credits</p>
                <p className="font-medium">{preset.credits}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Badge</p>
                <p className="font-medium">{preset.badge || 'N/A'}</p>
              </div>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="mt-1">{preset.description}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Prompt</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="bg-muted p-4 rounded-lg overflow-auto text-sm">
              {preset.prompt}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Timestamps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Created At</p>
                <p className="font-medium">
                  {new Date(preset.createdAt).toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Updated At</p>
                <p className="font-medium">
                  {new Date(preset.updatedAt).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
