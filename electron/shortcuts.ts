import { globalShortcut, app } from "electron"
import { AppState } from "./main" // Adjust the import path if necessary

export class ShortcutsHelper {
  private appState: AppState

  constructor(appState: AppState) {
    this.appState = appState
  }

  public registerGlobalShortcuts(): void {
    console.log("🔧 Registering global shortcuts...")
    
    // Add global shortcut to show/center window
    const spaceShortcut = globalShortcut.register("CommandOrControl+Shift+Space", () => {
      console.log("✅ Show/Center window shortcut pressed...")
      this.appState.centerAndShowWindow()
    })
    console.log("🔧 CommandOrControl+Shift+Space registered:", spaceShortcut)

    // cmd+h screenshot functionality removed

    const enterShortcut = globalShortcut.register("CommandOrControl+Enter", async () => {
      console.log("✅ Cmd+Enter pressed - New question: show dialog first")
      
      try {
        // clear existing context
        this.appState.clearConversationContext()
        
        // send event to show question dialog
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow) {
          console.log("📤 Sending new-question event to renderer")
          mainWindow.webContents.send("new-question")
        } else {
          console.error("❌ No main window available")
        }
      } catch (error) {
        console.error("❌ Error in new question flow:", error)
      }
    })
    console.log("🔧 CommandOrControl+Enter registered:", enterShortcut)

    globalShortcut.register("CommandOrControl+Shift+Enter", async () => {
      console.log("Follow-up question: same context")
      
      try {
        // check if we have existing context
        const currentScreenshot = this.appState.getCurrentScreenshot()
        if (!currentScreenshot) {
          console.log("No existing conversation - treating as new question")
          // trigger new question flow instead
          this.appState.getMainWindow()?.webContents.send("no-context-warning")
          return
        }
        
        // send follow-up event to renderer
        const mainWindow = this.appState.getMainWindow()
        if (mainWindow) {
          mainWindow.webContents.send("follow-up-question", {
            screenshotPath: currentScreenshot,
            hasContext: true
          })
        }
      } catch (error) {
        console.error("Error in follow-up flow:", error)
      }
    })

    // cmd+r reset functionality removed

    // New shortcuts for moving the window
    globalShortcut.register("CommandOrControl+Left", () => {
      console.log("Command/Ctrl + Left pressed. Moving window left.")
      this.appState.moveWindowLeft()
    })

    globalShortcut.register("CommandOrControl+Right", () => {
      console.log("Command/Ctrl + Right pressed. Moving window right.")
      this.appState.moveWindowRight()
    })
    globalShortcut.register("CommandOrControl+Down", () => {
      console.log("Command/Ctrl + down pressed. Moving window down.")
      this.appState.moveWindowDown()
    })
    globalShortcut.register("CommandOrControl+Up", () => {
      console.log("Command/Ctrl + Up pressed. Moving window Up.")
      this.appState.moveWindowUp()
    })

    globalShortcut.register("CommandOrControl+B", () => {
      this.appState.toggleMainWindow()
      // If window exists and we're showing it, bring it to front
      const mainWindow = this.appState.getMainWindow()
      if (mainWindow && !this.appState.isVisible()) {
        // Force the window to the front on macOS
        if (process.platform === "darwin") {
          mainWindow.setAlwaysOnTop(true, "normal")
          // Reset alwaysOnTop after a brief delay
          setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.setAlwaysOnTop(true, "floating")
            }
          }, 100)
        }
      }
    })

    // Unregister shortcuts when quitting
    app.on("will-quit", () => {
      globalShortcut.unregisterAll()
    })
  }
}
