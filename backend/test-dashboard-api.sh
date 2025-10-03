#!/bin/bash

echo "🔍 Dashboard API Diagnostic Script"
echo "=================================="

# Check if backend is running
echo ""
echo "1. Testing backend health..."
if curl -f -s http://dashboard.grepmind.com/api/health > /dev/null 2>&1; then
    echo "✅ Backend is running"
    curl -s http://dashboard.grepmind.com/api/health | jq '.' 2>/dev/null || curl -s http://dashboard.grepmind.com/api/health
else
    echo "❌ Backend is not accessible at http://dashboard.grepmind.com/api/health"
    echo "   Check if your backend is running and accessible"
fi

echo ""
echo "2. Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST http://dashboard.grepmind.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@grepmind.com","password":"admin123!@#"}')

if echo "$LOGIN_RESPONSE" | grep -q '"success":true'; then
    echo "✅ Login successful"
    TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.accessToken' 2>/dev/null)
    echo "🔑 Got access token: ${TOKEN:0:20}..."
    
    echo ""
    echo "3. Testing dashboard endpoint with token..."
    DASHBOARD_RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN" \
      http://dashboard.grepmind.com/api/dashboard/overview)
    
    if echo "$DASHBOARD_RESPONSE" | grep -q '"success":true'; then
        echo "✅ Dashboard API works!"
        echo "📊 Dashboard data preview:"
        echo "$DASHBOARD_RESPONSE" | jq '.data | {nodes: .nodes.total, pods: .pods.total, services: .services.total}' 2>/dev/null || echo "Got response but couldn't parse JSON"
    else
        echo "❌ Dashboard API failed"
        echo "Response: $DASHBOARD_RESPONSE"
    fi
else
    echo "❌ Login failed"
    echo "Response: $LOGIN_RESPONSE"
    echo ""
    echo "🔧 Troubleshooting steps:"
    echo "1. Verify admin user exists in database:"
    echo "   SELECT email, name, role FROM users WHERE email = 'admin@grepmind.com';"
    echo "2. Check backend logs for authentication errors"
    echo "3. Verify JWT_SECRET is set in environment"
fi

echo ""
echo "4. Browser debugging:"
echo "   Open browser Developer Tools (F12) → Console"
echo "   Look for detailed error messages from the frontend"
echo ""
echo "5. Backend logs:"
echo "   docker logs <backend-container> --tail 50"
echo "   Look for authentication and Kubernetes connection errors"
