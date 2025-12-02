# Reddit API 401 Unauthorized Error - Investigation Results

**Date**: October 30, 2025  
**Issue**: Subreddit discovery feature returns 500 error  
**Root Cause**: Reddit API returning 401 Unauthorized during authentication  
**Status**: **REQUIRES USER ACTION**

---

## Problem Summary

The Reddit API integration is failing with a **401 Unauthorized** error when attempting to authenticate. This prevents all Reddit API operations including:
- ❌ Subreddit discovery/search
- ❌ Posting to Reddit
- ❌ Fetching comments
- ❌ Analytics refresh from Reddit

**Error Message**:
```
401 - {"message":"Unauthorized","error":401}
```

---

## Test Results

I created a test script (`test-reddit-connection.js`) to isolate the issue. Here's what we discovered:

### ✅ Credentials Are Configured
- **Client ID**: `oX6w7LytXSa1aXnpjf1ppA` ✓
- **Client Secret**: `U-MYBGqdgX6aLuJi2h8zCa2O50YAuw` ✓
- **Username**: `support@callspot.ai` ✓
- **Password**: Set ✓

### ❌ Reddit API Rejects Authentication
Reddit's `/api/v1/access_token` endpoint is returning 401 when we try to get an OAuth token using these credentials.

---

## Possible Causes

### 1. **Incorrect Reddit App Credentials** (Most Likely)
The Client ID or Client Secret may be incorrect, or the Reddit app may have been deleted/regenerated.

**How to verify**:
1. Go to https://www.reddit.com/prefs/apps
2. Find your app (should be named something like "Reddit Automation" or similar)
3. Verify the Client ID matches: `oX6w7LytXSa1aXnpjf1ppA`
4. If the app doesn't exist or IDs don't match, you'll need to create/recreate it

### 2. **Account Credentials Issue**
The Reddit account username/password may be incorrect, or the account may have 2FA enabled.

**Important**: 
- Reddit accounts with 2FA (Two-Factor Authentication) **cannot use password authentication** for apps
- You would need to disable 2FA or use a different authentication method

### 3. **App Type Mismatch**
The Reddit app must be created as a **"script" type** app for username/password authentication to work.

**Incorrect types**:
- ❌ "web app" - requires OAuth redirect flow
- ❌ "installed app" - different authentication method
- ✅ **"script"** - allows password authentication (what we need)

---

## How to Fix

### Option 1: Verify Existing App (Recommended First Step)

1. **Go to Reddit Apps**:
   ```
   https://www.reddit.com/prefs/apps
   ```

2. **Find Your App**:
   - Look for the app with Client ID starting with `oX6w7LytXSa1aXnpjf1ppA`
   - Check if it exists and is type "script"

3. **If App Exists**:
   - Verify Client ID matches
   - Try regenerating the secret (you'll get a new secret to copy)
   - Update `.env.local` with new secret

4. **If App Doesn't Exist**: Proceed to Option 2

### Option 2: Create New Reddit App

1. **Go to**: https://www.reddit.com/prefs/apps

2. **Click**: "create another app..." at the bottom

3. **Fill Form**:
   - **Name**: Reddit Automation (or any name)
   - **App type**: Select **"script"** (very important!)
   - **Description**: Personal Reddit automation tool
   - **About URL**: (leave blank or use placeholder)
   - **Redirect URI**: http://localhost:8080 (required but not used for scripts)

4. **Submit**: Click "create app"

5. **Copy Credentials**:
   - **Client ID**: The string under the app name (looks like `randomstring`)
   - **Client Secret**: The "secret" field value

6. **Update `.env.local`**:
   ```env
   REDDIT_CLIENT_ID=your-new-client-id
   REDDIT_CLIENT_SECRET=your-new-secret
   ```

### Option 3: Verify Account Credentials

1. **Test Login**: Try logging into Reddit.com with `support@callspot.ai` and the password

2. **Check 2FA**: If 2FA is enabled, you'll need to:
   - Disable 2FA on the account, OR
   - Use a different account without 2FA, OR
   - Implement OAuth flow (more complex)

3. **Verify Password**: Make sure there are no typos or special characters being escaped incorrectly

---

## Testing After Fix

Once you've updated credentials, test the connection:

```bash
cd /Users/michaelkraft/reddit-automation
node test-reddit-connection.js
```

**Expected output if working**:
```
✓ Snoowrap client created
✓ Search successful! Found 5 results:

- r/technology (15,234,567 subscribers)
- r/technews (892,345 subscribers)
...

✅ All tests passed!
```

Then restart the dev server and try the discovery feature:
```bash
npm run dev
# Visit http://localhost:3000/dashboard/discover
# Search for "technology"
```

---

## Additional Notes

### Why This Affects Everything
The 401 error occurs during the **initial OAuth token request**. Without a valid token, **no Reddit API calls can be made**. This is why:
- Post scheduling will fail when trying to post
- Comment fetching won't work
- Analytics refresh from Reddit won't work
- Subreddit discovery returns 500 error

### Why It Shows as 500 in UI
The API route catches the 401 error and returns a generic 500 error to the frontend. This is why Playwright testing showed:
```
POST /api/subreddits/search 500 in 765ms
```

The actual error is a 401 from Reddit's API, not a 500 from our server.

---

## Current Status

🔴 **BLOCKED**: All Reddit API features are non-functional until credentials are corrected

**Next Steps**:
1. User verifies/creates Reddit app credentials
2. User updates `.env.local` with correct credentials
3. User runs test script to verify connection
4. User restarts dev server
5. User tests subreddit discovery feature

---

**Investigation Time**: 10 minutes  
**Root Cause**: Reddit API authentication failure (401)  
**Requires**: User to verify/update Reddit app credentials  
**Files Created**: `test-reddit-connection.js` (test script)
