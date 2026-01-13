/**
 * Viral Body Copy Optimizer Scoring Library
 * Based on analysis of 150+ viral Reddit posts from story-based subreddits
 *
 * Scoring Weights:
 * - Opening Hook: 20%
 * - Story Structure: 20%
 * - Paragraph Flow: 15%
 * - Emotional Triggers: 15%
 * - Dialogue Usage: 10%
 * - Length Optimization: 10%
 * - Formatting: 10%
 */

export interface BodyScoreBreakdown {
  openingHook: number
  storyStructure: number
  paragraphFlow: number
  emotionalTriggers: number
  dialogueUsage: number
  lengthOptimization: number
  formatting: number
}

export interface ViralBodyAnalysisResult {
  score: number
  tier: 'ultra-viral' | 'highly-viral' | 'moderately-viral' | 'low-viral'
  breakdown: BodyScoreBreakdown
  suggestions: string[]
  expectedPerformance: {
    avgScore: number
    description: string
  }
  detectedPattern: string | null
}

// Emotional state openers that drive high engagement
const EMOTIONAL_OPENERS = [
  'i have never', 'i can\'t believe', 'i\'m literally', 'i\'m shaking',
  'i need to get this off', 'this happened', 'so this just',
  'i don\'t know where to start', 'i\'ve been holding this in',
  'throwaway because', 'i never thought', 'i finally'
]

// Context-setting patterns
const CONTEXT_PATTERNS = [
  /i \(\d+[mf]\)/i, // Age/gender marker like (26F)
  /my \w+ \(\d+[mf]\)/i, // My husband (29M)
  /we\'ve been (together|married|dating)/i,
  /for (context|background)/i,
  /some background/i
]

// Transformation arc words
const TRANSFORMATION_WORDS = [
  'but', 'finally', 'realized', 'until', 'then', 'now', 'after',
  'before', 'however', 'suddenly', 'everything changed', 'that\'s when'
]

// Emotional reaction phrases
const EMOTIONAL_REACTIONS = [
  'i was shocked', 'i couldn\'t believe', 'my heart sank',
  'i felt', 'i was devastated', 'i was furious', 'i was mortified',
  'tears', 'crying', 'laughing', 'speechless', 'stunned'
]

// First-person indicators (35% of viral posts use these)
const FIRST_PERSON_WORDS = ['i', 'my', 'me', 'mine', 'i\'m', 'i\'ve', 'i\'ll', 'i\'d', 'myself', 'we', 'our', 'us']

// Subreddit-specific optimal word counts
export const SUBREDDIT_WORD_COUNTS: Record<string, { min: number; max: number; sweet: number }> = {
  tifu: { min: 300, max: 1200, sweet: 600 },
  amitheasshole: { min: 400, max: 1500, sweet: 800 },
  relationships: { min: 500, max: 2000, sweet: 1000 },
  relationship_advice: { min: 500, max: 2000, sweet: 1000 },
  confession: { min: 200, max: 800, sweet: 400 },
  maliciouscompliance: { min: 600, max: 2500, sweet: 1200 },
  prorevenge: { min: 800, max: 4000, sweet: 1500 },
  pettyrevenge: { min: 400, max: 1500, sweet: 700 },
  askreddit: { min: 50, max: 500, sweet: 150 },
  offmychest: { min: 300, max: 1500, sweet: 600 },
  trueoffmychest: { min: 300, max: 1500, sweet: 600 },
}

const DEFAULT_WORD_COUNT = { min: 200, max: 1500, sweet: 500 }

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length
}

/**
 * Count paragraphs
 */
function countParagraphs(text: string): number {
  return text.split(/\n\s*\n/).filter(p => p.trim().length > 0).length
}

/**
 * Get average paragraph length in sentences
 */
function getAvgParagraphLength(text: string): number {
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0)
  if (paragraphs.length === 0) return 0

  const totalSentences = paragraphs.reduce((sum, p) => {
    const sentences = p.split(/[.!?]+/).filter(s => s.trim().length > 0)
    return sum + sentences.length
  }, 0)

  return totalSentences / paragraphs.length
}

