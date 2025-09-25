import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron"
import { initializeIpcHandlers } from "./ipcHandlers"
import { WindowHelper } from "./WindowHelper"
import { ScreenshotHelper } from "./ScreenshotHelper"
import { ShortcutsHelper } from "./shortcuts"
import { ProcessingHelper } from "./ProcessingHelper"
import { StealthHelper } from "./StealthHelper"

export class AppState {
  private static instance: AppState | null = null

  private windowHelper: WindowHelper
  private screenshotHelper: ScreenshotHelper
  public shortcutsHelper: ShortcutsHelper
  public processingHelper: ProcessingHelper
  public stealthHelper: StealthHelper
  private tray: Tray | null = null

  // View management
  private view: "queue" | "solutions" = "queue"

  // Legacy problem info - no longer used
  private problemInfo: any = null

  private hasDebugged: boolean = false

  // conversation context for new question flow
  private conversationContext: string[] = []
  private currentScreenshot: string | null = null

  // Processing events
  public readonly PROCESSING_EVENTS = {
    //global states
    UNAUTHORIZED: "procesing-unauthorized",
    NO_SCREENSHOTS: "processing-no-screenshots",

    //states for generating the initial solution
    INITIAL_START: "initial-start",
    PROBLEM_EXTRACTED: "problem-extracted",
    SOLUTION_SUCCESS: "solution-success",
    INITIAL_SOLUTION_ERROR: "solution-error",

    //states for processing the debugging
    DEBUG_START: "debug-start",
    DEBUG_SUCCESS: "debug-success",
    DEBUG_ERROR: "debug-error"
  } as const

  constructor() {
    // Initialize WindowHelper with this
    this.windowHelper = new WindowHelper(this)

    // Initialize ScreenshotHelper
    this.screenshotHelper = new ScreenshotHelper(this.view)

    // Initialize ProcessingHelper
    this.processingHelper = new ProcessingHelper(this)

    // Initialize ShortcutsHelper
    this.shortcutsHelper = new ShortcutsHelper(this)

    // Initialize StealthHelper for complete undetectability
    this.stealthHelper = StealthHelper.getInstance()
  }

  public static getInstance(): AppState {
    if (!AppState.instance) {
      AppState.instance = new AppState()
    }
    return AppState.instance
  }

  // Getters and Setters
  public getMainWindow(): BrowserWindow | null {
    return this.windowHelper.getMainWindow()
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
    this.screenshotHelper.setView(view)
  }

  public isVisible(): boolean {
    return this.windowHelper.isVisible()
  }

  public getScreenshotHelper(): ScreenshotHelper {
    return this.screenshotHelper
  }

  public getProblemInfo(): any {
    return this.problemInfo
  }

  public setProblemInfo(problemInfo: any): void {
    this.problemInfo = problemInfo
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotHelper.getScreenshotQueue()
  }

  public getExtraScreenshotQueue(): string[] {
    return this.screenshotHelper.getExtraScreenshotQueue()
  }

  // Window management methods
  public createWindow(): void {
    this.windowHelper.createWindow()
  }

  public hideMainWindow(): void {
    this.windowHelper.hideMainWindow()
  }

  public showMainWindow(): void {
    this.windowHelper.showMainWindow()
  }

  public toggleMainWindow(): void {
    console.log(
      "Screenshots: ",
      this.screenshotHelper.getScreenshotQueue().length,
      "Extra screenshots: ",
      this.screenshotHelper.getExtraScreenshotQueue().length
    )
    this.windowHelper.toggleMainWindow()
  }

  public setWindowDimensions(width: number, height: number): void {
    this.windowHelper.setWindowDimensions(width, height)
  }

  public clearQueues(): void {
    this.screenshotHelper.clearQueues()

    // Clear problem info
    this.problemInfo = null

    // Reset view to initial state
    this.setView("queue")
  }

  // Screenshot management methods
  public async takeScreenshot(): Promise<string> {
    if (!this.getMainWindow()) throw new Error("No main window available")

    const screenshotPath = await this.screenshotHelper.takeScreenshot(
      () => this.hideMainWindow(),
      () => this.showMainWindow()
    )

    return screenshotPath
  }

  public async getImagePreview(filepath: string): Promise<string> {
    return this.screenshotHelper.getImagePreview(filepath)
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.screenshotHelper.deleteScreenshot(path)
  }

  // New methods to move the window
  public moveWindowLeft(): void {
    this.windowHelper.moveWindowLeft()
  }

  public moveWindowRight(): void {
    this.windowHelper.moveWindowRight()
  }
  public moveWindowDown(): void {
    this.windowHelper.moveWindowDown()
  }
  public moveWindowUp(): void {
    this.windowHelper.moveWindowUp()
  }

  public centerAndShowWindow(): void {
    this.windowHelper.centerAndShowWindow()
  }

  // conversation context management
  public clearConversationContext(): void {
    this.conversationContext = []
    this.currentScreenshot = null
    console.log("Conversation context cleared")
  }

  public addToConversationContext(message: string): void {
    this.conversationContext.push(message)
    // keep only last 4 messages (2 Q&A pairs) to avoid context overload
    if (this.conversationContext.length > 4) {
      this.conversationContext = this.conversationContext.slice(-4)
    }
  }

  public getConversationContext(): string[] {
    return this.conversationContext
  }

  public setCurrentScreenshot(path: string): void {
    this.currentScreenshot = path
  }

  public getCurrentScreenshot(): string | null {
    return this.currentScreenshot
  }

