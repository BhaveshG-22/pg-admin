'use client'

import { useClerk, useUser } from '@clerk/nextjs'

export default function UnauthorizedPage() {
  const { signOut } = useClerk()
  const { user } = useUser()

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center space-y-4 px-4">
        <h1 className="text-2xl font-bold">Not authorized</h1>
        <p className="text-gray-500 dark:text-gray-400">
          {user?.primaryEmailAddress?.emailAddress ?? 'This account'} doesn&apos;t
          have access to PixelGlow Admin.
        </p>
        <button
          onClick={() => signOut({ redirectUrl: '/sign-in' })}
          className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium"
        >
          Sign out and use a different account
        </button>
      </div>
    </div>
  )
}
