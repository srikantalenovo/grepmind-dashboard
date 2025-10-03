#!/usr/bin/env node

/**
 * Quick Performance Test for GrepMind Backend
 * Run this to test individual components without the full UI
 */

import fetch from 'node-fetch';
import { config } from 'dotenv';

config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://dashboard.grepmind.com/api';

// Test user credentials (adjust as needed)
const TEST_USER = {
  email: 'test@example.com',
  password: 'testpass123'
};

async function performanceTest() {
  console.log('🧪 Starting GrepMind Performance Test...\n');
  
  try {
    // Test 1: Backend Health Check
    console.log('1️⃣  Testing backend health...');
    const healthStart = Date.now();
    
    try {
      const healthResponse = await fetch(`${BACKEND_URL}/health`, {
        timeout: 5000
      });
      
      const healthDuration = Date.now() - healthStart;
      console.log(`✅ Backend health: ${healthResponse.ok ? 'OK' : 'FAILED'} (${healthDuration}ms)\n`);
      
      if (!healthResponse.ok) {
        console.log('❌ Backend is not healthy. Check docker-compose logs backend');
        return;
      }
    } catch (error) {
      console.log(`❌ Backend unreachable: ${error.message}\n`);
      return;
    }

    // Test 2: Authentication
    console.log('2️⃣  Testing authentication...');
    const authStart = Date.now();
    
    const authResponse = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(TEST_USER),
      timeout: 10000
    });
    
    const authDuration = Date.now() - authStart;
    
    if (!authResponse.ok) {
      console.log(`❌ Authentication failed (${authDuration}ms): ${authResponse.status} ${authResponse.statusText}`);
      console.log('💡 Make sure you have a test user registered or adjust TEST_USER credentials\n');
      return;
    }
    
    const authData = await authResponse.json();
    const token = authData.accessToken;
    console.log(`✅ Authentication: OK (${authDuration}ms)\n`);

    // Test 3: AI Service Health
    console.log('3️⃣  Testing AI service health...');
    const aiHealthStart = Date.now();
    
    const aiHealthResponse = await fetch(`${BACKEND_URL}/api/chat/health`, {
      headers: { 'Authorization': `Bearer ${token}` },
      timeout: 15000
    });
    
    const aiHealthDuration = Date.now() - aiHealthStart;
    
    if (!aiHealthResponse.ok) {
      console.log(`❌ AI service health check failed (${aiHealthDuration}ms): ${aiHealthResponse.status}`);
      console.log('💡 This usually means Llama server is not running or taking too long to start\n');
      return;
    }
    
    const aiHealthData = await aiHealthResponse.json();
    console.log(`✅ AI service health: OK (${aiHealthDuration}ms)`);
    console.log(`📊 Services status:`, aiHealthData.services);
    console.log('');

    // Test 4: Quick Message Test
    console.log('4️⃣  Testing quick message (this will show the bottleneck)...');
    console.log('📝 Sending message: "Hi"');
    
    const messageStart = Date.now();
    
    const messageResponse = await fetch(`${BACKEND_URL}/api/chat/message`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ message: 'Hi' }),
      timeout: 120000 // 2 minute timeout
    });
    
    if (!messageResponse.ok) {
      const messageDuration = Date.now() - messageStart;
      console.log(`❌ Message failed (${messageDuration}ms): ${messageResponse.status}`);
      const errorText = await messageResponse.text();
      console.log('Error:', errorText);
      return;
    }
    
    console.log('📡 Streaming response started...');
    console.log('⏱️  Watch docker-compose logs backend for detailed timing logs');
    console.log('---');
    
    // Process streaming response
    const reader = messageResponse.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let firstTokenTime = null;
    
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value);
      
      if (!firstTokenTime && chunk.trim()) {
        firstTokenTime = Date.now();
        const timeToFirstToken = firstTokenTime - messageStart;
        console.log(`⚡ First token received in ${timeToFirstToken}ms`);
      }
      
      // Don't print the full response, just collect it
      fullResponse += chunk;
    }
    
    const totalDuration = Date.now() - messageStart;
    console.log('---');
    console.log(`✅ Message completed in ${totalDuration}ms`);
    console.log(`📏 Response length: ${fullResponse.length} characters`);
    
    // Performance Summary
    console.log('\n📊 PERFORMANCE SUMMARY:');
    console.log(`• Backend Health: ${healthDuration}ms`);
    console.log(`• Authentication: ${authDuration}ms`);
    console.log(`• AI Health Check: ${aiHealthDuration}ms`);
    console.log(`• Message Processing: ${totalDuration}ms`);
    console.log(`• Time to First Token: ${firstTokenTime ? (firstTokenTime - messageStart) : 'N/A'}ms`);
    
    // Performance Analysis
    console.log('\n🎯 PERFORMANCE ANALYSIS:');
    if (totalDuration > 30000) {
      console.log('🔴 VERY SLOW: > 30 seconds - likely Llama model is too large or CPU limited');
    } else if (totalDuration > 10000) {
      console.log('🟡 SLOW: > 10 seconds - consider optimizations');
    } else if (totalDuration > 5000) {
      console.log('🟢 ACCEPTABLE: > 5 seconds');
    } else {
      console.log('🚀 FAST: < 5 seconds - excellent performance');
    }
    
  } catch (error) {
    console.log(`💥 Test failed with error: ${error.message}`);
  }
}

// Run the test
performanceTest().catch(console.error);