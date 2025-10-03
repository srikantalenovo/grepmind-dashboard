export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text
  return text.substring(0, maxLength).replace(/\s+\S*$/, '') + '...'
}

export const extractFirstLine = (text) => {
  if (!text) return ''
  return text.split('\n')[0]
}

export const generateTitle = (text, maxLength = 50) => {
  if (!text) return 'Untitled'
  
  // Remove markdown formatting
  const cleaned = text
    .replace(/[#*`_~]/g, '') // Remove markdown characters
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
  
  if (cleaned.length <= maxLength) return cleaned
  
  // Try to break at word boundary
  const truncated = cleaned.substring(0, maxLength)
  const lastSpace = truncated.lastIndexOf(' ')
  
  if (lastSpace > maxLength * 0.6) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + '...'
}

export const highlightText = (text, query) => {
  if (!query || !text) return text
  
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  return text.replace(regex, '<mark class="bg-yellow-200 text-yellow-900 px-1 rounded">$1</mark>')
}

export const stripHtml = (html) => {
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

export const capitalizeFirst = (str) => {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '')
}

export const parseMetadata = (content) => {
  const lines = content.split('\n')
  const metadata = {}
  let contentStart = 0
  
  // Check if content starts with frontmatter
  if (lines[0] === '---') {
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') {
        contentStart = i + 1
        break
      }
      
      const match = lines[i].match(/^([^:]+):\s*(.*)$/)
      if (match) {
        metadata[match[1].trim()] = match[2].trim()
      }
    }
  }
  
  return {
    metadata,
    content: lines.slice(contentStart).join('\n').trim(),
  }
}