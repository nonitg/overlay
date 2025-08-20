import React, { useState, useEffect, useRef } from 'react'

interface ConversationBoxProps {
  isVisible: boolean
  onQuestionSubmit: (question: string) => Promise<void>
  isLoading: boolean
  answer: string | null
}

export const ConversationBox: React.FC<ConversationBoxProps> = ({ 
  isVisible, 
  onQuestionSubmit,
  isLoading,
  answer
}) => {
  const [question, setQuestion] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isVisible && !hasSubmitted && inputRef.current) {
      inputRef.current.focus()
      setQuestion('')
    }
  }, [isVisible, hasSubmitted])

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim()
    if (trimmedQuestion && !isLoading) {
      setHasSubmitted(true)
      await onQuestionSubmit(trimmedQuestion)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  // reset when hiding
  useEffect(() => {
    if (!isVisible) {
      setQuestion('')
      setHasSubmitted(false)
    }
  }, [isVisible])

  if (!isVisible) return null

  return (
    <div 
      className="mt-3 w-full flex justify-center"
      style={{ pointerEvents: 'none' }}
    >
      <div 
        className={`liquid-glass-extended rounded-3xl conversation-scrollbar ${!hasSubmitted ? 'px-6 py-4' : 'px-6 py-4'}`}
        style={{ 
          width: '380px',
          pointerEvents: 'auto',
          maxHeight: hasSubmitted ? '300px' : 'auto'
        }}
      >
        {!hasSubmitted ? (
          // input state - compact and visible
          <div className="w-full">
            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question about your screen... (Press Enter to submit)"
              className="w-full bg-transparent border-none resize-none focus:outline-none placeholder-white/60 leading-relaxed conversation-scrollbar"
              rows={question.length > 100 ? 3 : question.length > 50 ? 2 : 1}
              style={{ 
                fontFamily: 'inherit', 
                color: '#ffffff',
                fontSize: '14px'
              }}
            />
          </div>
        ) : (
          // loading and answer state - scrollable
          <div 
            className="w-full conversation-scrollbar"
            style={{ 
              maxHeight: '280px',
              overflowY: 'auto'
            }}
          >
            {isLoading ? (
              <div className="flex items-center gap-4 py-2">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-sm text-white/75">Analyzing screenshot...</span>
              </div>
            ) : answer ? (
              <div className="text-sm text-white/90 leading-relaxed whitespace-pre-wrap py-1">
                {answer}
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
