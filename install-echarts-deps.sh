#!/bin/bash

# ECharts Dependencies Installation Script
echo "🚀 Installing ECharts dependencies for Graph View feature..."

cd frontend

# Install the new dependencies
echo "📦 Installing echarts, echarts-gl, and echarts-for-react..."
npm install echarts@^5.4.3 echarts-gl@^2.0.9 echarts-for-react@^3.0.2

echo "✅ ECharts dependencies installed successfully!"
echo ""
echo "📊 New features added:"
echo "  - Interactive chart toggles in metric cards"
echo "  - Full-screen graph view modal"
echo "  - Multiple chart types (Line, Area, Bar, Gauge)"
echo "  - WebGL acceleration for smooth animations"
echo "  - Real-time data updates"
echo "  - Historical time-series visualization"
echo ""
echo "🎯 To use: Click the small graph icon (📊) in any metric card to open the graph view!"

cd ..
