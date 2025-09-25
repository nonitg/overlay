// ipcHandlers.ts

import { ipcMain, app } from "electron"
import { AppState } from "./main"

export function initializeIpcHandlers(appState: AppState): void {
  ipcMain.handle(
    "update-content-dimensions",
    async (event, { width, height }: { width: number; height: number }) => {
      if (width && height) {
        appState.setWindowDimensions(width, height)
      }
    }
  )

  ipcMain.handle("delete-screenshot", async (event, path: string) => {
    return appState.deleteScreenshot(path)
  })

  ipcMain.handle("take-screenshot", async () => {
    try {
      const screenshotPath = await appState.takeScreenshot()
      const preview = await appState.getImagePreview(screenshotPath)
      return { path: screenshotPath, preview }
    } catch (error) {
      console.error("Error taking screenshot:", error)
      throw error
    }
  })

  ipcMain.handle("get-screenshots", async () => {
    try {
      const screenshots = appState.getScreenshotQueue()
      const previews = await Promise.all(
        screenshots.map(async (path) => ({
          path,
          preview: await appState.getImagePreview(path)
        }))
      )
      return previews
    } catch (error) {
      console.error("Error getting screenshots:", error)
      return []
    }
  })

  ipcMain.handle("toggle-window", async () => {
    appState.toggleMainWindow()
  })

  // Get current screenshot path for follow-up questions
  ipcMain.handle("get-current-screenshot", async () => {
    return appState.getCurrentScreenshot()
  })

  // Get conversation context for display
  ipcMain.handle("get-conversation-context", async () => {
    return appState.getConversationContext()
  })



  // reset-queues handler removed - queue management eliminated

  // Audio processing removed

  // IPC handler for analyzing image from file path
  ipcMain.handle("analyze-image-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().analyzeImageFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-image-file handler:", error)
      throw error
    }
  })

  ipcMain.handle("gemini-chat", async (event, message: string) => {
    try {
      const result = await appState.processingHelper.getLLMHelper().chatWithGemini(message);
      return result;
    } catch (error: any) {
      console.error("Error in gemini-chat handler:", error);
      throw error;
    }
  });

  // new conversation processing handler
  ipcMain.handle("process-question", async (event, data: {
    question?: string,
    screenshotPath: string,
    isNewConversation: boolean,
    useProMode?: boolean
  }) => {
    try {
      const { question, screenshotPath, isNewConversation, useProMode = false } = data
      
      // get AI helper and set model mode
      const llmHelper = appState.processingHelper.getLLMHelper()
      llmHelper.setProMode(useProMode)
      
      console.log(`🤖 Processing with ${useProMode ? 'Gemini Pro' : 'Gemini Flash'} model`)
      
      // prepare prompt based on conversation type
      let fullPrompt: string
      
      if (isNewConversation) {
        // initial question - direct and concise
        const userQuestion = question || "What do you see in this image?"
        fullPrompt = `${llmHelper.systemPrompt}\n\n"${userQuestion}"`
      } else {
        // follow-up question - include full context
        const context = appState.getConversationContext()
        if (context.length > 0) {
          const userQuestion = question || "Continue the conversation"
          fullPrompt = `${llmHelper.systemPrompt}\n\nPrevious:\n${context.join('\n')}\n\n"${userQuestion}"`
        } else {
          // fallback if no context
          const userQuestion = question || "What do you see in this image?"
          fullPrompt = `${llmHelper.systemPrompt}\n\n"${userQuestion}"`
        }
      }
      
      // DEBUG: Log the prompt being sent
      console.log("🔍 Prompt:", fullPrompt.substring(0, 100) + "...")
      
      // process with AI
      const response = await llmHelper.analyzeImageWithPrompt(screenshotPath, fullPrompt)
      
      // store context
      if (isNewConversation) {
        appState.setCurrentScreenshot(screenshotPath)
      }
      appState.addToConversationContext(`User: ${question || "What do you see in this image?"}`)
      appState.addToConversationContext(`AI: ${response.text}`)
      
      return {
        success: true,
        response: response.text,
        timestamp: Date.now(),
        modelUsed: llmHelper.getCurrentModelName()
      }
    } catch (error: any) {
      console.error("Error processing question:", error)
      return {
        success: false,
        error: error.message
      }
    }
  })

  ipcMain.handle("quit-app", () => {
    app.quit()
  })

  // Window movement handlers
  ipcMain.handle("move-window-left", async () => {
    appState.moveWindowLeft()
  })

  ipcMain.handle("move-window-right", async () => {
    appState.moveWindowRight()
  })

  ipcMain.handle("move-window-up", async () => {
    appState.moveWindowUp()
  })

  ipcMain.handle("move-window-down", async () => {
    appState.moveWindowDown()
  })

  ipcMain.handle("center-and-show-window", async () => {
    appState.centerAndShowWindow()
  })

}
