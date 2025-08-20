import { ToastProvider } from "./components/ui/toast"
import Main from "./_pages/Main"
import { useEffect, useRef, useState } from "react"
import { QueryClient, QueryClientProvider } from "react-query"

declare global {
  interface Window {
    electronAPI: {
      //RANDOM GETTER/SETTERS
      updateContentDimensions: (dimensions: {
        width: number
        height: number
      }) => Promise<void>
      getScreenshots: () => Promise<Array<{ path: string; preview: string }>>

      //GLOBAL EVENTS
      //TODO: CHECK THAT PROCESSING NO SCREENSHOTS AND TAKE SCREENSHOTS ARE BOTH CONDITIONAL
      onUnauthorized: (callback: () => void) => () => void
      onScreenshotTaken: (
        callback: (data: { path: string; preview: string }) => void
      ) => () => void
      onProcessingNoScreenshots: (callback: () => void) => () => void
      onResetView: (callback: () => void) => () => void
      takeScreenshot: () => Promise<void>

      // solution/debug events removed
      deleteScreenshot: (
        path: string
      ) => Promise<{ success: boolean; error?: string }>

      // Audio Processing
      analyzeAudioFromBase64: (data: string, mimeType: string) => Promise<{ text: string; timestamp: number }>
      analyzeAudioFile: (path: string) => Promise<{ text: string; timestamp: number }>

      moveWindowLeft: () => Promise<void>
      moveWindowRight: () => Promise<void>
      moveWindowUp: () => Promise<void>
      moveWindowDown: () => Promise<void>
      quitApp: () => Promise<void>
      invoke: (channel: string, ...args: any[]) => Promise<any>
    }
  }
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: Infinity,
      cacheTime: Infinity
    }
  }
})

const App: React.FC = () => {
  const [view, setView] = useState<"main">("main")
  const containerRef = useRef<HTMLDivElement>(null)

  // Effect for height monitoring
  useEffect(() => {
    const cleanup = window.electronAPI.onResetView(() => {
      console.log("Received 'reset-view' message from main process.")
      queryClient.invalidateQueries(["screenshots"])
      setView("main")
    })

    return () => {
      cleanup()
    }
  }, [])

  useEffect(() => {
    if (!containerRef.current) return

    const updateHeight = () => {
      if (!containerRef.current) return
      
      // Get the actual content dimensions - use getBoundingClientRect for accurate sizing
      const rect = containerRef.current.getBoundingClientRect()
      const width = Math.ceil(rect.width)
      const height = Math.ceil(rect.height)
      
      // Cap the maximum size to prevent huge windows
      const finalWidth = Math.min(Math.max(width, 200), 800)  // Max 800px wide
      const finalHeight = Math.min(Math.max(height, 100), 600)  // Max 600px tall
      
      window.electronAPI?.updateContentDimensions({ 
        width: finalWidth, 
        height: finalHeight 
      })
    }

    const resizeObserver = new ResizeObserver(() => {
      updateHeight()
    })

    // Initial height update
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      updateHeight()
    })

    mutationObserver.observe(containerRef.current, {
      childList: true,
      subtree: true,
      attributes: true,
      characterData: true
    })

    return () => {
      resizeObserver.disconnect()
      mutationObserver.disconnect()
    }
  }, [view]) // Re-run when view changes

  useEffect(() => {
    const cleanupFunctions = [
      window.electronAPI.onUnauthorized(() => {
        queryClient.removeQueries(["screenshots"])
        setView("main")
        console.log("Unauthorized")
      }),
      window.electronAPI.onResetView(() => {
        console.log("Received 'reset-view' message from main process")
        queryClient.removeQueries(["screenshots"])
        setView("main")
        console.log("View reset to 'main' via Command+R shortcut")
      })
    ]
    return () => cleanupFunctions.forEach((cleanup) => cleanup())
  }, [])

  return (
    <div ref={containerRef} className="min-h-0 w-fit max-w-2xl overflow-visible">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Main setView={setView} />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
