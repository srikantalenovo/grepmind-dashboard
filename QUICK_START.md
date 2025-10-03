# GrepMind Performance Optimization - Quick Start

## 🚀 Get Fast Responses in 3 Steps

### Step 1: Deploy with Performance Logging
```bash
# Stop current version
docker-compose down -v

# Extract optimized version
unzip grepmind-performance-optimized.zip
cd grepmind-performance-optimized

# Start with detailed logging
docker-compose up --build -d

# Watch logs in real-time
docker-compose logs -f backend
```

### Step 2: Test Current Performance
```bash
# Run performance test (adjust TEST_USER if needed)
node performance-test.js
```

### Step 3: Enable Fast Mode (Recommended)

**Option A: OpenAI API (Fastest - Sub-second responses)**
```bash
# Set your OpenAI API key
export OPENAI_API_KEY="sk-your-openai-api-key-here"

# Use the optimized configuration
docker-compose -f docker-compose-optimized.yml up --build
```

**Option B: Keep Local Llama but Make It Faster**
```bash
# Use the optimized local setup
docker-compose -f docker-compose-optimized.yml up --build
```

## 📊 What You'll See

### Before Optimization (Current State):
- 🔴 **20+ minutes** for simple "Hi" message
- No visibility into what's causing the delay

### After Optimization:
- ✅ **Detailed timing logs** showing exactly where time is spent
- 🚀 **Sub-second responses** with OpenAI API
- ⚡ **5-30 seconds** with optimized local Llama
- 📈 **Performance metrics** for every request

## 🔍 Reading the Performance Logs

When you test again, you'll see detailed logs like:
```
🚀 MESSAGE PROCESSING STARTED
⏱️  STEP 1: Checking AI service health... ✅ (45ms)
⏱️  STEP 2: Processing conversation... ✅ (12ms)  
⏱️  STEP 3: Generating embedding... ✅ (1200ms)  # ← This tells you if embeddings are slow
⏱️  STEP 4: Document retrieval... ✅ (89ms)
⏱️  STEP 5: Saving message... ✅ (23ms)
⏱️  STEP 6: Formatting prompt... ✅ (3ms)
⏱️  STEP 7: Starting AI response... (OpenAI API/Local Llama)
⚡ First token received in 850ms                  # ← This is the key metric!
🎯 STREAMING COMPLETED (2340ms total)            # ← Total time
```

## 🎯 Performance Targets

| Configuration | Expected Performance | Cost |
|---------------|---------------------|------|
| **OpenAI API** | 0.5-3 seconds | ~$0.01-0.03 per conversation |
| **Optimized Local Llama** | 5-30 seconds | Free (uses your CPU/RAM) |
| **Current Setup** | 20+ minutes | Free but unusable |

## ⚡ Quick OpenAI Setup (Recommended for Testing)

1. **Get OpenAI API Key**: Visit https://platform.openai.com/api-keys
2. **Set Environment Variable**:
   ```bash
   export OPENAI_API_KEY="sk-your-key-here"
   ```
3. **Use Optimized Config**:
   ```bash
   # Edit docker-compose-optimized.yml and uncomment OpenAI settings
   docker-compose -f docker-compose-optimized.yml up --build
   ```
4. **Test Performance**:
   ```bash
   node performance-test.js
   ```

You should see responses in under 3 seconds!

## 🛠️ Troubleshooting

**If performance test fails:**
- Check if containers are running: `docker-compose ps`  
- Check backend logs: `docker-compose logs backend`
- Verify your test user exists or adjust `TEST_USER` in `performance-test.js`

**If still slow with OpenAI:**
- Check your API key is correctly set
- Verify internet connection
- Look for errors in the backend logs

**If local Llama is still slow:**
- Check available RAM/CPU resources
- Consider using smaller models
- Look at Docker resource limits

## 📞 Next Steps

1. Run the performance test to see current bottlenecks
2. Deploy with OpenAI API for immediate speed improvement
3. Share the performance logs so I can help optimize further

The enhanced logging will show you exactly where the 20-minute delay is occurring!