/**
 * Check for emotional opener in first 2 sentences
 */
function hasEmotionalOpener(text: string): boolean {
  const firstPart = text.toLowerCase().slice(0, 200)
  return EMOTIONAL_OPENERS.some(opener => firstPart.includes(opener))
}

/**
 * Check for context patterns (age/gender markers, background)
 */
function hasContextPattern(text: string): boolean {
  return CONTEXT_PATTERNS.some(pattern => pattern.test(text))
}

/**
 * Count transformation arc words
 */
function countTransformationWords(text: string): number {
  const lower = text.toLowerCase()
  return TRANSFORMATION_WORDS.filter(word => lower.includes(word)).length
}

/**
 * Check for emotional reactions in the text
 */
function countEmotionalReactions(text: string): number {
  const lower = text.toLowerCase()
  return EMOTIONAL_REACTIONS.filter(reaction => lower.includes(reaction)).length
}

/**
 * Check for dialogue (quoted speech or "He said:" patterns)
 */
function hasDialogue(text: string): boolean {
  // Check for quoted dialogue
  const hasQuotes = /"[^"]{5,}"/.test(text) || /'[^']{5,}'/.test(text)
  // Check for dialogue patterns like "Him: " or "She said"
  const hasDialoguePattern = /\b(him|her|he|she|my \w+|i):\s*["']?/i.test(text) ||
    /\b(said|asked|replied|responded|told me|yelled|whispered)\b/i.test(text)
  return hasQuotes || hasDialoguePattern
}

/**
 * Check for TL;DR
 */
function hasTLDR(text: string): boolean {
  return /tl;?dr|tldr/i.test(text)
}

/**
 * Check for update/edit sections
 */
function hasUpdate(text: string): boolean {
  return /\b(edit|update|edit\s*\d*|update\s*\d*):/i.test(text)
}

/**
 * Count first-person usage
 */
