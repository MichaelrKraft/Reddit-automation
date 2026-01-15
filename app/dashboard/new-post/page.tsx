'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import AIContentGenerator from '@/components/AIContentGenerator'
import SubredditAnalysis from '@/components/SubredditAnalysis'
import TopPostsAnalyzer from '@/components/TopPostsAnalyzer'
import OptimalTimingWidget from '@/components/OptimalTimingWidget'
import ImageUpload from '@/components/ImageUpload'
import {
  trackPostCreateStarted,
  trackPostCreateStep,
  trackPostAIGenerate,
  trackPostViralCheck,
  trackPostScheduled,
  trackPostCreateAbandoned
} from '@/lib/analytics'

export default function NewPost() {
  const router = useRouter()
  const [accountId, setAccountId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subredditName: '',
    postType: 'text',
    scheduleNow: true,
    scheduledDate: '',
    scheduledTime: '',
    firstComment: '',
    flairId: '',
    flairText: '',
  })
  const [savingDraft, setSavingDraft] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [flairs, setFlairs] = useState<Array<{ id: string; text: string; backgroundColor: string; textColor: string }>>([])
  const [flairsLoading, setFlairsLoading] = useState(false)
  const [contentMode, setContentMode] = useState<'ai' | 'manual' | null>('manual')

  // Subreddit rules state
  const [rules, setRules] = useState<Array<{ shortName: string; description: string; priority: number; violationReason: string; kind: string }>>([])
  const [rulesLoading, setRulesLoading] = useState(false)
  const [rulesExpanded, setRulesExpanded] = useState(false)

  // Viral analysis states
  const [analyzingTitle, setAnalyzingTitle] = useState(false)
  const [titleAnalysis, setTitleAnalysis] = useState<any>(null)
  const [analyzingBody, setAnalyzingBody] = useState(false)
  const [bodyAnalysis, setBodyAnalysis] = useState<any>(null)

  // Track last completed step for abandonment tracking
  const lastStepRef = useRef(0)
  const postCreatedRef = useRef(false)

  useEffect(() => {
    // Track page load
    trackPostCreateStarted()
    fetchAccount()

    const params = new URLSearchParams(window.location.search)
    const subreddit = params.get('subreddit')
    if (subreddit) {
      setFormData(prev => ({ ...prev, subredditName: subreddit }))
    }

    // Track abandonment on unmount
    return () => {
      if (!postCreatedRef.current && lastStepRef.current > 0) {
        trackPostCreateAbandoned(lastStepRef.current)
      }
    }
  }, [])

  // Track step progression
  useEffect(() => {
    if (formData.subredditName && lastStepRef.current < 1) {
      lastStepRef.current = 1
      trackPostCreateStep(1, { subreddit: formData.subredditName })
    }
    if (formData.title && lastStepRef.current < 2) {
      lastStepRef.current = 2
      trackPostCreateStep(2, { hasTitle: true })
    }
    if (formData.content && lastStepRef.current < 3) {
      lastStepRef.current = 3
      trackPostCreateStep(3, { hasContent: true, postType: formData.postType })
    }
  }, [formData.subredditName, formData.title, formData.content, formData.postType])

  // Fetch flairs when subreddit changes
  useEffect(() => {
    async function fetchFlairs() {
      if (!formData.subredditName || formData.subredditName.length < 2) {
        setFlairs([])
        return
      }

      setFlairsLoading(true)
      try {
        const response = await fetch(`/api/subreddits/${formData.subredditName}/flairs`)
        const data = await response.json()
        if (data.flairs) {
          setFlairs(data.flairs)
        } else {
          setFlairs([])
        }
      } catch (error) {
        console.error('Failed to fetch flairs:', error)
        setFlairs([])
      } finally {
        setFlairsLoading(false)
      }
    }

    // Debounce the fetch
    const timeoutId = setTimeout(fetchFlairs, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.subredditName])

  // Fetch rules when subreddit changes
  useEffect(() => {
    async function fetchRules() {
      if (!formData.subredditName || formData.subredditName.length < 2) {
        setRules([])
        return
      }

      setRulesLoading(true)
      try {
        const response = await fetch(`/api/subreddits/${formData.subredditName}/rules`)
        const data = await response.json()
        if (data.rules) {
          setRules(data.rules)
        } else {
          setRules([])
        }
      } catch (error) {
        console.error('Failed to fetch rules:', error)
        setRules([])
      } finally {
        setRulesLoading(false)
      }
    }

    // Debounce the fetch
    const timeoutId = setTimeout(fetchRules, 500)
    return () => clearTimeout(timeoutId)
  }, [formData.subredditName])

  async function fetchAccount() {
    try {
      const response = await fetch('/api/account')
      const data = await response.json()
      if (data.account) {
        setAccountId(data.account.id)
      }
    } catch (error) {
      console.error('Failed to fetch account:', error)
    }
  }

  async function handleSaveDraft() {
    console.log('Save draft clicked, accountId:', accountId)
    setMessage(null)

    if (!accountId) {
      setMessage({ type: 'error', text: 'No Reddit account found. Please check your .env.local configuration.' })
      return
    }

    if (!formData.title || !formData.content || !formData.subredditName) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (title, content, and subreddit).' })
      return
    }

    setSavingDraft(true)

    try {
      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          subredditName: formData.subredditName,
          accountId,
          postType: formData.postType,
          isDraft: true,
          firstComment: formData.firstComment || null,
          flairId: formData.flairId || null,
          flairText: formData.flairText || null,
        }),
      })

      const data = await postResponse.json()

      if (!postResponse.ok) {
        throw new Error(data.error || 'Failed to save draft')
      }

      setMessage({ type: 'success', text: 'Draft saved successfully! Redirecting to drafts...' })
      setTimeout(() => router.push('/dashboard/drafts'), 1500)
    } catch (error: any) {
      console.error('Save draft error:', error)
      setMessage({ type: 'error', text: `Error: ${error.message}` })
    } finally {
      setSavingDraft(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setMessage(null)

    if (!accountId) {
      setMessage({ type: 'error', text: 'No Reddit account found. Please check your .env.local configuration.' })
      return
    }

    setLoading(true)

    // 30-second timeout to prevent infinite "Creating..." state
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)

    try {
      const postResponse = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          title: formData.title,
          content: formData.content,
          subredditName: formData.subredditName,
          accountId,
          postType: formData.postType,
          firstComment: formData.firstComment || null,
          flairId: formData.flairId || null,
          flairText: formData.flairText || null,
        }),
      })

      if (!postResponse.ok) {
        throw new Error('Failed to create post')
      }

      const { post } = await postResponse.json()

      let scheduledTime = ''
      if (formData.scheduleNow) {
        const scheduleResponse = await fetch('/api/posts/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            postId: post.id,
            scheduledAt: new Date().toISOString(),
          }),
        })

        if (!scheduleResponse.ok) {
          throw new Error('Failed to schedule post')
        }
        scheduledTime = 'immediately'
      } else if (formData.scheduledDate && formData.scheduledTime) {
        const scheduledAt = new Date(`${formData.scheduledDate}T${formData.scheduledTime}`)

        const scheduleResponse = await fetch('/api/posts/schedule', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            postId: post.id,
            scheduledAt: scheduledAt.toISOString(),
          }),
        })

        if (!scheduleResponse.ok) {
          throw new Error('Failed to schedule post')
        }
        scheduledTime = scheduledAt.toLocaleString()
      }

      // Track successful post creation
      postCreatedRef.current = true
      trackPostScheduled(formData.subredditName, scheduledTime || 'immediate')

      const successMsg = scheduledTime
        ? `Post scheduled for ${scheduledTime}! Redirecting to dashboard...`
        : 'Post created successfully! Redirecting to dashboard...'
      setMessage({ type: 'success', text: successMsg })
      setTimeout(() => router.push('/dashboard'), 2000)
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setMessage({ type: 'error', text: 'Request timed out. Your post may have been created - please check the dashboard.' })
      } else {
        setMessage({ type: 'error', text: `Error: ${error.message}` })
      }
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }

  async function analyzeTitle() {
    if (!formData.title.trim()) return
    setAnalyzingTitle(true)
    setTitleAnalysis(null)
    try {
      const response = await fetch('/api/viral/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title.trim(),
          subreddit: formData.subredditName.trim() || 'general',
          postType: formData.postType,
        }),
      })
      const data = await response.json()
      if (response.ok) {
        setTitleAnalysis(data)
        // Track viral analysis
        trackPostViralCheck(data.score || 0, formData.subredditName.trim() || 'general')
      }
    } catch (err) {
      console.error('Title analysis failed:', err)
    } finally {
      setAnalyzingTitle(false)
    }
  }

  async function analyzeBody() {
    if (!formData.content.trim()) return
    setAnalyzingBody(true)
    setBodyAnalysis(null)
    try {
      const response = await fetch('/api/viral/analyze-body', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content.trim(),
          subreddit: formData.subredditName.trim() || 'general',
          postType: 'story',
          generateImproved: true,
        }),
      })
      const data = await response.json()
      if (response.ok) setBodyAnalysis(data)
    } catch (err) {
      console.error('Body analysis failed:', err)
    } finally {
      setAnalyzingBody(false)
    }
  }

  function useSuggestedTitle(title: string) {
    setFormData(prev => ({ ...prev, title }))
    setTitleAnalysis(null)
  }

  function useSuggestedContent(content: string) {
    setFormData(prev => ({ ...prev, content }))
    setBodyAnalysis(null)
  }

  return (
    <>
      <div className="max-w-3xl mx-auto">
        <div className="feature-card rounded-lg p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Subreddit input first - AI Content Generator needs it */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Target Subreddit
              </label>
              <input
                type="text"
                required
                placeholder="e.g., technology"
                value={formData.subredditName}
                onChange={(e) => setFormData(prev => ({ ...prev, subredditName: e.target.value, flairId: '', flairText: '' }))}
                className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Enter subreddit name without "r/" - needed for AI content generation
              </p>
            </div>

            {/* Flair Selector */}
            {formData.subredditName && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Post Flair {flairs.length > 0 && <span className="text-yellow-400 text-xs ml-1">(may be required)</span>}
                </label>
                {flairsLoading ? (
                  <div className="text-gray-400 text-sm">Loading flairs...</div>
                ) : flairs.length > 0 ? (
                  <select
                    value={formData.flairId}
                    onChange={(e) => {
                      const selectedFlair = flairs.find(f => f.id === e.target.value)
                      setFormData(prev => ({
                        ...prev,
                        flairId: e.target.value,
                        flairText: selectedFlair?.text || '',
                      }))
                    }}
                    className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white"
                  >
                    <option value="">Select a flair (optional)</option>
                    {flairs.map((flair) => (
                      <option key={flair.id} value={flair.id}>
                        {flair.text}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="text-gray-500 text-sm">No flairs available for this subreddit</div>
                )}
                {formData.flairId && (
                  <p className="text-xs text-green-400 mt-1">
                    ✓ Flair selected: {formData.flairText}
                  </p>
                )}
              </div>
            )}

            {/* Subreddit Rules Display */}
            {formData.subredditName && (
              <div className="border border-gray-700 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setRulesExpanded(!rulesExpanded)}
                  className="w-full px-4 py-3 flex items-center justify-between bg-[#1a1a24] hover:bg-[#1e1e2a] transition"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-500">📋</span>
                    <span className="text-sm font-medium text-gray-300">
                      Subreddit Rules
                      {rulesLoading ? (
                        <span className="ml-2 text-gray-500">Loading...</span>
                      ) : rules.length > 0 ? (
                        <span className="ml-2 text-gray-500">({rules.length} rules)</span>
                      ) : (
                        <span className="ml-2 text-gray-500">(No rules found)</span>
                      )}
                    </span>
                  </div>
                  <span className={`text-gray-400 transition-transform ${rulesExpanded ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>

                {rulesExpanded && rules.length > 0 && (
                  <div className="px-4 py-3 bg-[#12121a] border-t border-gray-700 space-y-3 max-h-64 overflow-y-auto">
                    <p className="text-xs text-gray-500 mb-2">
                      AI content generation will consider these rules to avoid violations.
                    </p>
                    {rules.map((rule, index) => (
                      <div key={index} className="flex gap-3 text-sm">
                        <span className="text-yellow-500 font-bold shrink-0">{rule.priority}.</span>
                        <div>
                          <span className="font-medium text-white">{rule.shortName}</span>
                          {rule.description && rule.description !== rule.shortName && (
                            <p className="text-gray-400 text-xs mt-0.5">{rule.description}</p>
                          )}
                          {rule.kind !== 'all' && (
                            <span className="inline-block mt-1 text-xs px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded">
                              {rule.kind === 'link' ? 'Links only' : 'Comments only'}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {rulesExpanded && rules.length === 0 && !rulesLoading && (
                  <div className="px-4 py-3 bg-[#12121a] border-t border-gray-700">
                    <p className="text-sm text-gray-500">
                      No rules found for this subreddit, or the subreddit restricts access to rules.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Content Creation Mode Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-3">
                Content Creation Method
              </label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                  contentMode === 'manual'
                    ? 'bg-[#00D9FF]/20 border border-[#00D9FF] text-[#00D9FF]'
                    : 'bg-[#12121a] border border-gray-600 text-gray-300 hover:border-gray-500'
                }`}>
                  <input
                    type="radio"
                    checked={contentMode === 'manual'}
                    onChange={() => setContentMode('manual')}
                    className="sr-only"
                  />
                  <span className="font-medium">Custom Post</span>
                </label>
                <label className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer transition ${
                  contentMode === 'ai'
                    ? 'bg-[#00D9FF]/20 border border-[#00D9FF] text-[#00D9FF]'
                    : 'bg-[#12121a] border border-gray-600 text-gray-300 hover:border-gray-500'
                }`}>
                  <input
                    type="radio"
                    checked={contentMode === 'ai'}
                    onChange={() => setContentMode('ai')}
                    className="sr-only"
                  />
                  <span className="font-medium">AI Content Generator</span>
                </label>
              </div>
            </div>

            {/* Conditional: AI Content Generator */}
            {contentMode === 'ai' && (
              <AIContentGenerator
                subreddit={formData.subredditName}
                onSelectContent={(title, content) => {
                  // Track AI content generation
                  trackPostAIGenerate(formData.subredditName || 'unknown')
                  setFormData(prev => ({ ...prev, title, content }))
                }}
                subredditRules={rules.map(r => ({
                  shortName: r.shortName,
                  description: r.description,
                  priority: r.priority,
                }))}
              />
            )}

            {formData.subredditName && (
              <SubredditAnalysis subreddit={formData.subredditName} />
            )}

            {formData.subredditName && (
              <TopPostsAnalyzer
                subreddit={formData.subredditName}
                onSelectPost={(title, content) => {
                  setFormData(prev => ({ ...prev, title, content }))
                }}
              />
            )}

            {formData.subredditName && (
              <OptimalTimingWidget
                subreddit={formData.subredditName}
                onSelectTime={(time) => {
                  const date = time.toISOString().split('T')[0]
                  const timeStr = time.toTimeString().slice(0, 5)
                  setFormData(prev => ({
                    ...prev,
                    scheduleNow: false,
                    scheduledDate: date,
                    scheduledTime: timeStr,
                  }))
                }}
              />
            )}

            {/* Conditional: Manual Post Type Selection */}
            {contentMode === 'manual' && (
              <>
                <div className="border-t border-gray-700 pt-6">
                  <h3 className="text-lg font-semibold text-white mb-4">Post Details</h3>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Post Type
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center text-gray-300">
                      <input
                        type="radio"
                        value="text"
                        checked={formData.postType === 'text'}
                        onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                        className="mr-2"
                      />
                      Text Post
                    </label>
                    <label className="flex items-center text-gray-300">
                      <input
                        type="radio"
                        value="link"
                        checked={formData.postType === 'link'}
                        onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                        className="mr-2"
                      />
                      Link Post
                    </label>
                    <label className="flex items-center text-gray-300">
                      <input
                        type="radio"
                        value="image"
                        checked={formData.postType === 'image'}
                        onChange={(e) => setFormData(prev => ({ ...prev, postType: e.target.value }))}
                        className="mr-2"
                      />
                      Image Post
                    </label>
                  </div>
                </div>
              </>
            )}

            {/* Show Title/Content/Scheduling for Custom Post mode, or AI mode after content is generated */}
            {(contentMode === 'manual' || (contentMode === 'ai' && formData.title)) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter post title"
                  value={formData.title}
                  onChange={(e) => { setFormData(prev => ({ ...prev, title: e.target.value })); setTitleAnalysis(null); }}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
                />

                {/* Analyze Viral Potential - Title (Manual mode only) */}
                {contentMode === 'manual' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">New</span>
                    <button
                      type="button"
                      onClick={analyzeTitle}
                      disabled={analyzingTitle || !formData.title.trim()}
                      className="text-sm px-4 py-2 bg-transparent border border-orange-500 text-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/10 transition disabled:opacity-50 shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                    >
                      {analyzingTitle ? 'Analyzing...' : '+ Analyze Viral Potential'}
                    </button>
                  </div>
                )}

                {/* Title Analysis Results */}
                {titleAnalysis && contentMode === 'manual' && (
                  <div className="mt-3 p-4 bg-[#1a1a24] border border-gray-700 rounded-lg space-y-3">
                    <div className="relative group">
                      <div className="flex items-center justify-between cursor-help">
                        <span className="text-sm font-medium text-white">Viral Score <span className="text-xs text-gray-500">(hover for breakdown)</span></span>
                        <span className={`text-2xl font-bold ${
                          titleAnalysis.score >= 70 ? 'text-green-400' :
                          titleAnalysis.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{titleAnalysis.score}/100</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full transition-all ${
                            titleAnalysis.score >= 70 ? 'bg-green-500' :
                            titleAnalysis.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${titleAnalysis.score}%` }}
                        />
                      </div>
                      {/* Score Breakdown Tooltip */}
                      {titleAnalysis.breakdown && (
                        <div className="absolute left-0 right-0 top-full mt-2 p-4 bg-[#12121a] border border-gray-600 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <p className="text-sm font-semibold text-white mb-3">Score Breakdown</p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'titleLength', label: 'Title Length', hint: 'Optimal: 8-15 words' },
                              { key: 'firstPerson', label: 'First-Person', hint: '35% of viral posts use I/my/me' },
                              { key: 'questionFormat', label: 'Statement vs Question', hint: 'Statements get more upvotes' },
                              { key: 'punctuation', label: 'Punctuation', hint: 'Quotes and ellipsis boost engagement' },
                              { key: 'capitalization', label: 'Capitalization', hint: 'Sentence case is best' },
                              { key: 'wordSimplicity', label: 'Word Simplicity', hint: 'Avg 4.75 chars/word' },
                              { key: 'powerWords', label: 'Power Words', hint: 'you, people, just, never, realized' },
                              { key: 'semanticTheme', label: 'Clear Theme', hint: 'Relationship, advice, work, discovery' },
                            ].map(({ key, label, hint }) => {
                              const score = titleAnalysis.breakdown[key] || 0
                              return (
                                <div key={key} className="p-2 bg-[#1a1a24] rounded border border-gray-700">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-white">{label}</span>
                                    <span className={`text-xs font-bold ${
                                      score >= 70 ? 'text-green-400' :
                                      score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{score}%</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        score >= 70 ? 'bg-green-500' :
                                        score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-gray-500 mt-1">{hint}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {titleAnalysis.suggestions?.length > 0 && (
                      <div className="text-xs text-gray-400">
                        <p className="font-medium text-gray-300 mb-1">Suggestions:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {titleAnalysis.suggestions.slice(0, 3).map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {titleAnalysis.improvedTitles?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-300">AI Alternatives:</p>
                        {titleAnalysis.improvedTitles.slice(0, 2).map((alt: string, i: number) => (
                          <div
                            key={i}
                            onClick={() => useSuggestedTitle(alt)}
                            className="p-2 bg-gray-800 rounded text-sm text-gray-300 cursor-pointer hover:bg-gray-700 transition"
                          >
                            {alt}
                            <span className="text-purple-400 text-xs ml-2">Use →</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Image Upload - only for image posts in manual mode */}
            {contentMode === 'manual' && formData.postType === 'image' && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Upload Image
                </label>
                <ImageUpload
                  currentUrl={formData.content}
                  onUpload={(url) => setFormData(prev => ({ ...prev, content: url }))}
                />
              </div>
            )}

            {/* Content/URL field - for text and link posts in Custom mode, or AI mode after content is generated */}
            {((contentMode === 'manual' && formData.postType !== 'image') || (contentMode === 'ai' && formData.title)) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  {contentMode === 'ai' ? 'Content' : (formData.postType === 'text' ? 'Content' : 'URL')}
                </label>
                <textarea
                  required
                  rows={contentMode === 'ai' ? 6 : (formData.postType === 'text' ? 6 : 2)}
                  placeholder={
                    contentMode === 'ai'
                      ? 'AI-generated content will appear here, or enter your own'
                      : (formData.postType === 'text' ? 'Enter post content' : 'Paste your YouTube URL')
                  }
                  value={formData.content}
                  onChange={(e) => { setFormData(prev => ({ ...prev, content: e.target.value })); setBodyAnalysis(null); }}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
                />

                {/* Analyze Viral Potential - Body (Manual text posts only) */}
                {contentMode === 'manual' && formData.postType === 'text' && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-xs font-bold text-orange-400 uppercase tracking-wide">New</span>
                    <button
                      type="button"
                      onClick={analyzeBody}
                      disabled={analyzingBody || !formData.content.trim()}
                      className="text-sm px-4 py-2 bg-transparent border border-orange-500 text-[#00D9FF] rounded-lg hover:bg-[#00D9FF]/10 transition disabled:opacity-50 shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                    >
                      {analyzingBody ? 'Analyzing...' : '+ Analyze Viral Potential'}
                    </button>
                  </div>
                )}

                {/* Body Analysis Results */}
                {bodyAnalysis && contentMode === 'manual' && formData.postType === 'text' && (
                  <div className="mt-3 p-4 bg-[#1a1a24] border border-gray-700 rounded-lg space-y-3">
                    <div className="relative group">
                      <div className="flex items-center justify-between cursor-help">
                        <span className="text-sm font-medium text-white">Body Copy Score <span className="text-xs text-gray-500">(hover for breakdown)</span></span>
                        <span className={`text-2xl font-bold ${
                          bodyAnalysis.score >= 70 ? 'text-green-400' :
                          bodyAnalysis.score >= 40 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{bodyAnalysis.score}/100</span>
                      </div>
                      <div className="h-2 bg-gray-700 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full transition-all ${
                            bodyAnalysis.score >= 70 ? 'bg-green-500' :
                            bodyAnalysis.score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${bodyAnalysis.score}%` }}
                        />
                      </div>
                      {/* Score Breakdown Tooltip */}
                      {bodyAnalysis.breakdown && (
                        <div className="absolute left-0 right-0 top-full mt-2 p-4 bg-[#12121a] border border-gray-600 rounded-lg shadow-xl z-50 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                          <p className="text-sm font-semibold text-white mb-3">Score Breakdown</p>
                          <div className="grid grid-cols-2 gap-3">
                            {[
                              { key: 'openingHook', label: 'Opening Hook', hint: 'Strong emotional/context opener' },
                              { key: 'storyStructure', label: 'Story Structure', hint: 'Beginning, conflict, resolution' },
                              { key: 'paragraphFlow', label: 'Paragraph Flow', hint: 'Well-paced paragraph breaks' },
                              { key: 'emotionalTriggers', label: 'Emotional Triggers', hint: 'Relatable reactions and feelings' },
                              { key: 'dialogueUsage', label: 'Dialogue Usage', hint: 'Quoted conversations add life' },
                              { key: 'lengthOptimization', label: 'Length', hint: 'Optimal word count for subreddit' },
                              { key: 'formatting', label: 'Formatting', hint: 'Readable structure and spacing' },
                            ].map(({ key, label, hint }) => {
                              const score = bodyAnalysis.breakdown[key] || 0
                              return (
                                <div key={key} className="p-2 bg-[#1a1a24] rounded border border-gray-700">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-medium text-white">{label}</span>
                                    <span className={`text-xs font-bold ${
                                      score >= 70 ? 'text-green-400' :
                                      score >= 40 ? 'text-yellow-400' : 'text-red-400'
                                    }`}>{score}%</span>
                                  </div>
                                  <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                    <div
                                      className={`h-full ${
                                        score >= 70 ? 'bg-green-500' :
                                        score >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                                      }`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <p className="text-[10px] text-gray-500 mt-1">{hint}</p>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    {bodyAnalysis.detectedPattern && (
                      <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-400 rounded text-xs">
                        Detected: {bodyAnalysis.detectedPattern} pattern
                      </span>
                    )}
                    {bodyAnalysis.suggestions?.length > 0 && (
                      <div className="text-xs text-gray-400">
                        <p className="font-medium text-gray-300 mb-1">Suggestions:</p>
                        <ul className="list-disc list-inside space-y-0.5">
                          {bodyAnalysis.suggestions.slice(0, 3).map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {bodyAnalysis.improvedVersions?.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-medium text-gray-300">AI Improved Version:</p>
                        <div
                          onClick={() => useSuggestedContent(bodyAnalysis.improvedVersions[0])}
                          className="p-2 bg-gray-800 rounded text-xs text-gray-300 cursor-pointer hover:bg-gray-700 transition max-h-32 overflow-y-auto"
                        >
                          <pre className="whitespace-pre-wrap font-sans">{bodyAnalysis.improvedVersions[0].substring(0, 300)}...</pre>
                          <span className="text-purple-400 text-xs mt-2 inline-block">Use this version →</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* First Comment - only for image and link posts in manual mode */}
            {contentMode === 'manual' && (formData.postType === 'image' || formData.postType === 'link') && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  First Comment (optional)
                </label>
                <textarea
                  rows={4}
                  placeholder="Add context, details, or your pitch here. This will be automatically posted as the first comment on your post."
                  value={formData.firstComment}
                  onChange={(e) => setFormData(prev => ({ ...prev, firstComment: e.target.value }))}
                  className="w-full px-4 py-2 border border-gray-600 bg-[#12121a] rounded-lg focus:ring-2 focus:ring-reddit-orange focus:border-transparent text-white placeholder-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  💡 Pro tip: Many Redditors put their detailed explanation in the first comment rather than the title
                </p>
              </div>
            )}

            {/* Scheduling - show for Custom Post mode, or AI mode after content is generated */}
            {(contentMode === 'manual' || (contentMode === 'ai' && formData.title)) && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Scheduling
                </label>
                <div className="space-y-3">
                  <label className="flex items-center text-gray-300">
                    <input
                      type="radio"
                      checked={formData.scheduleNow}
                      onChange={() => setFormData(prev => ({ ...prev, scheduleNow: true }))}
                      className="mr-2"
                    />
                    Post immediately
                  </label>
                  <label className="flex items-center text-gray-300">
                    <input
                      type="radio"
                      checked={!formData.scheduleNow}
                      onChange={() => setFormData(prev => ({ ...prev, scheduleNow: false }))}
                      className="mr-2"
                    />
                    Schedule for later
                  </label>
                </div>

                {!formData.scheduleNow && (
                  <div className="mt-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Date</label>
                      <input
                        type="date"
                        required
                        value={formData.scheduledDate}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledDate: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Time</label>
                      <input
                        type="time"
                        required
                        value={formData.scheduledTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, scheduledTime: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-600 bg-[#12121a] rounded-lg text-white"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Inline Message Display */}
            {message && (
              <div className={`p-4 rounded-lg ${
                message.type === 'success'
                  ? 'bg-green-900/50 text-green-300 border border-green-700'
                  : 'bg-red-900/50 text-red-300 border border-red-700'
              }`}>
                {message.text}
              </div>
            )}

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                disabled={loading || savingDraft}
                className="flex-1 bg-[#00D9FF] text-black px-6 py-3 rounded-lg hover:bg-[#00D9FF]/80 transition disabled:opacity-50 font-semibold"
              >
                {loading ? 'Creating...' : 'Create Post'}
              </button>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={savingDraft || loading || !formData.title || !formData.content || !formData.subredditName}
                className="flex-1 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition disabled:opacity-50 font-semibold"
              >
                {savingDraft ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-[#00D9FF] border-t-transparent rounded-full animate-spin"></span>
                    Saving...
                  </span>
                ) : (
                  'Save Draft'
                )}
              </button>
              <Link
                href="/dashboard/drafts"
                className="flex-1 bg-gradient-to-r from-[#00D9FF]/20 to-cyan-600/20 text-[#00D9FF] border border-[#00D9FF]/50 px-6 py-3 rounded-lg hover:bg-[#00D9FF]/30 transition text-center font-semibold"
              >
                Drafts
              </Link>
            </div>

            {/* Cancel Button - Below action buttons */}
            <div className="pt-4 border-t border-gray-700 mt-4">
              <Link
                href="/dashboard"
                className="block w-full px-6 py-3 border border-gray-600 text-gray-300 rounded-lg hover:bg-gray-700 transition text-center"
              >
                Cancel
              </Link>
            </div>
          </form>
        </div>
      </div>

      <div className="text-center mt-8">
        <Link href="/" className="text-gray-400 hover:text-white transition">
          ← Back to Home
        </Link>
      </div>
    </>
  )
}
