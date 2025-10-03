import React from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Brain, 
  Sparkles, 
  MessageSquare, 
  FileText, 
  Zap, 
  Shield, 
  Users, 
  ArrowRight,
  Github,
  Twitter,
  Mail
} from 'lucide-react'

const LandingPage = () => {
  const features = [
    {
      icon: MessageSquare,
      title: 'Intelligent Conversations',
      description: 'Experience natural, context-aware conversations powered by advanced AI technology.',
    },
    {
      icon: FileText,
      title: 'Document Integration',
      description: 'Upload and query your documents with RAG-powered search and retrieval.',
    },
    {
      icon: Zap,
      title: 'Real-time Streaming',
      description: 'Watch responses unfold in real-time with smooth streaming technology.',
    },
    {
      icon: Shield,
      title: 'Secure & Private',
      description: 'Your data is protected with enterprise-grade security and privacy controls.',
    },
    {
      icon: Users,
      title: 'Collaborative',
      description: 'Share knowledge and collaborate with team members seamlessly.',
    },
    {
      icon: Brain,
      title: 'Advanced AI',
      description: 'Powered by state-of-the-art language models and vector databases.',
    },
  ]
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary-950 via-secondary-900 to-primary-950">
      {/* Navigation */}
      <nav className="bg-secondary-900/80 backdrop-blur-md border-b border-secondary-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Brain className="w-8 h-8 text-primary-500" />
                <Sparkles className="w-4 h-4 text-accent-400 absolute -top-1 -right-1" />
              </div>
              <div>
                <h1 className="text-xl font-bold gradient-text">GrepMind</h1>
                <p className="text-xs text-secondary-400">AI Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="btn btn-ghost text-sm"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="btn btn-primary text-sm"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="text-5xl lg:text-7xl font-bold mb-6">
              <span className="gradient-text">Next-Generation</span>
              <br />
              <span className="text-white">AI Assistant</span>
            </h1>
            
            <p className="text-xl text-secondary-300 mb-8 max-w-3xl mx-auto leading-relaxed">
              Experience intelligent conversations with RAG-powered document integration, 
              real-time streaming, and enterprise-grade security. Your AI companion for 
              knowledge work.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                to="/register"
                className="btn btn-primary text-lg px-8 py-4 group"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="btn btn-ghost text-lg px-8 py-4">
                Watch Demo
              </button>
            </div>
            
            {/* Stats */}
            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary-400">99.9%</div>
                <div className="text-sm text-secondary-400">Uptime</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-accent-400">10M+</div>
                <div className="text-sm text-secondary-400">Messages</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-success-400">50K+</div>
                <div className="text-sm text-secondary-400">Users</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Features Section */}
      <section className="py-20 bg-secondary-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl font-bold mb-4">
              <span className="gradient-text">Powerful Features</span>
            </h2>
            <p className="text-xl text-secondary-300 max-w-2xl mx-auto">
              Everything you need for intelligent AI conversations and document management.
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: index * 0.1 }}
                viewport={{ once: true }}
                className="card group hover:border-primary-500/50 transition-all duration-300"
              >
                <div className="flex items-center mb-4">
                  <div className="p-3 bg-primary-500/20 rounded-lg group-hover:bg-primary-500/30 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white ml-3">
                    {feature.title}
                  </h3>
                </div>
                <p className="text-secondary-300 leading-relaxed">
                  {feature.description}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
      
      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="card-dark"
          >
            <h2 className="text-3xl font-bold mb-4 gradient-text">
              Ready to Get Started?
            </h2>
            <p className="text-lg text-secondary-300 mb-8">
              Join thousands of users who are already experiencing the future of AI conversation.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/register"
                className="btn btn-primary text-lg px-8 py-4"
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="btn btn-secondary text-lg px-8 py-4"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="bg-secondary-950 border-t border-secondary-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="relative">
                  <Brain className="w-8 h-8 text-primary-500" />
                  <Sparkles className="w-4 h-4 text-accent-400 absolute -top-1 -right-1" />
                </div>
                <div>
                  <h1 className="text-xl font-bold gradient-text">GrepMind</h1>
                  <p className="text-xs text-secondary-400">AI Assistant</p>
                </div>
              </div>
              <p className="text-secondary-400 max-w-md">
                Next-generation AI assistant with RAG capabilities, real-time streaming, 
                and enterprise-grade security for modern knowledge workers.
              </p>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-secondary-400">
                <li><a href="#" className="hover:text-secondary-200">Features</a></li>
                <li><a href="#" className="hover:text-secondary-200">Pricing</a></li>
                <li><a href="#" className="hover:text-secondary-200">Documentation</a></li>
                <li><a href="#" className="hover:text-secondary-200">API</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-semibold mb-4">Connect</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-secondary-400 hover:text-secondary-200">
                  <Github className="w-5 h-5" />
                </a>
                <a href="#" className="text-secondary-400 hover:text-secondary-200">
                  <Twitter className="w-5 h-5" />
                </a>
                <a href="#" className="text-secondary-400 hover:text-secondary-200">
                  <Mail className="w-5 h-5" />
                </a>
              </div>
            </div>
          </div>
          
          <div className="border-t border-secondary-800 mt-8 pt-8 text-center text-secondary-400">
            <p>&copy; 2025 GrepMind. Built with ❤️ by MiniMax Agent.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default LandingPage