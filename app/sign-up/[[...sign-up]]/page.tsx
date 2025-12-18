import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="dot-grid-background"><div className="dot-grid"></div></div>
      <div className="relative z-10">
        <div className="text-center mb-8">
          <img src="/reddride-logo-dark.png" alt="ReddRide" className="h-20 mx-auto mb-4" />
          <p className="text-text-secondary">Create your account</p>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 mb-4 max-w-sm mx-auto">
          <p className="text-gray-300 text-sm font-medium mb-2">Password requirements:</p>
          <ul className="text-gray-400 text-xs space-y-1">
            <li>• At least 8 characters</li>
            <li>• Use a unique phrase (e.g., "MyReddit2024!")</li>
            <li>• Avoid common passwords</li>
          </ul>
        </div>
        <SignUp appearance={{
          elements: {
            formButtonPrimary: 'bg-orange-500 hover:bg-orange-600',
            card: 'bg-gray-900 border border-gray-700',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
            formFieldLabel: 'text-gray-300',
            formFieldInput: 'bg-gray-800 border-gray-600 text-white',
            footerActionLink: 'text-orange-400 hover:text-orange-300',
          }
        }} />
      </div>
    </div>
  )
}
