'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function SignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [founderSpotsRemaining, setFounderSpotsRemaining] = useState<number | null>(null);

  // Check if founder spots are sold out and redirect to waitlist
  useEffect(() => {
    async function checkFounderSpots() {
      try {
        const response = await fetch('/api/waitlist/stats');
        const data = await response.json();
        setFounderSpotsRemaining(data.founderSpotsRemaining);

        // If sold out, redirect to waitlist
        if (data.isSoldOut) {
          router.push('/waitlist');
        }
      } catch (error) {
        console.error('Failed to check founder spots:', error);
      }
    }
    checkFounderSpots();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);

    try {
      // TODO: Add your email collection logic here (e.g., send to backend API, email service, etc.)
      // For now, we'll just log it and redirect
      console.log('New signup:', formData);

      // Store in localStorage for now (you can replace this with actual backend call)
      localStorage.setItem('user_name', formData.name);
      localStorage.setItem('user_email', formData.email);

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (err) {
      setError('Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md">
        {/* Logo/Brand */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-3 mb-4">
            <span className="text-4xl">🤖</span>
            <span className="text-2xl font-bold text-slate-900">RedRide</span>
          </Link>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Join the Alpha
          </h1>
          <p className="text-slate-600">
            {founderSpotsRemaining !== null && founderSpotsRemaining > 0
              ? `Only ${founderSpotsRemaining} founder spot${founderSpotsRemaining !== 1 ? 's' : ''} left for the $59 lifetime deal!`
              : 'Be one of the first 20 users to get the $59 lifetime deal'}
          </p>
        </div>

        {/* Alpha Badge */}
        <div className="bg-gradient-to-r from-orange-500 to-pink-500 text-white text-center py-2 px-4 rounded-full mb-6 text-sm font-semibold">
          🎉 Alpha Access - FREE FOR ONE YEAR
        </div>

        {/* Signup Form */}
        <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="John Doe"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-slate-900"
                disabled={isSubmitting}
              />
            </div>

            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-slate-700 mb-2"
              >
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="john@example.com"
                className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-slate-900"
                disabled={isSubmitting}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full px-6 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-lg font-semibold hover:from-orange-600 hover:to-pink-600 transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Creating your account...
                </span>
              ) : (
                'Get Free Alpha Access →'
              )}
            </button>
          </form>

          {/* Terms */}
          <p className="text-xs text-slate-500 text-center mt-6">
            By signing up, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>

        {/* Benefits */}
        <div className="mt-8 space-y-3">
          <div className="flex items-center gap-3 text-slate-700">
            <span className="text-green-500 text-xl">✓</span>
            <span className="text-sm">No credit card required</span>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <span className="text-green-500 text-xl">✓</span>
            <span className="text-sm font-semibold">Free for One Year</span>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <span className="text-green-500 text-xl">✓</span>
            <span className="text-sm">All features unlocked</span>
          </div>
          <div className="flex items-center gap-3 text-slate-700">
            <span className="text-green-500 text-xl">✓</span>
            <span className="text-sm">Direct founder support</span>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-8">
          <Link
            href="/"
            className="text-slate-600 hover:text-slate-900 text-sm transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </main>
  );
}
