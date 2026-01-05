/**
 * Viral Headline Optimizer Scoring Library
 * Based on analysis of 4,944 viral Reddit posts
 *
 * Scoring Weights:
 * - Title Length: 20%
 * - First-Person Usage: 15%
 * - Question Format: 10%
 * - Punctuation Patterns: 10%
 * - Capitalization: 5%
 * - Word Simplicity: 15%
 * - Power Words: 15%
 * - Semantic Theme: 10%
 */

export interface ScoreBreakdown {
  titleLength: number
  firstPerson: number
  questionFormat: number
  punctuation: number
  capitalization: number
  wordSimplicity: number
  powerWords: number
  semanticTheme: number
}

export interface ViralAnalysisResult {
  score: number
  tier: 'ultra-viral' | 'highly-viral' | 'moderately-viral' | 'low-viral'
  breakdown: ScoreBreakdown
  suggestions: string[]
  expectedPerformance: {
    avgScore: number
    description: string
  }
}

// Power words that appear more frequently in viral posts
const POWER_WORDS = {
  directAddress: ['you', 'your', "you're", 'yourself'],
  universal: ['people', 'everyone', 'anyone', 'someone', 'nobody', 'everybody'],
  minimizing: ['just', 'only', 'simply', 'actually'],
  absolutes: ['never', 'always', 'every', 'none', 'all', 'nothing'],
  transformation: ['but', 'finally', 'realized', 'until', 'then', 'now', 'after', 'before'],
  emotional: ['love', 'hate', 'amazing', 'terrible', 'best', 'worst', 'incredible'],
  social: ['friend', 'family', 'wife', 'husband', 'mom', 'dad', 'boss', 'coworker'],
}

// First-person indicators
const FIRST_PERSON_WORDS = ['i', 'my', 'me', 'mine', "i'm", "i've", "i'll", "i'd", 'myself']

// Subreddit-specific optimal configurations
const SUBREDDIT_CONFIGS: Record<string, {
  optimalTitleLength: { min: number; max: number; sweet: number }
  firstPersonBonus: number
  questionPenalty: number
}> = {
  funny: { optimalTitleLength: { min: 3, max: 8, sweet: 6 }, firstPersonBonus: 0, questionPenalty: 0 },
  showerthoughts: { optimalTitleLength: { min: 15, max: 25, sweet: 21 }, firstPersonBonus: 10, questionPenalty: 0 },
  amitheasshole: { optimalTitleLength: { min: 10, max: 20, sweet: 15 }, firstPersonBonus: 20, questionPenalty: 0 },
  tifu: { optimalTitleLength: { min: 8, max: 15, sweet: 12 }, firstPersonBonus: 20, questionPenalty: 10 },
  askreddit: { optimalTitleLength: { min: 5, max: 15, sweet: 10 }, firstPersonBonus: 0, questionPenalty: -20 },
  todayilearned: { optimalTitleLength: { min: 15, max: 30, sweet: 22 }, firstPersonBonus: -5, questionPenalty: 10 },
  lifeprotips: { optimalTitleLength: { min: 8, max: 20, sweet: 14 }, firstPersonBonus: 5, questionPenalty: 5 },
}

// Default config for unknown subreddits
const DEFAULT_CONFIG = {
  optimalTitleLength: { min: 8, max: 15, sweet: 12 },
  firstPersonBonus: 10,
  questionPenalty: 5,
}

/**
 * Get subreddit-specific viral optimization config
 * Used by AI generation to optimize for specific communities
 */