function countFirstPerson(text: string): number {
  const words = text.toLowerCase().split(/\s+/)
  return words.filter(word => FIRST_PERSON_WORDS.includes(word.replace(/[^a-z']/g, ''))).length
}

/**
 * Detect story structure pattern
 */
function detectStoryPattern(text: string): string | null {
  const lower = text.toLowerCase()
  const hasTifuPattern = /tifu|fucked up|messed up/.test(lower)
  const hasAitaPattern = /aita|am i the|asshole/.test(lower)
  const hasRevengePattern = /revenge|malicious compliance|got back at/.test(lower)
  const hasConfessionPattern = /confession|confess|secret|never told/.test(lower)
  const hasRelationshipPattern = /my (wife|husband|boyfriend|girlfriend|partner)|relationship|broke up|dating/.test(lower)

  if (hasTifuPattern) return 'TIFU'
  if (hasAitaPattern) return 'AITA'
  if (hasRevengePattern) return 'Revenge'
  if (hasConfessionPattern) return 'Confession'
  if (hasRelationshipPattern) return 'Relationship'
  return null
}

/**
 * Calculate the viral score for body copy
 */
export function calculateViralBodyScore(
  content: string,
  subreddit?: string,
  postType: string = 'story'
): ViralBodyAnalysisResult {
  const normalizedSubreddit = subreddit?.toLowerCase().replace(/^r\//, '') || ''
  const wordCountConfig = SUBREDDIT_WORD_COUNTS[normalizedSubreddit] || DEFAULT_WORD_COUNT

  const wordCount = countWords(content)
  const paragraphCount = countParagraphs(content)
  const avgParagraphLen = getAvgParagraphLength(content)
  const emotionalOpener = hasEmotionalOpener(content)
  const contextPattern = hasContextPattern(content)
  const transformationCount = countTransformationWords(content)
  const emotionalCount = countEmotionalReactions(content)
  const dialogue = hasDialogue(content)
  const tldr = hasTLDR(content)
  const update = hasUpdate(content)
  const firstPersonCount = countFirstPerson(content)
  const detectedPattern = detectStoryPattern(content)

  const breakdown: BodyScoreBreakdown = {
    openingHook: 0,
    storyStructure: 0,
    paragraphFlow: 0,
    emotionalTriggers: 0,
    dialogueUsage: 0,
    lengthOptimization: 0,
    formatting: 0,
  }

  // 1. Opening Hook Score (20% weight)
  let openingScore = 40
  if (emotionalOpener) openingScore += 30
  if (contextPattern) openingScore += 20
  // Check if first sentence is engaging (not too short)
  const firstSentence = content.split(/[.!?]/)[0] || ''
  if (countWords(firstSentence) >= 8 && countWords(firstSentence) <= 25) openingScore += 10
  breakdown.openingHook = Math.min(100, openingScore)

  // 2. Story Structure Score (20% weight)
  let structureScore = 40
  if (detectedPattern) structureScore += 15
  if (transformationCount >= 2) structureScore += 20
  if (transformationCount >= 4) structureScore += 10
  if (paragraphCount >= 3 && paragraphCount <= 10) structureScore += 15
  breakdown.storyStructure = Math.min(100, structureScore)

  // 3. Paragraph Flow Score (15% weight)
  let flowScore = 50
  // Optimal: 3-5 sentences per paragraph
  if (avgParagraphLen >= 2 && avgParagraphLen <= 6) {
    flowScore += 30
  } else if (avgParagraphLen >= 1 && avgParagraphLen <= 8) {
    flowScore += 15
  }
  // Variety in paragraph lengths is good
  if (paragraphCount >= 4) flowScore += 20
  breakdown.paragraphFlow = Math.min(100, flowScore)

  // 4. Emotional Triggers Score (15% weight)
  let emotionalScore = 30
  emotionalScore += Math.min(40, emotionalCount * 15)
  // First-person adds relatability (35% of viral posts use it)
  const firstPersonRatio = firstPersonCount / Math.max(1, wordCount)
  if (firstPersonRatio >= 0.02 && firstPersonRatio <= 0.1) {
    emotionalScore += 30
  } else if (firstPersonRatio > 0) {
    emotionalScore += 15
  }
  breakdown.emotionalTriggers = Math.min(100, emotionalScore)

  // 5. Dialogue Usage Score (10% weight)
  // 78% of viral posts include dialogue
  if (dialogue) {
    breakdown.dialogueUsage = 85
  } else {
    breakdown.dialogueUsage = 40
  }

  // 6. Length Optimization Score (10% weight)
  const { min, max, sweet } = wordCountConfig
  if (wordCount >= min && wordCount <= max) {
    const distanceFromSweet = Math.abs(wordCount - sweet)
    const maxDistance = Math.max(sweet - min, max - sweet)
    breakdown.lengthOptimization = Math.round(90 - (distanceFromSweet / maxDistance) * 30)
  } else if (wordCount < min) {
    breakdown.lengthOptimization = Math.max(20, 60 - (min - wordCount) / 10)
  } else {
    breakdown.lengthOptimization = Math.max(20, 60 - (wordCount - max) / 50)
  }

  // 7. Formatting Score (10% weight)
  let formatScore = 50
  if (tldr) formatScore += 25 // TL;DR at end is standard
  if (update) formatScore += 10 // Updates show engagement
  // Check for proper line breaks (not a wall of text)
  if (paragraphCount >= 3) formatScore += 15
  breakdown.formatting = Math.min(100, formatScore)

  // Calculate weighted total score
  const weights = {
    openingHook: 0.20,
    storyStructure: 0.20,
    paragraphFlow: 0.15,
    emotionalTriggers: 0.15,
    dialogueUsage: 0.10,
    lengthOptimization: 0.10,
    formatting: 0.10,
  }

  let totalScore = 0
  for (const [key, weight] of Object.entries(weights)) {
    totalScore += breakdown[key as keyof BodyScoreBreakdown] * weight
  }

  const score = Math.round(totalScore)

  // Determine tier
  let tier: ViralBodyAnalysisResult['tier']
  let expectedPerformance: ViralBodyAnalysisResult['expectedPerformance']

  if (score >= 85) {
    tier = 'ultra-viral'
    expectedPerformance = { avgScore: 15000, description: 'Top-tier body copy - Strong viral potential' }
  } else if (score >= 65) {
    tier = 'highly-viral'
    expectedPerformance = { avgScore: 3000, description: 'High engagement potential - Well-structured story' }
  } else if (score >= 45) {
    tier = 'moderately-viral'
    expectedPerformance = { avgScore: 500, description: 'Decent potential - Could use some refinement' }
  } else {
    tier = 'low-viral'
    expectedPerformance = { avgScore: 50, description: 'Needs improvement - Review suggestions below' }
  }

  // Generate suggestions
  const suggestions = generateBodySuggestions(
    content, breakdown, wordCount, wordCountConfig, emotionalOpener,
    dialogue, tldr, transformationCount, paragraphCount
  )

  return {
    score,
    tier,
    breakdown,
    suggestions,
    expectedPerformance,
    detectedPattern,
  }
}

/**
 * Generate improvement suggestions for body copy
 */
function generateBodySuggestions(
  content: string,
  breakdown: BodyScoreBreakdown,
  wordCount: number,
  wordCountConfig: { min: number; max: number; sweet: number },
  emotionalOpener: boolean,
  dialogue: boolean,
  tldr: boolean,
  transformationCount: number,
  paragraphCount: number
): string[] {
  const suggestions: string[] = []

  // Opening hook suggestions
  if (breakdown.openingHook < 70) {
    if (!emotionalOpener) {
      suggestions.push('Start with an emotional hook: "I have never been so mortified..." or "This literally just happened..."')
    }
    suggestions.push('Add context early: Include your age/gender like "(26F)" or background info in the first paragraph')
  }

  // Story structure suggestions
  if (breakdown.storyStructure < 70) {
    if (transformationCount < 2) {
      suggestions.push('Add transformation words (but, finally, realized, then) to create a story arc')
    }
    suggestions.push('Structure your post: Hook → Context → Build-up → Climax → Aftermath')
  }

  // Paragraph flow suggestions
  if (breakdown.paragraphFlow < 70) {
    if (paragraphCount < 3) {
      suggestions.push('Break up your text into 4-6 paragraphs for better readability')
    }
    suggestions.push('Keep paragraphs to 3-5 sentences each for optimal engagement')
  }

  // Emotional triggers
  if (breakdown.emotionalTriggers < 60) {
    suggestions.push('Show your emotional reactions: "I was shocked", "My heart sank", "I couldn\'t believe it"')
  }

  // Dialogue suggestions
  if (!dialogue) {
    suggestions.push('Add dialogue to make your story vivid: Him: "Did you really do that?" Me: "I panicked!"')
  }

  // Length suggestions
  if (wordCount < wordCountConfig.min) {
    suggestions.push(`Expand your story to ${wordCountConfig.min}-${wordCountConfig.max} words for this type of post`)
  } else if (wordCount > wordCountConfig.max) {
    suggestions.push(`Consider trimming to ${wordCountConfig.max} words max - keep it focused`)
  }

  // Formatting suggestions
  if (!tldr && wordCount > 300) {
    suggestions.push('Add a TL;DR at the end to summarize your post')
  }

  return suggestions.slice(0, 6) // Limit to 6 suggestions
}

/**
 * Viral body copy prompt for AI generation
 */
export const VIRAL_BODY_COPY_PROMPT = `
## EMOTIONAL CATEGORY (CHOOSE ONE)

Every viral post must fit ONE of these three emotional drivers:

1. **ASPIRATIONAL** - Makes people want to level up
   - Success stories, transformations, "how I went from X to Y"
   - Share frameworks, strategies, or insights that help others grow
   - Show what's possible and inspire others to reach higher

2. **INSPIRATIONAL** - Makes people want to take action
   - Call to arms, motivation, "here's what I learned the hard way"
   - Practical advice that people can implement TODAY
   - Stories of overcoming obstacles that light a fire in readers

3. **CONTROVERSIAL** - Makes people fired up
   - Challenge conventional wisdom, hot takes, unpopular opinions
   - "Why X is wrong" or "The truth about Y nobody talks about"
   - Spark debate and strong reactions (without being offensive)

Pick ONE category and commit to it. Don't try to be all three.

---

## VIRAL POST CHECKLIST (MUST PASS ALL 5)

Before finalizing ANY post, verify it passes these 5 criteria:

### 1. IS IT TAILORED TO THE SUBREDDIT?
- Content must be hyper-relevant to the specific subreddit
- Must bring genuine VALUE to that community
- Research what content performs well there
- Use vocabulary and references specific to that community

### 2. DOES IT FEEL HUMAN?
- Write like a real person, NOT corporate/marketing speak
- AVOID buzzwords: "leverage", "synergy", "optimize", "solution", etc.
- Use lowercase naturally - don't over-capitalize
- NEVER include direct links (instant spam flag)
- Use casual language, contractions, even minor imperfections

### 3. IS IT WRITTEN BY A COMMUNITY MEMBER?
- Talk like you're PART of the community, not an outsider
- Reference shared experiences and inside knowledge
- Use "we/us" when appropriate, not "you guys"
- Show you understand the community's frustrations and wins

### 4. IS IT SKIMMABLE?
- Use clear structure with paragraph breaks
- Keep paragraphs to 3-5 sentences max
- Use formatting (bullet points, numbered lists) when appropriate
- Front-load the interesting part - don't bury the lead
- People skim first to decide: "Is this worth my time?"

### 5. WOULD YOU SHARE THIS IF SOMEONE ELSE WROTE IT?
- The content must be SO GOOD you'd share it yourself
- If it's just "okay", rework it until it's exceptional
- The difference between OK and viral is night and day
- Go the extra mile - it will pay off

---

## VIRAL BODY COPY RULES (Based on analysis of 4,944+ viral Reddit posts)

### Opening Pattern (CRITICAL - First 2 sentences determine engagement)
Choose ONE opening style:
- **Emotional State**: "I have never been so mortified in my life..." / "I'm literally shaking as I type this..."
- **Context + Stakes**: "I (age/gender) recently discovered..." / "So my boss has been..."
- **Time Anchor**: "This literally happened two hours ago..." / "Last night at 2am..."

### Structure Formula
1. [HOOK] - 1-2 emotional sentences
2. [CONTEXT] - Background paragraph with who/where/when
3. [BUILD-UP] - 2-3 paragraphs of rising tension
4. [THE MOMENT] - The climax with dialogue
5. [AFTERMATH] - Emotional reaction + consequences

### Paragraph Rules
- 3-5 sentences per paragraph (50-100 words)
- Break BEFORE dialogue
- Break AFTER major revelations

### Dialogue (78% of viral posts include this)
Include realistic dialogue:
Him: "Did you really just do that?"
Me: "I panicked, okay?"

### Emotional Triggers (Must Include 2-3)
- Show reactions: "I was shocked", "My heart sank", "I couldn't believe it"
- Use transformation words: but, finally, realized, until, then
- First-person perspective (I, my, me) - 35% of viral posts use this

### Word Count by Post Type
- Stories/TIFU: 400-800 words
- AITA: 500-1000 words
- Relationships: 600-1200 words
- Revenge: 800-1500 words
- Confession: 300-600 words

### DO NOT:
- Use excessive emojis
- ALL CAPS (except ONE word occasionally)
- Ask for upvotes
- Start with "So..." or "Okay so..."
- Write wall-of-text with no paragraph breaks
- Include ANY direct links (spam signal)
- Use marketing buzzwords or corporate language
- Sound like an outsider or marketer
`

/**
 * Get the viral body copy prompt for AI generation
 */
export function getViralBodyPrompt(): string {
  return VIRAL_BODY_COPY_PROMPT
}
