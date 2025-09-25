
import { BrowserWindow, screen } from "electron"
import { AppState } from "main"
import path from "node:path"

const isDev = process.env.NODE_ENV === "development"

// fix path resolution for built app - when packaged, files are in app.asar
const getStartUrl = () => {
  if (isDev) {
    return "http://localhost:5173"
  }
  
  // in production, try multiple possible paths
  const possiblePaths = [
    path.join(__dirname, "../dist/index.html"),
    path.join(__dirname, "../../dist/index.html"), 
    path.join(process.resourcesPath, "app.asar/dist/index.html"),
    path.join(process.resourcesPath, "dist/index.html")
  ]
  
  const fs = require('fs')
  console.log(`[ASSISTANT-DEBUG] Checking for index.html in production mode...`)
  console.log(`[ASSISTANT-DEBUG] __dirname: ${__dirname}`)
  console.log(`[ASSISTANT-DEBUG] process.resourcesPath: ${process.resourcesPath}`)
  
  for (const htmlPath of possiblePaths) {
    console.log(`[ASSISTANT-DEBUG] Checking path: ${htmlPath}`)
    if (fs.existsSync(htmlPath)) {
      console.log(`[ASSISTANT-DEBUG] ✓ Found index.html at: ${htmlPath}`)
      return `file://${htmlPath}`
    } else {
      console.log(`[ASSISTANT-DEBUG] ✗ Not found: ${htmlPath}`)
    }
  }
  
  // fallback
  const fallback = path.join(__dirname, "../dist/index.html")
  console.log(`[ASSISTANT-DEBUG] No valid path found, using fallback: ${fallback}`)
  return `file://${fallback}`
}

const startUrl = getStartUrl()

export class WindowHelper {
  private mainWindow: BrowserWindow | null = null
  private isWindowVisible: boolean = false
  private windowPosition: { x: number; y: number } | null = null
  private windowSize: { width: number; height: number } | null = null
  private appState: AppState

  // Initialize with explicit number type and 0 value
  private screenWidth: number = 0
  private screenHeight: number = 0
  private step: number = 0
  private currentX: number = 0
  private currentY: number = 0

  constructor(appState: AppState) {
    this.appState = appState
  }