export function getSubredditViralConfig(subredditName: string) {
  const normalized = subredditName.toLowerCase().replace(/^r\//, '')
  const config = SUBREDDIT_CONFIGS[normalized] || DEFAULT_CONFIG

  return {
    subreddit: normalized,
    titleLength: config.optimalTitleLength,
    useFirstPerson: config.firstPersonBonus > 0,
    firstPersonBonus: config.firstPersonBonus,
    useQuestions: config.questionPenalty < 0, // negative penalty means questions help
    questionPenalty: config.questionPenalty,
  }
}

/**
 * Count words in a title
 */
function countWords(title: string): number {
  return title.trim().split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Calculate average word length
 */
function averageWordLength(title: string): number {
  const words = title.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return 0
  const totalChars = words.reduce((sum, word) => sum + word.replace(/[^a-zA-Z]/g, '').length, 0)
  return totalChars / words.length
}

/**
 * Estimate syllables in a word (simplified)
 */
function countSyllables(word: string): number {
  const cleaned = word.toLowerCase().replace(/[^a-z]/g, '')
  if (cleaned.length <= 3) return 1

  const vowelGroups = cleaned.match(/[aeiouy]+/g) || []
  let count = vowelGroups.length

  // Adjust for silent e
  if (cleaned.endsWith('e') && count > 1) count--

  // Minimum 1 syllable
  return Math.max(1, count)
}

/**
 * Calculate average syllables per word
 */
function averageSyllablesPerWord(title: string): number {
  const words = title.trim().split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return 0
  const totalSyllables = words.reduce((sum, word) => sum + countSyllables(word), 0)
  return totalSyllables / words.length
}

/**
 * Check for first-person usage
 */
function hasFirstPerson(title: string): boolean {
  const words = title.toLowerCase().split(/\s+/)
  return words.some(word => FIRST_PERSON_WORDS.includes(word.replace(/[^a-z']/g, '')))
}

/**
 * Check if title is a question
 */
function isQuestion(title: string): boolean {
  return title.trim().endsWith('?')
}

/**
 * Detect capitalization style
 */
function getCapitalizationStyle(title: string): 'sentence' | 'title' | 'all-caps' | 'mixed' {
  const words = title.split(/\s+/)
  const allCaps = words.filter(w => w === w.toUpperCase() && /[A-Z]/.test(w)).length
  const titleCase = words.filter((w, i) => i > 0 && w[0] === w[0]?.toUpperCase() && w.slice(1) === w.slice(1)?.toLowerCase()).length

  if (allCaps === words.length) return 'all-caps'
  if (titleCase > words.length * 0.5) return 'title'
  if (allCaps > words.length * 0.3) return 'mixed'
  return 'sentence'
}

/**
 * Count power words in title
 */
function countPowerWords(title: string): { count: number; categories: string[] } {
  const words = title.toLowerCase().split(/\s+/).map(w => w.replace(/[^a-z']/g, ''))
  const found: string[] = []
  let count = 0

  for (const [category, powerList] of Object.entries(POWER_WORDS)) {
    for (const powerWord of powerList) {
      if (words.includes(powerWord)) {
        count++
        if (!found.includes(category)) {
          found.push(category)
        }
      }
    }
  }

  return { count, categories: found }
}

/**
 * Detect punctuation patterns
 */
function analyzePunctuation(title: string): {
  hasQuotes: boolean
  hasEllipsis: boolean
  hasExclamation: boolean
  hasColon: boolean
} {
  return {
    hasQuotes: /["']/.test(title),
    hasEllipsis: /\.{3}|…/.test(title),
    hasExclamation: /!/.test(title),
    hasColon: /:/.test(title),
  }
}

/**
 * Detect semantic theme
 */
function detectTheme(title: string): string | null {
  const lower = title.toLowerCase()

  const themes: Record<string, string[]> = {
    'relationship': ['wife', 'husband', 'boyfriend', 'girlfriend', 'partner', 'dating', 'marriage', 'friend', 'family', 'mom', 'dad', 'son', 'daughter'],
    'advice': ['should', 'help', 'need', 'advice', 'tip', 'how to', 'recommend', 'suggest'],
    'work': ['job', 'boss', 'coworker', 'work', 'career', 'salary', 'interview', 'hired', 'fired', 'office'],
    'discovery': ['learned', 'found', 'discovered', 'realized', 'til', 'today i'],
    'personal': ['i think', 'i feel', 'i believe', 'my opinion', 'imo', 'unpopular opinion'],
  }

  for (const [theme, keywords] of Object.entries(themes)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return theme
    }
  }

  return null
}

/**
 * Calculate the viral score for a headline
 */
export function calculateViralScore(
  title: string,
  subreddit?: string,
  postType: 'text' | 'image' | 'video' | 'link' = 'text'
): ViralAnalysisResult {
  const normalizedSubreddit = subreddit?.toLowerCase().replace(/^r\//, '') || ''
  const config = SUBREDDIT_CONFIGS[normalizedSubreddit] || DEFAULT_CONFIG

  const wordCount = countWords(title)
  const avgWordLen = averageWordLength(title)
  const avgSyllables = averageSyllablesPerWord(title)
  const firstPerson = hasFirstPerson(title)
  const question = isQuestion(title)
  const capStyle = getCapitalizationStyle(title)
  const powerWordResult = countPowerWords(title)
  const punctuation = analyzePunctuation(title)
  const theme = detectTheme(title)

  const breakdown: ScoreBreakdown = {
    titleLength: 0,
    firstPerson: 0,
    questionFormat: 0,
    punctuation: 0,
    capitalization: 0,
    wordSimplicity: 0,
    powerWords: 0,
    semanticTheme: 0,
  }

  // 1. Title Length Score (20% weight, max 100 points)
  const { min, max, sweet } = config.optimalTitleLength
  if (wordCount >= min && wordCount <= max) {
    const distanceFromSweet = Math.abs(wordCount - sweet)
    const maxDistance = Math.max(sweet - min, max - sweet)
    breakdown.titleLength = Math.round(100 - (distanceFromSweet / maxDistance) * 30)
  } else if (wordCount < min) {
    breakdown.titleLength = Math.max(0, 50 - (min - wordCount) * 10)
  } else {
    breakdown.titleLength = Math.max(0, 50 - (wordCount - max) * 5)
  }

  // 2. First-Person Usage Score (15% weight)
  if (firstPerson) {
    breakdown.firstPerson = 80 + config.firstPersonBonus
  } else {
    breakdown.firstPerson = 50 - config.firstPersonBonus
  }
  breakdown.firstPerson = Math.max(0, Math.min(100, breakdown.firstPerson))

  // 3. Question Format Score (10% weight)
  // Research: Viral posts use 23% FEWER question marks
  // Questions drive comments but may reduce upvotes
  if (question) {
    breakdown.questionFormat = 70 - config.questionPenalty
  } else {
    breakdown.questionFormat = 75 + config.questionPenalty
  }
  breakdown.questionFormat = Math.max(0, Math.min(100, breakdown.questionFormat))

  // 4. Punctuation Patterns Score (10% weight)
  let punctScore = 60
  if (punctuation.hasQuotes) punctScore += 15  // +5% more common in viral
  if (punctuation.hasEllipsis) punctScore += 10 // +2.1% more common
  if (punctuation.hasExclamation) punctScore += 5 // slight positive
  if (punctuation.hasColon) punctScore += 5
  breakdown.punctuation = Math.min(100, punctScore)

  // 5. Capitalization Score (5% weight)
  switch (capStyle) {
    case 'sentence':
      breakdown.capitalization = 95 // 91% of viral posts
      break
    case 'title':
      breakdown.capitalization = 60 // 4.5% of viral posts
      break
    case 'all-caps':
      breakdown.capitalization = 20 // 0.2% - penalized
      break
    case 'mixed':
      breakdown.capitalization = 40
      break
  }

  // 6. Word Simplicity Score (15% weight)
  // Target: 4.75 chars/word, 1.59 syllables/word
  const charDiff = Math.abs(avgWordLen - 4.75)
  const syllableDiff = Math.abs(avgSyllables - 1.59)
  breakdown.wordSimplicity = Math.max(0, Math.round(100 - charDiff * 15 - syllableDiff * 20))

  // 7. Power Words Score (15% weight)
  const powerWordScore = Math.min(100, 40 + powerWordResult.count * 15 + powerWordResult.categories.length * 10)
  breakdown.powerWords = powerWordScore

  // 8. Semantic Theme Score (10% weight)
  if (theme) {
    const themeScores: Record<string, number> = {
      relationship: 90,
      advice: 85,
      work: 70,
      discovery: 75,
      personal: 80,
    }
    breakdown.semanticTheme = themeScores[theme] || 70
  } else {
    breakdown.semanticTheme = 50
  }

  // Calculate weighted total score
  const weights = {
    titleLength: 0.20,
    firstPerson: 0.15,
    questionFormat: 0.10,
    punctuation: 0.10,
    capitalization: 0.05,
    wordSimplicity: 0.15,
    powerWords: 0.15,
    semanticTheme: 0.10,
  }

  let totalScore = 0
  for (const [key, weight] of Object.entries(weights)) {
    totalScore += breakdown[key as keyof ScoreBreakdown] * weight
  }

  const score = Math.round(totalScore)

  // Determine tier
  let tier: ViralAnalysisResult['tier']
  let expectedPerformance: ViralAnalysisResult['expectedPerformance']

  if (score >= 90) {
    tier = 'ultra-viral'
    expectedPerformance = { avgScore: 19991, description: 'Top 1% potential - Could reach front page' }
  } else if (score >= 70) {
    tier = 'highly-viral'
    expectedPerformance = { avgScore: 3438, description: 'High engagement potential - Likely to gain traction' }
  } else if (score >= 40) {
    tier = 'moderately-viral'
    expectedPerformance = { avgScore: 519, description: 'Decent potential - May get moderate engagement' }
  } else {
    tier = 'low-viral'
    expectedPerformance = { avgScore: 6, description: 'Low potential - Consider revising before posting' }
  }

  // Generate suggestions
  const suggestions = generateSuggestions(title, breakdown, config, wordCount, firstPerson, question, capStyle, powerWordResult, theme)

  return {
    score,
    tier,
    breakdown,
    suggestions,
    expectedPerformance,
  }
}

/**
 * Generate improvement suggestions based on analysis
 */
function generateSuggestions(
  title: string,
  breakdown: ScoreBreakdown,
  config: typeof DEFAULT_CONFIG,
  wordCount: number,
  firstPerson: boolean,
  question: boolean,
  capStyle: string,
  powerWords: { count: number; categories: string[] },
  theme: string | null
): string[] {
  const suggestions: string[] = []

  // Title length suggestions
  if (breakdown.titleLength < 70) {
    if (wordCount < config.optimalTitleLength.min) {
      suggestions.push(`Add more detail - aim for ${config.optimalTitleLength.min}-${config.optimalTitleLength.max} words`)
    } else if (wordCount > config.optimalTitleLength.max) {
      suggestions.push(`Shorten your title - optimal length is ${config.optimalTitleLength.min}-${config.optimalTitleLength.max} words`)
    }
  }

  // First-person suggestions
  if (!firstPerson && config.firstPersonBonus > 0) {
    suggestions.push('Consider using first-person ("I", "my") for a more personal, relatable story')
  }

  // Question format suggestions
  if (question && config.questionPenalty > 0 && breakdown.questionFormat < 70) {
    suggestions.push('Try rephrasing as a statement - statements tend to get more upvotes than questions')
  }

  // Capitalization suggestions
  if (capStyle === 'all-caps') {
    suggestions.push('Avoid ALL CAPS - it appears spammy and reduces engagement')
  } else if (capStyle === 'title') {
    suggestions.push('Use sentence case instead of Title Case for a more natural feel')
  }

  // Word simplicity suggestions
  if (breakdown.wordSimplicity < 60) {
    suggestions.push('Use simpler words - viral posts average 4.75 characters per word')
  }

  // Power words suggestions
  if (powerWords.count < 2) {
    suggestions.push('Add power words like "you", "people", "just", "never" to increase engagement')
  }

  // Transformation arc
  if (!powerWords.categories.includes('transformation')) {
    suggestions.push('Consider adding a transformation arc (but, finally, realized, until, then)')
  }

  // Theme suggestions
  if (!theme) {
    suggestions.push('Add a clear theme (relationship, advice, work, discovery) for better resonance')
  }

  return suggestions.slice(0, 5) // Limit to 5 suggestions
}

/**
 * Generate improved title alternatives using the scoring insights
 */
export async function generateImprovedTitles(
  originalTitle: string,
  subreddit: string,
  analysis: ViralAnalysisResult
): Promise<string[]> {
  // This would use AI to generate alternatives, but for now return template-based improvements
  const improvements: string[] = []

  const config = SUBREDDIT_CONFIGS[subreddit.toLowerCase().replace(/^r\//, '')] || DEFAULT_CONFIG

  // Add first-person variant if not present
  if (!hasFirstPerson(originalTitle) && config.firstPersonBonus > 0) {
    improvements.push(`I ${originalTitle.toLowerCase().replace(/^(a|an|the)\s+/, '')}`)
  }

  // Add transformation arc
  if (!countPowerWords(originalTitle).categories.includes('transformation')) {
    improvements.push(`${originalTitle}, and then realized...`)
  }

  // Simplify if too complex
  if (analysis.breakdown.wordSimplicity < 60) {
    // This is a placeholder - real implementation would use AI
    improvements.push(originalTitle.split(' ').slice(0, config.optimalTitleLength.sweet).join(' '))
  }

  return improvements
}