  public createTray(): void {
    // Create invisible tray for complete stealth mode
    // Use completely transparent 1x1 pixel image
    const transparentImage = nativeImage.createFromBuffer(
      Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ])
    )
    
    this.tray = new Tray(transparentImage)
    
    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show Interview Coder',
        click: () => {
          this.centerAndShowWindow()
        }
      },
      {
        label: 'Toggle Window',
        click: () => {
          this.toggleMainWindow()
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Take Screenshot (Cmd+H)',
        click: async () => {
          try {
            const screenshotPath = await this.takeScreenshot()
            const preview = await this.getImagePreview(screenshotPath)
            const mainWindow = this.getMainWindow()
            if (mainWindow) {
              mainWindow.webContents.send("screenshot-taken", {
                path: screenshotPath,
                preview
              })
            }
          } catch (error) {
            console.error("Error taking screenshot from tray:", error)
          }
        }
      },
      {
        type: 'separator'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click: () => {
          app.quit()
        }
      }
    ])
    
    this.tray.setToolTip('Assistant - Press Cmd+Shift+Space to show')
    this.tray.setContextMenu(contextMenu)
    
    // Don't set any title to remain completely invisible in menu bar
    if (process.platform === 'darwin') {
      this.tray.setTitle('') // Empty title for complete invisibility
    }
    
    // Double-click to show window
    this.tray.on('double-click', () => {
      this.centerAndShowWindow()
    })
  }

  public setHasDebugged(value: boolean): void {
    this.hasDebugged = value
  }

  public getHasDebugged(): boolean {
    return this.hasDebugged
  }
}

// Application initialization
async function initializeApp() {
  console.log("[ASSISTANT-DEBUG] Starting app initialization...")
  console.log("[ASSISTANT-DEBUG] NODE_ENV:", process.env.NODE_ENV)
  console.log("[ASSISTANT-DEBUG] __dirname:", __dirname)
  console.log("[ASSISTANT-DEBUG] process.resourcesPath:", process.resourcesPath)
  
  // Handle single instance
  const gotTheLock = app.requestSingleInstanceLock()
  if (!gotTheLock) {
    console.log("[ASSISTANT-DEBUG] Another instance is running, quitting this one")
    app.quit()
    return
  }
  
  const appState = AppState.getInstance()

  // Initialize IPC handlers before window creation
  initializeIpcHandlers(appState)

  app.whenReady().then(async () => {
    console.log("[ASSISTANT-DEBUG] App is ready, creating window...")
    
    // Initialize stealth measures before anything else
    await appState.stealthHelper.setupAdvancedEvasion()
    appState.stealthHelper.startBehavioralCamouflage()
    
    appState.createWindow()
    appState.createTray()
    // Register global shortcuts using ShortcutsHelper
    appState.shortcutsHelper.registerGlobalShortcuts()
    console.log("[ASSISTANT-DEBUG] Window creation initiated with stealth enabled")
  })

  app.on("activate", () => {
    console.log("[ASSISTANT-DEBUG] App activated via click/dock")
    if (appState.getMainWindow() === null) {
      console.log("[ASSISTANT-DEBUG] No window exists, creating new one")
      appState.createWindow()
    } else {
      console.log("[ASSISTANT-DEBUG] Window exists, showing it")
      appState.centerAndShowWindow()
    }
  })

  // Quit when all windows are closed, except on macOS
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit()
    }
  })

  // Handle app being opened from Applications folder
  app.on('second-instance', () => {
    console.log("[ASSISTANT-DEBUG] Second instance detected, focusing window")
    appState.centerAndShowWindow()
  })
  
  app.on('open-file', () => {
    console.log("[ASSISTANT-DEBUG] App opened via file/Applications")
    appState.centerAndShowWindow()
  })
  
  app.on('before-quit', () => {
    console.log("[ASSISTANT-DEBUG] App is about to quit")
    // Cleanup stealth measures
    appState.stealthHelper.cleanup()
  })

  // Complete stealth mode configuration
  if (process.platform === "darwin") {
    app.dock?.hide() // Hide dock icon
    
    // Prevent app from appearing in menu bar/force quit dialog
    app.setActivationPolicy('accessory')
  }
  
  app.commandLine.appendSwitch("disable-background-timer-throttling")
  
  // Advanced stealth switches - anti-detection
  app.commandLine.appendSwitch("disable-features", "TranslateUI,VizDisplayCompositor")
  app.commandLine.appendSwitch("disable-ipc-flooding-protection")
  app.commandLine.appendSwitch("disable-renderer-backgrounding")
  app.commandLine.appendSwitch("disable-backgrounding-occluded-windows")
  app.commandLine.appendSwitch("disable-background-media-suspend")
  app.commandLine.appendSwitch("disable-gpu-process-crash-limit")
  app.commandLine.appendSwitch("disable-dev-shm-usage")
  app.commandLine.appendSwitch("no-sandbox")
  app.commandLine.appendSwitch("disable-web-security")
  app.commandLine.appendSwitch("disable-software-rasterizer")
  app.commandLine.appendSwitch("disable-gpu-sandbox")
  app.commandLine.appendSwitch("disable-accelerated-2d-canvas")
  app.commandLine.appendSwitch("disable-accelerated-video-decode")
  
  // Process name obfuscation
  if (process.platform === "darwin") {
    // Set a generic process name to avoid detection
    try {
      process.title = "SystemUIServer"
    } catch (e) {
      process.title = "loginwindow"
    }
  } else if (process.platform === "win32") {
    process.title = "explorer.exe"
  } else {
    process.title = "systemd"
  }
}

// Start the application
initializeApp().catch(console.error)
