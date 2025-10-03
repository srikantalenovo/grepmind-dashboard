# GrepMind - Full-Stack RAG Application

A powerful RAG (Retrieval-Augmented Generation) application built with React, Node.js, PostgreSQL, and Llama.cpp.

## 🚀 Quick Start

```bash
# Start all services
docker-compose up --build

# Access the application
# Frontend: http://dashboard.grepmind.com/
# Backend API: http://dashboard.grepmind.com/api
```

## ✅ Fixed Issues

This version includes fixes for:

1. **Chat Message Validation** - Improved validation with user-friendly error messages
2. **Login Page Icons** - Fixed missing icon imports  
3. **Error Handling** - Better validation error display in frontend
4. **Backend Logging** - Robust fallback logging system

## 🏗️ Architecture

- **Frontend**: React 18 + Vite + Tailwind CSS
- **Backend**: Node.js + Express + PostgreSQL
- **AI**: Llama.cpp server with streaming responses
- **Database**: PostgreSQL with pgvector for embeddings
- **Containerization**: Docker + Docker Compose

## 📝 Usage

1. Register a new account or login
2. Upload documents for RAG knowledge base
3. Start chatting with AI assistant
4. AI responses are enhanced with document context

## 🔧 Configuration

Environment variables can be configured in the respective Dockerfiles and docker-compose.yml.

---

**Enjoy your fully functional GrepMind AI assistant!** 🤖✨