import React, { useState, useEffect, useRef } from "react"
import { useQuery } from "react-query"
import ScreenshotQueue from "../components/Queue/ScreenshotQueue"
import {
  Toast,
  ToastTitle,
  ToastDescription,
  ToastVariant,
  ToastMessage
} from "../components/ui/toast"
import MainCommands from "../components/Queue/MainCommands"
import { ConversationBox } from "../components/ConversationBox"

interface MainProps {
  setView: React.Dispatch<React.SetStateAction<"main">>
}

const Main: React.FC<MainProps> = ({ setView: _setView }) => {
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<ToastMessage>({
    title: "",
    description: "",
    variant: "neutral"
  })

  // conversation state
  const [showConversation, setShowConversation] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [conversationAnswer, setConversationAnswer] = useState<string | null>(null)
  const [isFollowUpMode, setIsFollowUpMode] = useState(false)
  
  // pro mode state
  const [isProMode, setIsProMode] = useState(false)

  // reset conversation state
  const resetConversation = () => {
    setShowConversation(false)
    setConversationAnswer(null)
    setIsFollowUpMode(false)
    setIsProcessing(false)
  }

  // reset for new question (keeps dialog open)
  const resetForNewQuestion = () => {
    setConversationAnswer(null)
    setIsFollowUpMode(false)
    setIsProcessing(false)
  }

  const contentRef = useRef<HTMLDivElement>(null)

  // chat state variables removed

  const barRef = useRef<HTMLDivElement>(null)

  const { data: screenshots = [], refetch } = useQuery<Array<{ path: string; preview: string }>, Error>(
    ["screenshots"],
    async () => {
      try {
        const existing = await window.electronAPI.getScreenshots()
        return existing
      } catch (error) {
        console.error("Error loading screenshots:", error)
        showToast("Error", "Failed to load existing screenshots", "error")
        return []
      }
    },
    {
      staleTime: Infinity,
      cacheTime: Infinity,
      refetchOnWindowFocus: true,
      refetchOnMount: true
    }
  )

  const showToast = (
    title: string,
    description: string,
    variant: ToastVariant
  ) => {
    setToastMessage({ title, description, variant })
    setToastOpen(true)
  }

  const handleDeleteScreenshot = async (index: number) => {
    const screenshotToDelete = screenshots[index]

    try {
      const response = await window.electronAPI.deleteScreenshot(
        screenshotToDelete.path
      )

      if (response.success) {
        refetch()
      } else {
        console.error("Failed to delete screenshot:", response.error)
        showToast("Error", "Failed to delete the screenshot file", "error")
      }
    } catch (error) {
      console.error("Error deleting screenshot:", error)
    }
  }

  // conversation handler
  const handleQuestionSubmit = async (question: string) => {
    const isCurrentlyFollowUp = isFollowUpMode
    
    setIsProcessing(true)
    
    try {
      let screenshotPath: { path: string; preview: string }
      
      if (isCurrentlyFollowUp) {
        // follow-up: don't take new screenshot, use existing one
        // get current screenshot from the conversation context
        const currentScreenshotPath = await window.electronAPI.invoke("get-current-screenshot")
        if (!currentScreenshotPath) {
          throw new Error("No existing screenshot found for follow-up")
        }
        screenshotPath = { path: currentScreenshotPath, preview: "" }
      } else {
        // new question: take fresh screenshot
        screenshotPath = await window.electronAPI.takeScreenshot()
      }
      
      // process with AI
      const result = await window.electronAPI.invoke("process-question", {
        question: question,
        screenshotPath: screenshotPath.path,
        isNewConversation: !isCurrentlyFollowUp,
        useProMode: isProMode
      })
      
      if (result.success) {
        if (isCurrentlyFollowUp) {
          // for follow-up, add to existing conversation
          const followupEntry = `User: ${question}\nAI: ${result.response}`
          setConversationAnswer(prev => 
            prev ? `${prev}\n\n---\n\n${followupEntry}` : followupEntry
          )
        } else {
          // new conversation - format with user question
          const newConversation = `User: ${question}\nAI: ${result.response}`
          setConversationAnswer(newConversation)
        }
      } else {
        const errorMsg = `Error: ${result.error}`
        if (isCurrentlyFollowUp) {
          setConversationAnswer(prev => 
            prev ? `${prev}\n\n---\n\n${errorMsg}` : errorMsg
          )
        } else {
          setConversationAnswer(errorMsg)
        }
      }
    } catch (error: any) {
      const errorMsg = `Error: ${error.message}`
      if (isCurrentlyFollowUp) {
        setConversationAnswer(prev => 
          prev ? `${prev}\n\n---\n\n${errorMsg}` : errorMsg
        )
      } else {
        setConversationAnswer(errorMsg)
      }
    } finally {
      setIsProcessing(false)
      // keep follow-up mode active if this was a follow-up question
      if (!isCurrentlyFollowUp) {
        setIsFollowUpMode(false)
      }
    }
  }

  useEffect(() => {
    


    const cleanupFunctions: Array<() => void> = []

    // Basic event listeners that should always work
    if (window.electronAPI.onScreenshotTaken) {
      cleanupFunctions.push(window.electronAPI.onScreenshotTaken(() => refetch()))
    }
    
    if (window.electronAPI.onResetView) {
      cleanupFunctions.push(window.electronAPI.onResetView(() => {
        refetch()
        resetConversation()
      }))
    }
    
    if (window.electronAPI.onProcessingNoScreenshots) {
      cleanupFunctions.push(window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      }))
    }

        // handle new question events - show conversation box
    if (window.electronAPI.onNewQuestion) {
             const cleanup = window.electronAPI.onNewQuestion(() => {
        // reset state but keep dialog open for new questions
        resetForNewQuestion()
        setShowConversation(true)
      })
      cleanupFunctions.push(cleanup)
    }

    // handle follow-up events
    if (window.electronAPI.onFollowUpQuestion) {
      const cleanup = window.electronAPI.onFollowUpQuestion(async (data: {
        screenshotPath: string,
        hasContext: boolean
      }) => {
        if (!data.hasContext) {
          showToast("No Context", "No existing conversation to continue", "neutral")
          return
        }
        
        // load existing conversation context when opening follow-up
        try {
          const context = await window.electronAPI.invoke("get-conversation-context")
          if (context && context.length > 0) {
            // display full conversation context for follow-ups
            const formattedContext = context.join('\n\n')
            if (formattedContext) {
              setConversationAnswer(formattedContext)
            }
          }
        } catch (error) {
          console.error("Error loading conversation context:", error)
        }
        
        setShowConversation(true)
        setIsFollowUpMode(true)
      })
      
      if (cleanup && typeof cleanup === 'function') {
        cleanupFunctions.push(cleanup)
      }
    }

    // handle no context warning  
    if (window.electronAPI.onNoContextWarning) {
      const cleanup = window.electronAPI.onNoContextWarning(() => {
        showToast("No Context", "Start a new conversation first", "neutral")
      })
      cleanupFunctions.push(cleanup)
    }

    return () => {
      cleanupFunctions.forEach((cleanup) => cleanup?.())
    }
  }, [])

  // chat LLM flow removed



  // handleChatToggle function removed


  return (
    <div
      ref={barRef}
      style={{
        position: "relative",
        pointerEvents: "auto"
      }}
      className="select-none overflow-hidden"
    >
      <div className="bg-transparent overflow-hidden relative">
        <div className="px-2 py-1">
          <Toast
            open={toastOpen}
            onOpenChange={setToastOpen}
            variant={toastMessage.variant}
            duration={3000}
          >
            <ToastTitle>{toastMessage.title}</ToastTitle>
            <ToastDescription>{toastMessage.description}</ToastDescription>
          </Toast>
          <div className="w-full flex justify-center">
            <MainCommands 
              isProMode={isProMode}
              onProModeToggle={setIsProMode}
              isProcessing={isProcessing}
            />
          </div>
        </div>
        
        {/* ConversationBox outside the padding constraint */}
        <ConversationBox 
          isVisible={showConversation}
          onQuestionSubmit={handleQuestionSubmit}
          isLoading={isProcessing}
          answer={conversationAnswer}
          isFollowUp={isFollowUpMode}
          onClose={resetConversation}
        />
      </div>
    </div>
  )
}

export default Main
