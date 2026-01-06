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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Download, Play, Plus, Trash2 } from 'lucide-react'
import { ThumbnailUpload } from '@/components/ThumbnailUpload'
import { SliderImagesManager } from '@/components/SliderImagesManager'
import { GalleryManager } from '@/components/GalleryManager'

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

interface InputField {
  name: string
  label: string
  type: 'text' | 'number'
  placeholder: string
  defaultValue?: string
  required: boolean
}

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
  inputFields?: InputField[] | null
  slider_img?: string[][] | null
  gallery?: string[] | null
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
  const [inputFields, setInputFields] = useState<InputField[]>([])
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
      setInputFields(data.inputFields || [])
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

    const payload = {
      ...preset,
      inputFields: inputFields.length > 0 ? inputFields : null,
      slider_img: preset?.slider_img && preset.slider_img.length > 0 ? preset.slider_img : null,
      gallery: preset?.gallery && preset.gallery.length > 0 ? preset.gallery : null,
    }

    console.log('Saving preset with inputFields:', payload.inputFields)

    try {
      const res = await fetch(`/api/admin/presets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const addInputField = () => {
    setInputFields([
      ...inputFields,
      {
        name: '',
        label: '',
        type: 'text',
        placeholder: '',
        required: false,
      },
    ])
  }

  const removeInputField = (index: number) => {
    const fieldToRemove = inputFields[index]
    setInputFields(inputFields.filter((_, i) => i !== index))

    // Remove the variable from the prompt template
    if (fieldToRemove.name && preset) {
      const variableToRemove = `{{${fieldToRemove.name}}}`
      setPreset({
        ...preset,
        prompt: preset.prompt.replaceAll(variableToRemove, '')
      })
    }
  }

  const updateInputField = (index: number, field: Partial<InputField>) => {
    const updated = [...inputFields]
    const oldName = updated[index].name

    // Clean variable name: remove spaces and special characters
    if (field.name !== undefined) {
      field.name = field.name
        .trim()
        .replace(/\s+/g, '_') // Replace spaces with underscores
        .replace(/[^a-zA-Z0-9_]/g, '') // Remove special characters except underscore
        .toLowerCase()
    }

    updated[index] = { ...updated[index], ...field }
    setInputFields(updated)

    // If variable name changed, update it in the prompt template
    if (field.name !== undefined && oldName && field.name !== oldName && preset) {
      const oldVariable = `{{${oldName}}}`
      const newVariable = field.name ? `{{${field.name}}}` : ''
      setPreset({
        ...preset,
        prompt: preset.prompt.replaceAll(oldVariable, newVariable)
      })
    }
  }

  const insertVariableIntoPrompt = (variableName: string) => {
    if (!preset) return
    const variable = `{{${variableName}}}`
    const textarea = document.getElementById('prompt') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = preset.prompt
      const newText = text.substring(0, start) + variable + text.substring(end)
      setPreset({ ...preset, prompt: newText })

      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
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
    <div className="container mx-auto py-6 px-4 sm:py-10 max-w-4xl">
      <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Edit Preset</h1>
          <p className="text-muted-foreground mt-2 text-sm sm:text-base">
            Update preset configuration
          </p>
        </div>
        <Button variant="outline" onClick={handleExport} className="w-full sm:w-auto">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div className="pt-6">
                <Label htmlFor="isActive" className="mb-3 block">Visibility</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="isActive"
                    checked={preset.isActive}
                    onCheckedChange={(checked) =>
                      setPreset({ ...preset, isActive: checked })
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {preset.isActive ? 'Visible to users' : 'Hidden from users'}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  When turned off, this preset will be hidden from users but remain in the database
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Display</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <CardTitle>Slider Images (Before/After)</CardTitle>
          </CardHeader>
          <CardContent>
            <SliderImagesManager
              value={preset.slider_img || []}
              onChange={(slider_img) =>
                setPreset({ ...preset, slider_img })
              }
              showHeader={false}
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Gallery - Example Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <GalleryManager
              value={preset.gallery || []}
              onChange={(gallery) =>
                setPreset({ ...preset, gallery })
              }
            />
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span>Input Variables</span>
              <Button type="button" onClick={addInputField} size="sm" className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
                Add Variable
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {inputFields.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                No input variables defined. Click &quot;Add Variable&quot; to create dynamic inputs for users.
              </p>
            ) : (
              <Accordion type="single" collapsible className="space-y-2">
                {inputFields.map((field, index) => (
                  <AccordionItem key={index} value={`item-${index}`} className="border rounded-lg relative">
                    <div className="flex items-center">
                      <AccordionTrigger className="px-4 hover:no-underline flex-1">
                        <span className="font-medium">
                          {field.name || `Variable ${index + 1}`}
                          {field.name && <span className="text-muted-foreground ml-2 text-sm">{`{{${field.name}}}`}</span>}
                        </span>
                      </AccordionTrigger>
                      <button
                        type="button"
                        className="px-3 py-2 hover:bg-muted rounded-md mr-2"
                        onClick={() => removeInputField(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </button>
                    </div>
                    <AccordionContent className="px-4 space-y-4">

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Variable Name *</Label>
                        <Input
                          value={field.name}
                          onChange={(e) =>
                            updateInputField(index, { name: e.target.value })
                          }
                          placeholder="e.g., subject, style, mood"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Use in prompt as: {`{{${field.name || 'variableName'}}}`}
                        </p>
                      </div>

                      <div>
                        <Label>Display Label *</Label>
                        <Input
                          value={field.label}
                          onChange={(e) =>
                            updateInputField(index, { label: e.target.value })
                          }
                          placeholder="e.g., Subject Description"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label>Input Type</Label>
                        <Select
                          value={field.type}
                          onValueChange={(value: InputField['type']) =>
                            updateInputField(index, { type: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">Text</SelectItem>
                            <SelectItem value="number">Number</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Placeholder</Label>
                        <Input
                          value={field.placeholder}
                          onChange={(e) =>
                            updateInputField(index, { placeholder: e.target.value })
                          }
                          placeholder="Enter placeholder text..."
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Default Value</Label>
                      <Input
                        value={field.defaultValue || ''}
                        onChange={(e) =>
                          updateInputField(index, { defaultValue: e.target.value })
                        }
                        placeholder="Default value from original prompt..."
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Pre-filled value that users can edit if needed
                      </p>
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={field.required}
                          onCheckedChange={(checked) =>
                            updateInputField(index, { required: checked })
                          }
                        />
                        <Label>Required field</Label>
                      </div>

                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => insertVariableIntoPrompt(field.name)}
                        disabled={!field.name}
                        className="w-full sm:w-auto"
                      >
                        Insert into Prompt
                      </Button>
                    </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
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
              placeholder="Enter the prompt template. Use {{variableName}} to insert variables..."
            />
            <p className="text-sm text-muted-foreground mt-2">
              Use double curly braces to insert variables: {`{{variableName}}`}
            </p>
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

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button type="submit" disabled={saving} className="w-full sm:w-auto">
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            className="w-full sm:w-auto sm:ml-auto"
          >
            Delete Preset
          </Button>
        </div>
      </form>
    </div>
  )
}
