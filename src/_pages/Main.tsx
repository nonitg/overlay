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
    setIsProcessing(true)
    setConversationAnswer(null)
    
    try {
      // take screenshot after getting the question
      const screenshotPath = await window.electronAPI.takeScreenshot()
      
      // process with AI
      const result = await window.electronAPI.invoke("process-question", {
        question: question,
        screenshotPath: screenshotPath.path,
        isNewConversation: true
      })
      
      if (result.success) {
        setConversationAnswer(result.response)
      } else {
        setConversationAnswer(`Error: ${result.error}`)
      }
    } catch (error: any) {
      setConversationAnswer(`Error: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  useEffect(() => {

    const cleanupFunctions = [
      window.electronAPI.onScreenshotTaken(() => refetch()),
      window.electronAPI.onResetView(() => refetch()),
      window.electronAPI.onProcessingNoScreenshots(() => {
        showToast(
          "No Screenshots",
          "There are no screenshots to process.",
          "neutral"
        )
      }),

      // handle new question events - show conversation box
      window.electronAPI.onNewQuestion?.(() => {
        console.log("📨 Received new-question event - showing conversation box")
        setShowConversation(true)
        setConversationAnswer(null)
      }),

      // handle follow-up events
      window.electronAPI.onFollowUpQuestion?.(async (data: {
        screenshotPath: string,
        hasContext: boolean
      }) => {
        if (!data.hasContext) {
          console.log("No context available for follow-up")
          return
        }
        
        setIsProcessing(true)
        setShowConversation(true)
        
        try {
          const result = await window.electronAPI.invoke("process-question", {
            screenshotPath: data.screenshotPath,
            isNewConversation: false
          })
          
          if (result.success) {
            // extend existing content
            setConversationAnswer(prev => 
              prev ? `${prev}\n\n---\n\n${result.response}` : result.response
            )
          }
        } catch (error: any) {
          setConversationAnswer(prev => 
            prev ? `${prev}\n\nError: ${error.message}` : `Error: ${error.message}`
          )
        } finally {
          setIsProcessing(false)
        }
      }),

      // handle no context warning
      window.electronAPI.onNoContextWarning?.(() => {
        console.log("No existing conversation context")
        // could show a brief message or just start new conversation
      })
    ]

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
        width: "100%",
        pointerEvents: "auto"
      }}
      className="select-none max-w-full overflow-visible"
    >
      <div className="bg-transparent w-full max-w-full overflow-visible relative">
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
          <div className="w-full">
            <MainCommands />
            
            <ConversationBox 
              isVisible={showConversation}
              onQuestionSubmit={handleQuestionSubmit}
              isLoading={isProcessing}
              answer={conversationAnswer}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default Main