  public setWindowDimensions(width: number, height: number): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) return

    // Get current window position
    const [currentX, currentY] = this.mainWindow.getPosition()

    // Get screen dimensions
    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize

    // Use narrower width to allow interaction with underlying apps - 50% for debugging, 40% otherwise
    const maxAllowedWidth = Math.floor(
      workArea.width * (this.appState.getHasDebugged() ? 0.5 : 0.4)
    )

    // Ensure width doesn't exceed max allowed width and height is reasonable
    const newWidth = Math.min(width, maxAllowedWidth)
    const newHeight = height

    // Center the window horizontally if it would go off screen
    const maxX = workArea.width - newWidth
    const newX = Math.min(Math.max(currentX, 0), maxX)

    // Update window bounds
    this.mainWindow.setBounds({
      x: newX,
      y: currentY,
      width: newWidth,
      height: newHeight
    })

    // Update internal state
    this.windowPosition = { x: newX, y: currentY }
    this.windowSize = { width: newWidth, height: newHeight }
    this.currentX = newX
  }

  public createWindow(): void {
    if (this.mainWindow !== null) return

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    this.screenWidth = workArea.width
    this.screenHeight = workArea.height

    
    // stealth overlay window settings
    const windowSettings: Electron.BrowserWindowConstructorOptions = {
      title: "", // No title to avoid showing in menu bar
      width: 700,
      height: 600,
      minWidth: 500,
      minHeight: 200,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
        backgroundThrottling: false, // Prevent throttling when hidden
        webSecurity: false, // Disable for stealth
        allowRunningInsecureContent: true,
        experimentalFeatures: true,
        spellcheck: false,
        devTools: false, // Disable dev tools completely
        sandbox: false // Disable sandboxing for stealth
      },
      show: false, // Start hidden, then show after setup
      alwaysOnTop: true,
      frame: false, // frameless for stealth
      transparent: true, // transparent background
      fullscreenable: false,
      hasShadow: false, // no shadow for stealth
      backgroundColor: "#00000000", // transparent background
      focusable: true,
      resizable: true,
      movable: true,
      skipTaskbar: true, // Don't appear in taskbar/dock
      acceptFirstMouse: false, // Prevent mouse click focusing
      disableAutoHideCursor: true,
      enableLargerThanScreen: true,
      thickFrame: false,
      // Remove vibrancy for true transparency
      x: 100, // Start at a visible position
      y: 100
    }
    
    console.log("[ASSISTANT-DEBUG] Creating window with settings:", JSON.stringify(windowSettings, null, 2))

    this.mainWindow = new BrowserWindow(windowSettings)
    // this.mainWindow.webContents.openDevTools()
    this.mainWindow.setContentProtection(true)

    if (process.platform === "darwin") {
      this.mainWindow.setVisibleOnAllWorkspaces(true, {
        visibleOnFullScreen: true
      })
      this.mainWindow.setHiddenInMissionControl(true)
      this.mainWindow.setAlwaysOnTop(true, "floating")
    } else if (process.platform === "linux") {
      // Linux-specific optimizations for stealth overlays
      if (this.mainWindow.setHasShadow) {
        this.mainWindow.setHasShadow(false)
      }
      this.mainWindow.setFocusable(false)
    }
    // skipTaskbar already set in window settings

    console.log(`[ASSISTANT-DEBUG] Loading URL: ${startUrl}`)
    this.mainWindow.loadURL(startUrl).catch((err) => {
      console.error("[ASSISTANT-DEBUG] Failed to load URL:", startUrl, err)
      // try alternative URL if first fails
      if (!isDev) {
        const altUrl = `file://${path.join(__dirname, "../dist/index.html")}`
        console.log(`[ASSISTANT-DEBUG] Trying alternative URL: ${altUrl}`)
        this.mainWindow?.loadURL(altUrl).catch((err2) => {
          console.error("[ASSISTANT-DEBUG] Failed to load alternative URL:", altUrl, err2)
        })
      }
    })

    // Show window after loading URL and center it
    this.mainWindow.once('ready-to-show', () => {
      if (this.mainWindow) {
        // Center the window first
        this.centerWindow()
        
        // Log window state before showing
        const bounds = this.mainWindow.getBounds()
        console.log("[ASSISTANT-DEBUG] Window bounds before show:", bounds)
        console.log("[ASSISTANT-DEBUG] Window isVisible before show:", this.mainWindow.isVisible())
        console.log("[ASSISTANT-DEBUG] Window isMinimized:", this.mainWindow.isMinimized())
        
        this.mainWindow.showInactive() // Show without focusing to avoid menu bar
        this.mainWindow.setAlwaysOnTop(true)
        this.isWindowVisible = true
        
        // Log window state after showing
        console.log("[ASSISTANT-DEBUG] Window isVisible after show:", this.mainWindow.isVisible())
        console.log("[ASSISTANT-DEBUG] Window bounds after show:", this.mainWindow.getBounds())
        console.log("[ASSISTANT-DEBUG] Window is now visible and centered via ready-to-show")
      }
    })
    
    // additional debug logging
    this.mainWindow.webContents.once('did-finish-load', () => {
      console.log("[ASSISTANT-DEBUG] Window finished loading content")
    })
    
    this.mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
      console.error("[ASSISTANT-DEBUG] Window failed to load:", { errorCode, errorDescription, validatedURL })
    })
    
    // Fallback: force show window after 2 seconds if it hasn't shown yet
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isVisible()) {
        console.log("[ASSISTANT-DEBUG] Window not visible after 2s, forcing show")
        this.centerWindow()
        this.mainWindow.showInactive() // Show without focusing to avoid menu bar
        this.isWindowVisible = true
      }
    }, 2000)

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.currentX = bounds.x
    this.currentY = bounds.y

    this.setupWindowListeners()
    
    // Force window visible after 3 seconds regardless
    setTimeout(() => {
      if (this.mainWindow && !this.mainWindow.isDestroyed()) {
        console.log("[ASSISTANT-DEBUG] Force setting window visible after 3s")
        this.mainWindow.showInactive() // Show without focusing to avoid menu bar
        this.mainWindow.moveTop()
        this.isWindowVisible = true
      }
    }, 3000)
  }

  private setupWindowListeners(): void {
    if (!this.mainWindow) return

    this.mainWindow.on("move", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowPosition = { x: bounds.x, y: bounds.y }
        this.currentX = bounds.x
        this.currentY = bounds.y
      }
    })

    this.mainWindow.on("resize", () => {
      if (this.mainWindow) {
        const bounds = this.mainWindow.getBounds()
        this.windowSize = { width: bounds.width, height: bounds.height }
      }
    })

    this.mainWindow.on("closed", () => {
      this.mainWindow = null
      this.isWindowVisible = false
      this.windowPosition = null
      this.windowSize = null
    })
  }

  public getMainWindow(): BrowserWindow | null {
    return this.mainWindow
  }

  public isVisible(): boolean {
    return this.isWindowVisible
  }

  public hideMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    const bounds = this.mainWindow.getBounds()
    this.windowPosition = { x: bounds.x, y: bounds.y }
    this.windowSize = { width: bounds.width, height: bounds.height }
    this.mainWindow.hide()
    this.isWindowVisible = false
  }

  public showMainWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    if (this.windowPosition && this.windowSize) {
      this.mainWindow.setBounds({
        x: this.windowPosition.x,
        y: this.windowPosition.y,
        width: this.windowSize.width,
        height: this.windowSize.height
      })
    }

    this.mainWindow.showInactive()

    this.isWindowVisible = true
  }

  public toggleMainWindow(): void {
    if (this.isWindowVisible) {
      this.hideMainWindow()
    } else {
      this.showMainWindow()
    }
  }

  private centerWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      return
    }

    const primaryDisplay = screen.getPrimaryDisplay()
    const workArea = primaryDisplay.workAreaSize
    
    // Get current window size or use defaults
    const windowBounds = this.mainWindow.getBounds()
    const windowWidth = windowBounds.width || 400
    const windowHeight = windowBounds.height || 600
    
    // Calculate center position
    const centerX = Math.floor((workArea.width - windowWidth) / 2)
    const centerY = Math.floor((workArea.height - windowHeight) / 2)
    
    // Set window position
    this.mainWindow.setBounds({
      x: centerX,
      y: centerY,
      width: windowWidth,
      height: windowHeight
    })
    
    // Update internal state
    this.windowPosition = { x: centerX, y: centerY }
    this.windowSize = { width: windowWidth, height: windowHeight }
    this.currentX = centerX
    this.currentY = centerY
  }

  public centerAndShowWindow(): void {
    if (!this.mainWindow || this.mainWindow.isDestroyed()) {
      console.warn("Main window does not exist or is destroyed.")
      return
    }

    this.centerWindow()
    this.mainWindow.showInactive() // Show without focusing to avoid menu bar
    this.isWindowVisible = true
    
    console.log(`Window centered and shown`)
  }

  // New methods for window movement
  public moveWindowRight(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.min(
      this.screenWidth - halfWidth,
      this.currentX + this.step
    )
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowLeft(): void {
    if (!this.mainWindow) return

    const windowWidth = this.windowSize?.width || 0
    const halfWidth = windowWidth / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentX = Math.max(-halfWidth, this.currentX - this.step)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowDown(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.min(
      this.screenHeight - halfHeight,
      this.currentY + this.step
    )
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }

  public moveWindowUp(): void {
    if (!this.mainWindow) return

    const windowHeight = this.windowSize?.height || 0
    const halfHeight = windowHeight / 2

    // Ensure currentX and currentY are numbers
    this.currentX = Number(this.currentX) || 0
    this.currentY = Number(this.currentY) || 0

    this.currentY = Math.max(-halfHeight, this.currentY - this.step)
    this.mainWindow.setPosition(
      Math.round(this.currentX),
      Math.round(this.currentY)
    )
  }
}
