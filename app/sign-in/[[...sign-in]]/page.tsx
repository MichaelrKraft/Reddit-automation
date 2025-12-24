import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bg-primary">
      <div className="dot-grid-background"><div className="dot-grid"></div></div>
      <div className="relative z-10">
        <div className="text-center mb-8">
          <img src="/reddride-logo-dark.png" alt="ReddRide" className="h-20 mx-auto mb-4" />
          <p className="text-text-secondary">Sign in to your account</p>
        </div>
        <SignIn appearance={{
          elements: {
            formButtonPrimary: 'bg-orange-500 hover:bg-orange-600',
            card: 'bg-gray-900 border border-gray-700',
            headerTitle: 'text-white',
            headerSubtitle: 'text-gray-400',
            socialButtonsBlockButton: 'bg-gray-800 border-gray-600 text-white hover:bg-gray-700',
            formFieldLabel: 'text-gray-300',
            formFieldInput: 'bg-gray-800 border-gray-600 text-white',
            footerActionLink: 'text-orange-400 hover:text-orange-300',
            // OTP code input styling
            otpCodeFieldInput: 'bg-gray-800 border-gray-600 text-white text-center text-xl',
            otpCodeField: 'gap-2',
            // Additional input styling
            formFieldInputShowPasswordButton: 'text-gray-400 hover:text-white',
            identityPreviewEditButton: 'text-orange-400 hover:text-orange-300',
            formResendCodeLink: 'text-orange-400 hover:text-orange-300',
          }
        }} />
      </div>
    </div>
  )
}
