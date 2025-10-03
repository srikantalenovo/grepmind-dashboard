import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../utils/cn'

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-8 w-8 border-3',
  xl: 'h-12 w-12 border-4',
}

const colors = {
  primary: 'border-primary-500 border-t-transparent',
  secondary: 'border-secondary-400 border-t-transparent',
  white: 'border-white border-t-transparent',
  current: 'border-current border-t-transparent',
}

export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'primary', 
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'animate-spin rounded-full',
        sizes[size],
        colors[color],
        className
      )}
      {...props}
    />
  )
}

export const LoadingDots = ({ className = '' }) => {
  return (
    <div className={cn('flex space-x-1', className)}>
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-current rounded-full"
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.2,
          }}
        />
      ))}
    </div>
  )
}

export const LoadingPulse = ({ className = '' }) => {
  return (
    <motion.div
      className={cn(
        'w-4 h-4 bg-current rounded-full',
        className
      )}
      animate={{
        scale: [1, 1.3, 1],
        opacity: [0.7, 1, 0.7],
      }}
      transition={{
        duration: 1.5,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  )
}

export const LoadingBar = ({ progress = 0, className = '' }) => {
  return (
    <div className={cn('w-full bg-secondary-700 rounded-full h-2', className)}>
      <motion.div
        className="bg-primary-500 h-2 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${progress}%` }}
        transition={{ duration: 0.3 }}
      />
    </div>
  )
}

export default LoadingSpinner