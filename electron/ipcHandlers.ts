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

  // reset-queues handler removed - queue management eliminated

  // IPC handler for analyzing audio from base64 data
  ipcMain.handle("analyze-audio-base64", async (event, data: string, mimeType: string) => {
    try {
      const result = await appState.processingHelper.processAudioBase64(data, mimeType)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-base64 handler:", error)
      throw error
    }
  })

  // IPC handler for analyzing audio from file path
  ipcMain.handle("analyze-audio-file", async (event, path: string) => {
    try {
      const result = await appState.processingHelper.processAudioFile(path)
      return result
    } catch (error: any) {
      console.error("Error in analyze-audio-file handler:", error)
      throw error
    }
  })

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
    isNewConversation: boolean
  }) => {
    try {
      const { question, screenshotPath, isNewConversation } = data
      
      // get AI helper
      const llmHelper = appState.processingHelper.getLLMHelper()
      
      // prepare context
      let prompt = question || "What do you see in this image? Provide a helpful response."
      
      if (!isNewConversation) {
        // add conversation context for follow-ups
        const context = appState.getConversationContext()
        if (context.length > 0) {
          prompt = `Previous context: ${context.join('\n')}\n\nFollow-up: ${prompt}`
        }
      }
      
      // process with AI
      const response = await llmHelper.analyzeImageFile(screenshotPath)
      
      // store context
      if (isNewConversation) {
        appState.setCurrentScreenshot(screenshotPath)
      }
      appState.addToConversationContext(`User: ${prompt}`)
      appState.addToConversationContext(`AI: ${response.text}`)
      
      return {
        success: true,
        response: response.text,
        timestamp: Date.now()
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
