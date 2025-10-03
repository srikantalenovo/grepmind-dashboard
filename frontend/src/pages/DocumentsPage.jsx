import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Plus,
  Search,
  Filter,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Upload,
  FileText,
  Globe,
  Lock,
  Calendar,
  User,
  X
} from 'lucide-react'
import { documentsAPI } from '../services/api'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { formatDate, formatRelativeTime } from '../utils/date'
import { truncateText } from '../utils/text'
import toast from 'react-hot-toast'

const DocumentsPage = () => {
  const [documents, setDocuments] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPublic, setFilterPublic] = useState(null)
  const [selectedDocument, setSelectedDocument] = useState(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 })
  
  const [newDocument, setNewDocument] = useState({
    title: '',
    content: '',
    isPublic: false,
    metadata: {}
  })
  
  useEffect(() => {
    loadDocuments()
  }, [pagination.page, searchQuery, filterPublic])
  
  const loadDocuments = async () => {
    try {
      setIsLoading(true)
      const response = await documentsAPI.getDocuments(
        pagination.page,
        pagination.limit,
        searchQuery,
        filterPublic
      )
      setDocuments(response.documents)
      setPagination(prev => ({ ...prev, total: response.pagination.total }))
    } catch (error) {
      toast.error('Failed to load documents')
    } finally {
      setIsLoading(false)
    }
  }
  
  const handleCreateDocument = async () => {
    try {
      if (!newDocument.title.trim() || !newDocument.content.trim()) {
        toast.error('Title and content are required')
        return
      }
      
      await documentsAPI.createDocument(newDocument)
      toast.success('Document created successfully')
      setIsCreateModalOpen(false)
      setNewDocument({ title: '', content: '', isPublic: false, metadata: {} })
      loadDocuments()
    } catch (error) {
      toast.error('Failed to create document')
    }
  }
  
  const handleUpdateDocument = async () => {
    try {
      if (!selectedDocument.title.trim() || !selectedDocument.content.trim()) {
        toast.error('Title and content are required')
        return
      }
      
      await documentsAPI.updateDocument(selectedDocument.id, {
        title: selectedDocument.title,
        content: selectedDocument.content,
        isPublic: selectedDocument.is_public,
        metadata: selectedDocument.metadata || {}
      })
      toast.success('Document updated successfully')
      setIsEditModalOpen(false)
      setSelectedDocument(null)
      loadDocuments()
    } catch (error) {
      toast.error('Failed to update document')
    }
  }
  
  const handleDeleteDocument = async (documentId) => {
    if (!confirm('Are you sure you want to delete this document?')) return
    
    try {
      await documentsAPI.deleteDocument(documentId)
      toast.success('Document deleted successfully')
      loadDocuments()
    } catch (error) {
      toast.error('Failed to delete document')
    }
  }
  
  const DocumentCard = ({ document }) => {
    const [showActions, setShowActions] = useState(false)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card group hover:border-primary-500/30 transition-all duration-300 relative"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary-500/20 rounded-lg">
              <FileText className="w-5 h-5 text-primary-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-white truncate group-hover:text-primary-300 transition-colors">
                {document.title}
              </h3>
              <div className="flex items-center space-x-4 text-sm text-secondary-400">
                <div className="flex items-center space-x-1">
                  {document.is_public ? (
                    <Globe className="w-3 h-3" />
                  ) : (
                    <Lock className="w-3 h-3" />
                  )}
                  <span>{document.is_public ? 'Public' : 'Private'}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>{formatRelativeTime(document.created_at)}</span>
                </div>
                {!document.isOwner && (
                  <div className="flex items-center space-x-1">
                    <User className="w-3 h-3" />
                    <span>Shared</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 text-secondary-400 hover:text-secondary-200 rounded-lg hover:bg-secondary-800"
            >
              <MoreVertical className="w-4 h-4" />
            </button>
            
            <AnimatePresence>
              {showActions && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute right-0 top-12 w-48 bg-secondary-800 border border-secondary-700 rounded-lg shadow-lg z-10"
                >
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setSelectedDocument(document)
                        setShowActions(false)
                      }}
                      className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-secondary-300 hover:bg-secondary-700"
                    >
                      <Eye className="w-4 h-4" />
                      <span>View</span>
                    </button>
                    {document.isOwner && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedDocument(document)
                            setIsEditModalOpen(true)
                            setShowActions(false)
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-secondary-300 hover:bg-secondary-700"
                        >
                          <Edit className="w-4 h-4" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => {
                            handleDeleteDocument(document.id)
                            setShowActions(false)
                          }}
                          className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-error-400 hover:bg-error-600/20"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        <p className="text-secondary-300 text-sm leading-relaxed mb-4">
          {truncateText(document.content, 150)}
        </p>
        
        <div className="flex items-center justify-between text-xs text-secondary-500">
          <span>Updated {formatDate(document.updated_at)}</span>
          <span>{document.content.length} characters</span>
        </div>
      </motion.div>
    )
  }
  
  const CreateDocumentModal = () => (
    <AnimatePresence>
      {isCreateModalOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setIsCreateModalOpen(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-secondary-900 border border-secondary-700 rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white">Create New Document</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-2 text-secondary-400 hover:text-secondary-200 rounded-lg hover:bg-secondary-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Title *
                </label>
                <input
                  type="text"
                  value={newDocument.title}
                  onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
                  className="input"
                  placeholder="Enter document title"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-secondary-200 mb-2">
                  Content *
                </label>
                <textarea
                  value={newDocument.content}
                  onChange={(e) => setNewDocument({ ...newDocument, content: e.target.value })}
                  className="input h-64 resize-y"
                  placeholder="Enter document content (supports Markdown)"
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newDocument.isPublic}
                  onChange={(e) => setNewDocument({ ...newDocument, isPublic: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-secondary-600 rounded bg-secondary-700"
                />
                <label htmlFor="isPublic" className="text-sm text-secondary-300">
                  Make this document public (others can view and search it)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="btn btn-ghost"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDocument}
                className="btn btn-primary"
              >
                Create Document
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
  
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Documents</h1>
          <p className="text-secondary-400 mt-1">
            Manage your knowledge base for AI-powered conversations
          </p>
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>New Document</span>
        </button>
      </div>
      
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-secondary-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10"
            placeholder="Search documents..."
          />
        </div>
        
        <div className="flex space-x-2">
          <select
            value={filterPublic || ''}
            onChange={(e) => setFilterPublic(e.target.value ? e.target.value === 'true' : null)}
            className="bg-secondary-800 border border-secondary-700 text-secondary-100 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Documents</option>
            <option value="false">Private Only</option>
            <option value="true">Public Only</option>
          </select>
          
          <button className="btn btn-ghost flex items-center space-x-2">
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>
      </div>
      
      {/* Documents Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="lg" />
        </div>
      ) : documents.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {documents.map((document) => (
            <DocumentCard key={document.id} document={document} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-16 h-16 text-secondary-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-secondary-300 mb-2">
            {searchQuery ? 'No documents found' : 'No documents yet'}
          </h3>
          <p className="text-secondary-400 mb-6">
            {searchQuery
              ? 'Try adjusting your search query or filters'
              : 'Create your first document to get started with AI-powered search'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary"
            >
              Create First Document
            </button>
          )}
        </div>
      )}
      
      {/* Pagination */}
      {pagination.total > pagination.limit && (
        <div className="flex items-center justify-center space-x-4">
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
            disabled={pagination.page === 1}
            className="btn btn-ghost disabled:opacity-50"
          >
            Previous
          </button>
          
          <span className="text-secondary-400">
            Page {pagination.page} of {Math.ceil(pagination.total / pagination.limit)}
          </span>
          
          <button
            onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
            disabled={pagination.page >= Math.ceil(pagination.total / pagination.limit)}
            className="btn btn-ghost disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
      
      <CreateDocumentModal />
      
      {/* Edit Modal would go here - similar structure to CreateDocumentModal */}
      {/* Document View Modal would go here */}
    </div>
  )
}

export default DocumentsPage