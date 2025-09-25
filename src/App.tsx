import { ToastProvider } from "./components/ui/toast"
import Main from "./_pages/Main"
import { useEffect, useRef, useState, useCallback, useMemo } from "react"
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
      takeScreenshot: () => Promise<{ path: string; preview: string }>

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
      
      // conversation events
      onNewQuestion?: (callback: () => void) => () => void
      onFollowUpQuestion?: (callback: (data: {
        screenshotPath: string,
        hasContext: boolean
      }) => void) => () => void
      onNoContextWarning?: (callback: () => void) => () => void
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

// debounce utility function
function debounce<T extends (...args: any[]) => void>(
  func: T, 
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
    }, delay)
  }
}

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

  // memoized debounced updateHeight function  
  const updateHeight = useCallback(() => {
    if (!containerRef.current) return
    
    // Get the actual content dimensions - use getBoundingClientRect for accurate sizing
    const rect = containerRef.current.getBoundingClientRect()
    const width = Math.ceil(rect.width)
    const height = Math.ceil(rect.height)
    
    // Cap the maximum size to prevent huge windows and match visible content
    const finalWidth = Math.min(Math.max(width, 600), 750)  // Max 750px wide (to fit narrower conversation box)
    const finalHeight = Math.min(Math.max(height, 400), 800)  // Max 800px tall (to fit larger conversation content)
    
    window.electronAPI?.updateContentDimensions({ 
      width: finalWidth, 
      height: finalHeight 
    })
  }, [])

  // debounced version with 150ms delay to prevent excessive IPC calls
  const debouncedUpdateHeight = useMemo(() => 
    debounce(updateHeight, 150), 
    [updateHeight]
  )

  useEffect(() => {
    if (!containerRef.current) return

    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdateHeight()
    })

    // Initial height update (immediate, not debounced)
    updateHeight()

    // Observe for changes
    resizeObserver.observe(containerRef.current)

    // Also update height when view changes
    const mutationObserver = new MutationObserver(() => {
      debouncedUpdateHeight()
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
  }, [view, updateHeight, debouncedUpdateHeight]) // Re-run when view changes

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
    <div ref={containerRef} className="min-h-0 overflow-hidden">
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <Main setView={setView} />
        </ToastProvider>
      </QueryClientProvider>
    </div>
  )
}

export default App
