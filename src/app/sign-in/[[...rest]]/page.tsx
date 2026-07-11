import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md px-4">
        <h1 className="text-2xl font-bold text-center mb-6">PixelGlow Admin</h1>
        <SignIn fallbackRedirectUrl="/admin/presets" signUpUrl="/sign-in" />
      </div>
    </div>
  )
}
