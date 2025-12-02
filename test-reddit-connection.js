// Test Reddit API connection
require('dotenv').config({ path: '.env.local' })
const snoowrap = require('snoowrap')

async function testConnection() {
  console.log('Testing Reddit API connection...\n')
  
  console.log('Credentials:')
  console.log('- Client ID:', process.env.REDDIT_CLIENT_ID ? '✓ Set' : '✗ Missing')
  console.log('- Client Secret:', process.env.REDDIT_CLIENT_SECRET ? '✓ Set' : '✗ Missing')
  console.log('- Username:', process.env.REDDIT_USERNAME)
  console.log('- Password:', process.env.REDDIT_PASSWORD ? '✓ Set' : '✗ Missing')
  console.log('')
  
  try {
    const reddit = new snoowrap({
      userAgent: 'RedditAutomation/1.0.0 (Test Script)',
      clientId: process.env.REDDIT_CLIENT_ID,
      clientSecret: process.env.REDDIT_CLIENT_SECRET,
      username: process.env.REDDIT_USERNAME,
      password: process.env.REDDIT_PASSWORD,
    })
    
    console.log('✓ Snoowrap client created')
    console.log('\nTesting searchSubreddits...')
    
    const results = await reddit.searchSubreddits({ query: 'technology', limit: 5 })
    
    console.log(`✓ Search successful! Found ${results.length} results:\n`)
    
    for (const sub of results) {
      console.log(`- r/${sub.display_name} (${sub.subscribers?.toLocaleString()} subscribers)`)
    }
    
    console.log('\n✅ All tests passed!')
    
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    console.error('\nFull error:', error)
    
    if (error.statusCode) {
      console.error('\nHTTP Status:', error.statusCode)
    }
  }
}

testConnection()
