'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface Preset {
  id: string
  title: string
  slug: string
  provider: string
  credits: number
  isActive: boolean
  thumbnailUrl: string | null
  createdAt: string
  _count?: {
    generations: number
  }
}

export default function PresetsListPage() {
  const [presets, setPresets] = useState<Preset[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [providerFilter, setProviderFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchPresets()
  }, [search, statusFilter, providerFilter, sortBy])

  const fetchPresets = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (providerFilter !== 'all') params.set('provider', providerFilter)
      params.set('sort', sortBy)

      const res = await fetch(`/api/admin/presets?${params}`)
      const data = await res.json()
      setPresets(data)
    } catch (error) {
      console.error('Failed to fetch presets:', error)
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/presets/${id}/toggle`, {
        method: 'PATCH',
      })
      const updated = await res.json()
      setPresets((prev) =>
        prev.map((p) => (p.id === id ? { ...p, isActive: updated.isActive } : p))
      )
    } catch (error) {
      console.error('Failed to toggle status:', error)
    }
  }

  const deletePreset = async (id: string) => {
    if (!confirm('Are you sure you want to delete this preset?')) return

    try {
      await fetch(`/api/admin/presets/${id}`, {
        method: 'DELETE',
      })
      setPresets((prev) => prev.filter((p) => p.id !== id))
    } catch (error) {
      console.error('Failed to delete preset:', error)
    }
  }

  const providers = Array.from(new Set(presets.map((p) => p.provider)))

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Preset Management</h1>
        <Link href="/admin/presets/create">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Preset
          </Button>
        </Link>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title or slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
        <Select value={providerFilter} onValueChange={setProviderFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Providers</SelectItem>
            {providers.map((provider) => (
              <SelectItem key={provider} value={provider}>
                {provider}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
            <SelectItem value="title">Title A-Z</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading presets...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thumbnail</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead className="text-center">Credits</TableHead>
              <TableHead className="text-center">Generations</TableHead>
              <TableHead>Visibility</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {presets.map((preset) => (
              <TableRow key={preset.id}>
                <TableCell>
                  {preset.thumbnailUrl ? (
                    <img
                      src={preset.thumbnailUrl}
                      alt={preset.title}
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-muted rounded" />
                  )}
                </TableCell>
                <TableCell className="font-medium">{preset.title}</TableCell>
                <TableCell className="text-muted-foreground">
                  {preset.slug}
                </TableCell>
                <TableCell>{preset.provider}</TableCell>
                <TableCell className="text-center">{preset.credits}</TableCell>
                <TableCell className="text-center">
                  <span className="text-muted-foreground">
                    {preset._count?.generations || 0}
                  </span>
                </TableCell>
                <TableCell>
                  <button
                    onClick={() => toggleStatus(preset.id)}
                    className={`text-sm font-medium hover:underline cursor-pointer ${
                      preset.isActive ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {preset.isActive ? 'Visible' : 'Hidden'}
                  </button>
                </TableCell>
                <TableCell>
                  {new Date(preset.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  <div className="flex gap-2">
                    <Link href={`/admin/presets/${preset.id}/edit`}>
                      <Button variant="ghost" size="icon">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePreset(preset.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && presets.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No presets found. Create your first preset to get started.
        </div>
      )}
    </div>
  )
}
