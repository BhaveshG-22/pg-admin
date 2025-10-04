'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, ExternalLink, User as UserIcon } from 'lucide-react'
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

interface Generation {
  id: string
  status: string
  creditsUsed: number
  createdAt: string
  outputUrl: string | null
  user: {
    id: string
    name: string
    email: string
    avatar: string | null
    tier: string
  }
  preset: {
    id: string
    title: string
    slug: string
  }
  results: Array<{
    url: string
    thumbnailUrl: string
  }>
}

export default function GenerationsListPage() {
  const [generations, setGenerations] = useState<Generation[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')

  useEffect(() => {
    fetchGenerations()
  }, [search, statusFilter, sortBy])

  const fetchGenerations = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter !== 'all') params.set('status', statusFilter)
      params.set('sort', sortBy)

      const res = await fetch(`/api/admin/generations?${params}`)
      const data = await res.json()

      if (Array.isArray(data)) {
        console.log('First generation data:', data[0])
        setGenerations(data)
      } else {
        console.error('Invalid response:', data)
        setGenerations([])
      }
    } catch (error) {
      console.error('Failed to fetch generations:', error)
      setGenerations([])
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600'
      case 'FAILED':
        return 'text-red-600'
      case 'RUNNING':
        return 'text-blue-600'
      case 'QUEUED':
      case 'PENDING':
        return 'text-yellow-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <div className="container mx-auto py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Generations</h1>
        <p className="text-muted-foreground mt-2">
          View all image generations across the platform
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by user email/name or preset..."
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
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
            <SelectItem value="RUNNING">Running</SelectItem>
            <SelectItem value="QUEUED">Queued</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest</SelectItem>
            <SelectItem value="oldest">Oldest</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-10">Loading generations...</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Preset</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {generations.map((gen) => (
              <TableRow key={gen.id}>
                <TableCell>
                  {gen.results[0]?.thumbnailUrl || gen.results[0]?.url || gen.outputUrl ? (
                    <a
                      href={gen.results[0]?.url || gen.outputUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <img
                        src={gen.results[0]?.thumbnailUrl || gen.results[0]?.url || gen.outputUrl || ''}
                        alt="Generated"
                        className="w-16 h-16 object-cover rounded hover:opacity-80 transition-opacity cursor-pointer"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.parentElement!.innerHTML = '<div class="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">No Image</div>'
                        }}
                      />
                    </a>
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-xs">
                      No Image
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/users/${gen.user.id}`}
                    className="hover:underline"
                  >
                    <div className="flex items-center gap-3">
                      {gen.user.avatar ? (
                        <img
                          src={gen.user.avatar}
                          alt={gen.user.name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <div className="font-medium">{gen.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {gen.user.email}
                        </div>
                      </div>
                    </div>
                  </Link>
                </TableCell>
                <TableCell>
                  <Link
                    href={`/admin/presets/${gen.preset.id}`}
                    className="hover:underline"
                  >
                    {gen.preset.title}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className={getStatusColor(gen.status)}>
                    {gen.status}
                  </span>
                </TableCell>
                <TableCell>{gen.creditsUsed}</TableCell>
                <TableCell>
                  {new Date(gen.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {gen.results[0]?.url && (
                    <Button variant="ghost" size="icon" asChild>
                      <a
                        href={gen.results[0].url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {!loading && generations.length === 0 && (
        <div className="text-center py-10 text-muted-foreground">
          No generations found.
        </div>
      )}
    </div>
  )
}
