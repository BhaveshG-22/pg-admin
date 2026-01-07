'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, User } from 'lucide-react'
import { ModelImageUpload } from '@/components/ModelImageUpload'

interface GlobalModel {
  id: string
  name: string
  imageUrl: string
  gender: 'MALE' | 'FEMALE'
  isActive: boolean
  createdAt: string
}

export default function ModelsPage() {
  const [models, setModels] = useState<GlobalModel[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    imageUrl: '',
    gender: 'MALE' as 'MALE' | 'FEMALE',
  })

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/admin/models')
      const data = await res.json()
      setModels(data.models)
    } catch (err) {
      console.error('Failed to fetch models:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const res = await fetch('/api/admin/models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (res.ok) {
        setFormData({ name: '', imageUrl: '', gender: 'MALE' })
        setShowCreateForm(false)
        fetchModels()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      console.error('Failed to create model:', err)
      alert('Failed to create model')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this model?')) return

    try {
      const res = await fetch(`/api/admin/models/${id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        fetchModels()
      } else {
        const data = await res.json()
        alert(`Error: ${data.error}`)
      }
    } catch (err) {
      console.error('Failed to delete model:', err)
      alert('Failed to delete model')
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      const res = await fetch(`/api/admin/models/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })

      if (res.ok) {
        fetchModels()
      }
    } catch (err) {
      console.error('Failed to toggle model status:', err)
    }
  }

  const maleModels = models.filter((m) => m.gender === 'MALE')
  const femaleModels = models.filter((m) => m.gender === 'FEMALE')

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading models...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Global Models</h1>
          <p className="text-muted-foreground mt-2">
            Manage models used for generating preset examples
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Total: {models.length} ({maleModels.length} male, {femaleModels.length} female)
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Model
        </Button>
      </div>

      {showCreateForm && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Create New Model</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-sm font-medium">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                  placeholder="Model name"
                  required
                />
              </div>
              <ModelImageUpload
                value={formData.imageUrl}
                onChange={(url) => setFormData({ ...formData, imageUrl: url })}
                label="Model Image"
              />
              <div>
                <label className="text-sm font-medium">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gender: e.target.value as 'MALE' | 'FEMALE',
                    })
                  }
                  className="w-full mt-1 px-3 py-2 border rounded-lg"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
              <div className="flex gap-2">
                <Button type="submit">Create Model</Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {/* Male Models */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Male Models ({maleModels.length})
          </h2>
          <div className="space-y-4">
            {maleModels.map((model) => (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={model.imageUrl}
                      alt={model.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{model.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {model.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleActive(model.id, model.isActive)
                          }
                        >
                          {model.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {maleModels.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No male models yet
              </p>
            )}
          </div>
        </div>

        {/* Female Models */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <User className="h-5 w-5" />
            Female Models ({femaleModels.length})
          </h2>
          <div className="space-y-4">
            {femaleModels.map((model) => (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="flex gap-4">
                    <img
                      src={model.imageUrl}
                      alt={model.name}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <div className="flex-1">
                      <h3 className="font-medium">{model.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {model.isActive ? (
                          <span className="text-green-600">Active</span>
                        ) : (
                          <span className="text-gray-500">Inactive</span>
                        )}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleToggleActive(model.id, model.isActive)
                          }
                        >
                          {model.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(model.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {femaleModels.length === 0 && (
              <p className="text-muted-foreground text-center py-8">
                No female models yet
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
