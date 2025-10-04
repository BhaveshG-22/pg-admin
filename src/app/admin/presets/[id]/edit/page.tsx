'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Download, Play } from 'lucide-react'
import { ThumbnailUpload } from '@/components/ThumbnailUpload'

const PROVIDERS = [
  'OPENAI',
  'FLUX_DEV',
  'FLUX_PRO',
  'FLUX_SCHNELL',
  'REPLICATE_OPENAI',
  'SEEDREAM',
  'STABLE_DIFFUSION',
  'FLUX_KONTEXT',
  'NANO_BANANA',
]

const CATEGORIES = ['Portrait', 'Style', 'Effect', 'Background', 'Enhancement']

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
}

export default function EditPresetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [preset, setPreset] = useState<Preset | null>(null)
  const [testInput, setTestInput] = useState('{}')
  const [testResult, setTestResult] = useState<Record<string, unknown> | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    fetchPreset()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const fetchPreset = async () => {
    try {
      const res = await fetch(`/api/admin/presets/${id}`)
      const data = await res.json()
      setPreset(data)
    } catch {
      setError('Failed to load preset')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/admin/presets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preset),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update preset')
      }

      router.push('/admin/presets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preset')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this preset?')) return

    try {
      await fetch(`/api/admin/presets/${id}`, {
        method: 'DELETE',
      })
      router.push('/admin/presets')
    } catch {
      setError('Failed to delete preset')
    }
  }

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/admin/presets/${id}/export`)
      const data = await res.json()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${preset?.slug || 'preset'}.json`
      a.click()
    } catch {
      setError('Failed to export preset')
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const res = await fetch(`/api/admin/presets/${id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputValues: JSON.parse(testInput) }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch {
      setTestResult({ error: 'Test failed' })
    } finally {
      setTesting(false)
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
          <h1 className="text-3xl font-bold">Edit Preset</h1>
          <p className="text-muted-foreground mt-2">
            Update preset configuration
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export JSON
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                required
                value={preset.title}
                onChange={(e) =>
                  setPreset({ ...preset, title: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                required
                value={preset.slug}
                onChange={(e) =>
                  setPreset({ ...preset, slug: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={preset.description}
                onChange={(e) =>
                  setPreset({ ...preset, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={preset.category}
                  onValueChange={(value) =>
                    setPreset({ ...preset, category: value })
                  }
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="provider">Provider *</Label>
                <Select
                  value={preset.provider}
                  onValueChange={(value) =>
                    setPreset({ ...preset, provider: value })
                  }
                >
                  <SelectTrigger id="provider">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDERS.map((provider) => (
                      <SelectItem key={provider} value={provider}>
                        {provider}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="credits">Credits *</Label>
                <Input
                  id="credits"
                  type="number"
                  min="1"
                  required
                  value={preset.credits}
                  onChange={(e) =>
                    setPreset({ ...preset, credits: parseInt(e.target.value) })
                  }
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="isActive"
                  checked={preset.isActive}
                  onCheckedChange={(checked) =>
                    setPreset({ ...preset, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="badge">Badge</Label>
                <Input
                  id="badge"
                  value={preset.badge}
                  onChange={(e) =>
                    setPreset({ ...preset, badge: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="badgeColor">Badge Color</Label>
                <Input
                  id="badgeColor"
                  value={preset.badgeColor}
                  onChange={(e) =>
                    setPreset({ ...preset, badgeColor: e.target.value })
                  }
                />
              </div>
            </div>

            <ThumbnailUpload
              value={preset.thumbnailUrl || ''}
              onChange={(url) =>
                setPreset({ ...preset, thumbnailUrl: url })
              }
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Prompt Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="prompt">Prompt *</Label>
            <Textarea
              id="prompt"
              required
              value={preset.prompt}
              onChange={(e) =>
                setPreset({ ...preset, prompt: e.target.value })
              }
              rows={8}
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Test Interface</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="testInput">Input JSON</Label>
              <Textarea
                id="testInput"
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={4}
                placeholder='{"key": "value"}'
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleTest}
              disabled={testing}
            >
              <Play className="mr-2 h-4 w-4" />
              {testing ? 'Running Test...' : 'Run Test'}
            </Button>
            {testResult && (
              <div className="mt-4 p-4 bg-muted rounded">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(testResult, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="ml-auto"
          >
            Delete Preset
          </Button>
        </div>
      </form>
    </div>
  )
}
