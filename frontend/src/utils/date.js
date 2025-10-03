import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns'

export const formatDate = (date) => {
  const dateObj = new Date(date)
  
  if (isToday(dateObj)) {
    return `Today at ${format(dateObj, 'HH:mm')}`
  }
  
  if (isYesterday(dateObj)) {
    return `Yesterday at ${format(dateObj, 'HH:mm')}`
  }
  
  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEEE at HH:mm')
  }
  
  if (isThisYear(dateObj)) {
    return format(dateObj, 'MMM d at HH:mm')
  }
  
  return format(dateObj, 'MMM d, yyyy')
}

export const formatRelativeTime = (date) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export const formatShortDate = (date) => {
  const dateObj = new Date(date)
  
  if (isToday(dateObj)) {
    return format(dateObj, 'HH:mm')
  }
  
  if (isYesterday(dateObj)) {
    return 'Yesterday'
  }
  
  if (isThisWeek(dateObj)) {
    return format(dateObj, 'EEE')
  }
  
  if (isThisYear(dateObj)) {
    return format(dateObj, 'MMM d')
  }
  
  return format(dateObj, 'MMM yyyy')
}