import React, { useState, useEffect, useRef } from 'react'
import { Copy } from 'lucide-react'
import { 
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "./ui/toast"

interface ConversationBoxProps {
  isVisible: boolean
  onQuestionSubmit: (question: string) => Promise<void>
  isLoading: boolean
  answer: string | null
  isFollowUp?: boolean
  onClose?: () => void
}

export const ConversationBox: React.FC<ConversationBoxProps> = ({ 
  isVisible, 
  onQuestionSubmit,
  isLoading,
  answer,
  isFollowUp = false,
  onClose
}) => {
  const [question, setQuestion] = useState('')
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // toast state for copy feedback
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: '',
    description: '',
    variant: 'success'
  })

  // toast helper function
  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant = 'success'
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  // copy to clipboard function
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showToast("Copied!", "Response copied to clipboard", "success")
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
      showToast("Copy Failed", "Unable to copy to clipboard", "error")
    }
  }

  // parse conversation content to separate user questions from AI responses
  const parseConversationContent = (content: string) => {
    // if content doesn't contain "User:" or "AI:" patterns, it's likely a simple AI response
    if (!content.includes('User: ') && !content.includes('AI: ')) {
      return []  // return empty array to trigger fallback rendering
    }
    
    const parts = content.split('\n\n---\n\n')
    const conversation = []
    
    for (const part of parts) {
      const lines = part.split('\n')
      let currentSection = { user: '', ai: '' }
      let isUserSection = false
      let isAiSection = false
      
      for (const line of lines) {
        if (line.startsWith('User: ')) {
          isUserSection = true
          isAiSection = false
          currentSection.user = line.substring(6).trim()
        } else if (line.startsWith('AI: ')) {
          isUserSection = false
          isAiSection = true
          currentSection.ai = line.substring(4).trim()
        } else if (isAiSection && line.trim()) {
          currentSection.ai += '\n' + line
        } else if (isUserSection && line.trim()) {
          currentSection.user += '\n' + line
        }
      }
      
      if (currentSection.user || currentSection.ai) {
        conversation.push(currentSection)
      }
    }
    
    return conversation
  }

  useEffect(() => {
    if (isVisible && !hasSubmitted && inputRef.current) {
      // Add small delay to ensure textarea is fully rendered and visible
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 100)
      setQuestion('')
    }
  }, [isVisible, hasSubmitted])

  const handleSubmit = async () => {
    const trimmedQuestion = question.trim()
    if (trimmedQuestion && !isLoading) {
      setHasSubmitted(true)
      await onQuestionSubmit(trimmedQuestion)
      
      // For follow-ups, clear the input and reset for next follow-up
      if (isFollowUp) {
        setQuestion('')
        setHasSubmitted(false)
      }
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      if (onClose) {
        onClose()
      }
    }
  }

  // reset when hiding or when switching conversation modes
  useEffect(() => {
    if (!isVisible) {
      setQuestion('')
      setHasSubmitted(false)
    }
  }, [isVisible])

  // reset when switching from follow-up to new question or vice versa
  useEffect(() => {
    setQuestion('')
    setHasSubmitted(false)
  }, [isFollowUp])

  // reset hasSubmitted when entering follow-up mode and focus input
  useEffect(() => {
    if (isVisible && isFollowUp && hasSubmitted) {
      setHasSubmitted(false)
      setQuestion('')
      // Focus the input field when follow-up mode becomes active
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 150)
    }
  }, [isVisible, isFollowUp])
  
  // Additional focus effect for follow-up mode
  useEffect(() => {
    if (isVisible && isFollowUp && !isLoading && !hasSubmitted) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus()
        }
      }, 200)
    }
  }, [isVisible, isFollowUp, isLoading, hasSubmitted])

  if (!isVisible) return null

  return (
    <div 
      className="mt-1 w-full flex justify-center"
      style={{ 
        pointerEvents: 'none'
      }}
    >
      <div 
        className={`liquid-glass-extended rounded-2xl ${!hasSubmitted ? 'px-3 py-2' : 'px-3 py-2'}`}
        style={{ 
          width: 'min(650px, calc(100vw - 24px))',
          maxWidth: '650px',
          minWidth: '400px',
          pointerEvents: 'auto',
          zIndex: 10
        }}
      >
        {!hasSubmitted && !answer ? (
          // input state - compact, no scrollbar
          <div className="w-full">

            <textarea
              ref={inputRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a question..."
              className="w-full bg-transparent border-none resize-none focus:outline-none placeholder-white/50 leading-relaxed"
              rows={question.length > 150 ? 4 : question.length > 100 ? 3 : question.length > 50 ? 2 : 1}
              style={{ 
                fontFamily: 'inherit', 
                color: '#ffffff',
                fontSize: '14px',
                overflow: 'hidden'
              }}
              autoFocus
            />
            <div className="mt-1 text-xs text-white/30">
              Enter to submit • Esc to close
            </div>
          </div>
        ) : (
          // conversation display with improved formatting + input for follow-ups
          <div className="w-full">
            {/* Show existing conversation content */}
            <div 
              className="w-full"
              style={{ 
                maxHeight: '400px',
                overflowY: answer && answer.length > 800 ? 'auto' : 'visible'
              }}
            >
            {isLoading ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                <span className="text-sm text-white/75">
                  {isFollowUp ? "Adding to conversation..." : "Analyzing..."}
                </span>
              </div>
            ) : answer ? (
              <div 
                className={`${answer.length > 800 ? 'conversation-scrollbar pr-2' : ''}`}
              >
                {(() => {
                  const conversation = parseConversationContent(answer)
                  if (conversation.length > 0) {
                    return conversation.map((entry, index) => (
                      <div key={index} className={index > 0 ? 'mt-2' : ''}>
                        {/* User question - minimal and tucked away */}
                        {entry.user && (
                          <div className="mb-1.5">
                            <div className="text-xs text-white/35 leading-tight">{entry.user}</div>
                          </div>
                        )}
                        
                        {/* AI response - main content */}
                        {entry.ai && (
                          <div className="group relative">
                            <div className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">
                              {entry.ai}
                            </div>
                            <button
                              onClick={() => copyToClipboard(entry.ai)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10"
                              title="Copy response"
                            >
                              <Copy className="w-3.5 h-3.5 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  } else {
                    // fallback for non-parsed content
                    return (
                      <div className="group relative">
                        <div className="text-[15px] text-white/90 leading-relaxed whitespace-pre-wrap">
                          {answer}
                        </div>
                        <button
                          onClick={() => copyToClipboard(answer)}
                          className="absolute top-1 right-1 opacity-0 group-hover:opacity-70 hover:opacity-100 transition-opacity p-1.5 rounded hover:bg-white/10"
                          title="Copy response"
                        >
                          <Copy className="w-3.5 h-3.5 text-white" />
                        </button>
                      </div>
                    )
                  }
                })()}
            </div>
            ) : null}
            </div>
            
            {/* Show input field if in follow-up mode and ready for input */}
            {isFollowUp && !isLoading && (
              <div className="mt-3 pt-3 border-t border-white/10">
                <textarea
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask a follow-up question..."
                  className="w-full bg-transparent border-none resize-none focus:outline-none placeholder-white/40 leading-relaxed"
                  rows={question.length > 150 ? 4 : question.length > 100 ? 3 : question.length > 50 ? 2 : 1}
                  style={{ 
                    fontFamily: 'inherit', 
                    color: '#ffffff',
                    fontSize: '14px',
                    overflow: 'hidden'
                  }}
                  autoFocus
                />
                <div className="mt-1 text-xs text-white/25">
                  Enter to add to conversation • Esc to close
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Toast for copy feedback */}
      <Toast
        open={toastOpen}
        onOpenChange={setToastOpen}
        variant={toastMessage.variant}
        duration={2000}
      >
        <ToastTitle>{toastMessage.title}</ToastTitle>
        <ToastDescription>{toastMessage.description}</ToastDescription>
      </Toast>
    </div>
  )
}
