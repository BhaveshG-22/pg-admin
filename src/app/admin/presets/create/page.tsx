'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Sparkles, Plus, Trash2 } from 'lucide-react'
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

interface InputField {
  name: string
  label: string
  type: 'text' | 'number'
  placeholder: string
  defaultValue?: string
  required: boolean
}

export default function CreatePresetPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState('')
  const [llmPrompt, setLlmPrompt] = useState('')
  const [inputFields, setInputFields] = useState<InputField[]>([])
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    category: '',
    provider: 'NANO_BANANA',
    credits: '1',
    isActive: true,
    badge: '',
    badgeColor: '',
    thumbnailUrl: '',
    prompt: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/admin/presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          inputFields: inputFields.length > 0 ? inputFields : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create preset')
      }

      router.push('/admin/presets')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create preset')
    } finally {
      setLoading(false)
    }
  }

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      title: value,
      slug: prev.slug || value.toLowerCase().replace(/\s+/g, '-'),
    }))
  }

  const handleAnalyzePrompt = async () => {
    if (!llmPrompt.trim()) {
      setError('Please enter a prompt to analyze')
      return
    }

    setAnalyzing(true)
    setError('')

    try {
      const res = await fetch('/api/admin/presets/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: llmPrompt }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to analyze prompt')
      }

      // Fill form with analyzed data
      setFormData({
        title: data.title || '',
        slug: data.slug || '',
        description: data.description || '',
        category: data.category || '',
        provider: data.provider || 'NANO_BANANA',
        credits: String(data.credits || 1),
        isActive: true,
        badge: data.badge || '',
        badgeColor: data.badgeColor || '',
        thumbnailUrl: formData.thumbnailUrl, // Keep existing thumbnail
        prompt: data.prompt || llmPrompt,
      })

      // Set input fields if available
      if (data.inputFields && Array.isArray(data.inputFields)) {
        setInputFields(data.inputFields)
      }

      // Clear the LLM prompt input after successful analysis
      setLlmPrompt('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze prompt')
    } finally {
      setAnalyzing(false)
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
    setInputFields(inputFields.filter((_, i) => i !== index))
  }

  const updateInputField = (index: number, field: Partial<InputField>) => {
    const updated = [...inputFields]
    updated[index] = { ...updated[index], ...field }
    setInputFields(updated)
  }

  const insertVariableIntoPrompt = (variableName: string) => {
    const variable = `{{${variableName}}}`
    const textarea = document.getElementById('prompt') as HTMLTextAreaElement
    if (textarea) {
      const start = textarea.selectionStart
      const end = textarea.selectionEnd
      const text = formData.prompt
      const newText = text.substring(0, start) + variable + text.substring(end)
      setFormData({ ...formData, prompt: newText })

      // Set cursor position after the inserted variable
      setTimeout(() => {
        textarea.focus()
        textarea.setSelectionRange(start + variable.length, start + variable.length)
      }, 0)
    }
  }

  return (
    <div className="container mx-auto py-6 px-4 sm:py-10 max-w-4xl">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Create Preset</h1>
        <p className="text-muted-foreground mt-2 text-sm sm:text-base">
          Add a new preset to the system
        </p>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI-Powered Form Filling
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="llmPrompt">Paste Your Prompt</Label>
            <Textarea
              id="llmPrompt"
              value={llmPrompt}
              onChange={(e) => setLlmPrompt(e.target.value)}
              rows={6}
              placeholder="Paste your detailed image generation prompt here. For example:&#10;&#10;A birthday celebration photoshoot in a stylish modern studio setup. A young man is sitting casually on the floor in front of a decorated wall with silver balloons..."
            />
            <p className="text-sm text-muted-foreground mt-2">
              AI will analyze your prompt and automatically fill the form fields below
            </p>
          </div>
          <Button
            type="button"
            onClick={handleAnalyzePrompt}
            disabled={analyzing || !llmPrompt.trim()}
            className="w-full"
          >
            {analyzing ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Analyzing Prompt...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Auto-Fill Form with AI
              </>
            )}
          </Button>
        </CardContent>
      </Card>

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
                value={formData.title}
                onChange={(e) => handleTitleChange(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="slug">Slug *</Label>
              <Input
                id="slug"
                required
                value={formData.slug}
                onChange={(e) =>
                  setFormData({ ...formData, slug: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) =>
                    setFormData({ ...formData, category: value })
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
                  value={formData.provider}
                  onValueChange={(value) =>
                    setFormData({ ...formData, provider: value })
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
                  value={formData.credits}
                  onChange={(e) =>
                    setFormData({ ...formData, credits: e.target.value })
                  }
                />
              </div>

              <div className="flex items-center space-x-2 pt-8">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="badge">Badge</Label>
                <Input
                  id="badge"
                  value={formData.badge}
                  onChange={(e) =>
                    setFormData({ ...formData, badge: e.target.value })
                  }
                  placeholder="e.g., Featured, New"
                />
              </div>

              <div>
                <Label htmlFor="badgeColor">Badge Color</Label>
                <Input
                  id="badgeColor"
                  value={formData.badgeColor}
                  onChange={(e) =>
                    setFormData({ ...formData, badgeColor: e.target.value })
                  }
                  placeholder="e.g., #3b82f6"
                />
              </div>
            </div>

            <ThumbnailUpload
              value={formData.thumbnailUrl}
              onChange={(url) =>
                setFormData({ ...formData, thumbnailUrl: url })
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
              <div className="space-y-6">
                {inputFields.map((field, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Variable {index + 1}</h4>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInputField(index)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>

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
                  </div>
                ))}
              </div>
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
              value={formData.prompt}
              onChange={(e) =>
                setFormData({ ...formData, prompt: e.target.value })
              }
              rows={8}
              placeholder="Enter the prompt template. Use {{variableName}} to insert variables..."
            />
            <p className="text-sm text-muted-foreground mt-2">
              Use double curly braces to insert variables: {`{{variableName}}`}
            </p>
          </CardContent>
        </Card>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? 'Creating...' : 'Create Preset'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
