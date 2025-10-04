'use client'

import { useEffect, useState } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { User, ArrowLeft, ExternalLink, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface UserDetail {
  id: string
  name: string
  email: string
  avatar: string | null
  credits: number
  totalCreditsUsed: number
  tier: string
  createdAt: string
  updatedAt: string
  _count: {
    generations: number
    images: number
  }
  generations: Array<{
    id: string
    status: string
    creditsUsed: number
    createdAt: string
    preset: {
      title: string
      slug: string
    }
    results: Array<{
      url: string
      thumbnailUrl: string
    }>
  }>
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creditAction, setCreditAction] = useState('add')
  const [creditAmount, setCreditAmount] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [id])

  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/admin/users/${id}`)
      const data = await res.json()
      setUser(data)
    } catch (err) {
      console.error('Failed to fetch user:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateCredits = async () => {
    const amount = parseInt(creditAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Please enter a valid amount')
      return
    }

    setUpdating(true)
    try {
      const res = await fetch(`/api/admin/users/${id}/credits`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credits: amount,
          action: creditAction,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Failed to update credits')
      }

      const updatedUser = await res.json()
      setUser((prev) => (prev ? { ...prev, credits: updatedUser.credits } : null))
      setDialogOpen(false)
      setCreditAmount('')
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update credits')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">Loading user...</div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto py-10">
        <div className="text-center">User not found</div>
      </div>
    )
  }

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PRO':
        return 'text-blue-600'
      case 'ENTERPRISE':
        return 'text-purple-600'
      default:
        return 'text-gray-600'
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
      default:
        return 'text-yellow-600'
    }
  }

  return (
    <div className="container mx-auto py-10 max-w-6xl">
      <div className="mb-8">
        <Link href="/admin/users">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Button>
        </Link>
        <div className="flex items-start gap-4">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-20 h-20 rounded-full"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
              <User className="h-10 w-10 text-muted-foreground" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground mt-1">{user.email}</p>
            <span className={`${getTierColor(user.tier)} font-medium mt-2 inline-block`}>
              {user.tier}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Credits Available</CardTitle>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Update User Credits</DialogTitle>
                  <DialogDescription>
                    Manage credits for {user.name}. Current balance: {user.credits} credits
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="action">Action</Label>
                    <Select value={creditAction} onValueChange={setCreditAction}>
                      <SelectTrigger id="action">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Credits</SelectItem>
                        <SelectItem value="subtract">Subtract Credits</SelectItem>
                        <SelectItem value="set">Set to Exact Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount</Label>
                    <Input
                      id="amount"
                      type="number"
                      min="0"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      placeholder="Enter amount"
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                    disabled={updating}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateCredits} disabled={updating}>
                    {updating ? 'Updating...' : 'Update Credits'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{user.credits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Credits Used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{user.totalCreditsUsed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Generations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-bold">{user._count.generations}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Account Details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">
              {new Date(user.createdAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(user.updatedAt).toLocaleDateString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Images Uploaded</p>
            <p className="font-medium">{user._count.images}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Recent Generations</CardTitle>
            <Link href={`/admin/generations?userId=${user.id}`}>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {user.generations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No generations yet
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Image</TableHead>
                  <TableHead>Preset</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {user.generations.map((gen) => (
                  <TableRow key={gen.id}>
                    <TableCell>
                      {gen.results[0]?.thumbnailUrl ? (
                        <a
                          href={gen.results[0].url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <img
                            src={gen.results[0].thumbnailUrl}
                            alt="Generated"
                            className="w-16 h-16 object-cover rounded hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </a>
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded" />
                      )}
                    </TableCell>
                    <TableCell>{gen.preset.title}</TableCell>
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
        </CardContent>
      </Card>
    </div>
  )
}
