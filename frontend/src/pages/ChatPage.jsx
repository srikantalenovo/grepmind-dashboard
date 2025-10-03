import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'react-router-dom'
import {
  Send,
  Paperclip,
  MoreVertical,
  Copy,
  Download,
  Trash2,
  User,
  Bot,
  Loader,
  AlertCircle
} from 'lucide-react'
import { chatAPI } from '../services/api'
import { useAuthStore } from '../stores/authStore'
import { LoadingSpinner, LoadingDots } from '../components/ui/LoadingSpinner'
import { formatDate } from '../utils/date'
import { generateTitle } from '../utils/text'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'

const ChatPage = () => {
  const { conversationId } = useParams()
  const { user } = useAuthStore()
  
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingMessage, setStreamingMessage] = useState('')
  const [context, setContext] = useState([])
  const [currentConversationId, setCurrentConversationId] = useState(conversationId)
  const [error, setError] = useState(null)
  
  const messagesEndRef = useRef(null)
  const abortControllerRef = useRef(null)
  
  useEffect(() => {
    if (conversationId) {
      loadMessages()
    }
  }, [conversationId])
  
  useEffect(() => {
    scrollToBottom()
  }, [messages, streamingMessage])
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }
  
  const loadMessages = async () => {
    try {
      setIsLoading(true)
      const response = await chatAPI.getMessages(conversationId)
      setMessages(response.messages)
    } catch (error) {
      setError('Failed to load messages')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleSend = async () => {
    if (!input.trim() || isStreaming) return
    
    const userMessage = {
      id: Date.now(),
      content: input.trim(),
      role: 'user',
      created_at: new Date().toISOString()
    }
    
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsStreaming(true)
    setStreamingMessage('')
    setError(null)
    
    try {
      // Create abort controller for this request
      abortControllerRef.current = new AbortController()
      
      const response = await chatAPI.sendMessage(input.trim(), currentConversationId)
      
      if (!response.ok) {
        throw new Error('Failed to send message')
      }
      
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantContent = ''
      
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break
        
        buffer += decoder.decode(value, { stream: true })
        
        // Process complete lines
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''
        
        for (const line of lines) {
          if (line.startsWith('---METADATA---')) {
            // Process metadata
            const remaining = lines.slice(lines.indexOf(line) + 1).join('\n')
            try {
              const metadata = JSON.parse(remaining)
              setContext(metadata.context || [])
              if (metadata.conversationId && !currentConversationId) {
                setCurrentConversationId(metadata.conversationId)
                window.history.replaceState({}, '', `/chat/${metadata.conversationId}`)
              }
            } catch (e) {
              console.error('Error parsing metadata:', e)
            }
            break
          } else if (line.trim()) {
            assistantContent += line + '\n'
            setStreamingMessage(assistantContent)
          }
        }
      }
      
      // Add final assistant message
      const assistantMessage = {
        id: Date.now() + 1,
        content: assistantContent.trim(),
        role: 'assistant',
        created_at: new Date().toISOString()
      }
      
      setMessages(prev => [...prev, assistantMessage])
      
    } catch (error) {
      if (error.name !== 'AbortError') {
        setError('Failed to send message. Please try again.')
        console.error('Error sending message:', error)
      }
    } finally {
      setIsStreaming(false)
      setStreamingMessage('')
      abortControllerRef.current = null
    }
  }
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const stopStreaming = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }
  
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
  }
  
  const MessageComponent = ({ message }) => {
    const isUser = message.role === 'user'
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`flex gap-4 p-4 rounded-lg ${isUser ? 'message-user' : 'message-assistant'}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-primary-600' : 'bg-secondary-700'
        }`}>
          {isUser ? (
            <User className="w-4 h-4 text-white" />
          ) : (
            <Bot className="w-4 h-4 text-secondary-300" />
          )}
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-300">
              {isUser ? (user?.fullName || user?.username) : 'GrepMind'}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-secondary-500">
                {formatDate(message.created_at)}
              </span>
              <button
                onClick={() => copyToClipboard(message.content)}
                className="p-1 text-secondary-400 hover:text-secondary-200 rounded"
              >
                <Copy className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="prose prose-invert prose-sm max-w-none">
            {isUser ? (
              <p className="text-secondary-100 whitespace-pre-wrap">{message.content}</p>
            ) : (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code({ node, inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || '')
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={oneDark}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg"
                        {...props}
                      >
                        {String(children).replace(/\n$/, '')}
                      </SyntaxHighlighter>
                    ) : (
                      <code className="bg-secondary-800 px-1 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    )
                  }
                }}
              >
                {message.content}
              </ReactMarkdown>
            )}
          </div>
        </div>
      </motion.div>
    )
  }
  
  const StreamingMessage = () => {
    if (!isStreaming && !streamingMessage) return null
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex gap-4 p-4 rounded-lg message-assistant"
      >
        <div className="w-8 h-8 rounded-full bg-secondary-700 flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-secondary-300" />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-secondary-300">GrepMind</span>
            <div className="flex items-center space-x-2">
              <LoadingDots className="text-primary-400" />
              <button
                onClick={stopStreaming}
                className="p-1 text-error-400 hover:text-error-300 rounded"
              >
                <AlertCircle className="w-3 h-3" />
              </button>
            </div>
          </div>
          
          <div className="prose prose-invert prose-sm max-w-none">
            {streamingMessage ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {streamingMessage}
              </ReactMarkdown>
            ) : (
              <div className="flex items-center space-x-2 text-secondary-400">
                <LoadingDots />
                <span className="text-sm">Thinking...</span>
              </div>
            )}
          </div>
          
          {/* Typing cursor */}
          <div className="inline-block w-2 h-4 bg-primary-500 animate-pulse ml-1" />
        </div>
      </motion.div>
    )
  }
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    )
  }
  
  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-secondary-700">
        <div>
          <h1 className="text-lg font-semibold text-white">
            {currentConversationId ? 'Chat Conversation' : 'New Chat'}
          </h1>
          <p className="text-sm text-secondary-400">
            {messages.length > 0 ? `${messages.length} messages` : 'Start a new conversation'}
          </p>
        </div>
        
        <div className="flex items-center space-x-2">
          {context.length > 0 && (
            <div className="text-xs text-secondary-400 bg-secondary-800 px-2 py-1 rounded">
              {context.length} context docs
            </div>
          )}
          <button className="p-2 text-secondary-400 hover:text-secondary-200 rounded-lg hover:bg-secondary-800">
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        <AnimatePresence>
          {messages.map((message) => (
            <MessageComponent key={message.id} message={message} />
          ))}
        </AnimatePresence>
        
        <StreamingMessage />
        
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-error-600/20 border border-error-500/50 rounded-lg"
          >
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-error-400" />
              <span className="text-error-400 text-sm">{error}</span>
            </div>
          </motion.div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      {/* Context Display */}
      {context.length > 0 && (
        <div className="p-4 border-t border-secondary-700 bg-secondary-900/50">
          <h3 className="text-sm font-medium text-secondary-300 mb-2">Context Sources:</h3>
          <div className="flex flex-wrap gap-2">
            {context.map((doc, index) => (
              <div
                key={index}
                className="text-xs bg-secondary-800 px-2 py-1 rounded text-secondary-400"
              >
                {doc.title}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="p-4 border-t border-secondary-700">
        <div className="flex items-end space-x-4">
          <button className="p-2 text-secondary-400 hover:text-secondary-200 rounded-lg hover:bg-secondary-800">
            <Paperclip className="w-5 h-5" />
          </button>
          
          <div className="flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="w-full resize-none bg-secondary-800 text-secondary-100 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              rows={1}
              style={{ minHeight: '44px', maxHeight: '120px' }}
              disabled={isStreaming}
            />
          </div>
          
          <button
            onClick={handleSend}
            disabled={!input.trim() || isStreaming}
            className="btn btn-primary p-3 disabled:opacity-50"
          >
            {isStreaming ? (
              <Loader className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatPage