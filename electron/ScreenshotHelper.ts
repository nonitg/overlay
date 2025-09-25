// ScreenshotHelper.ts

import path from "node:path"
import fs from "node:fs"
import { app } from "electron"
import { v4 as uuidv4 } from "uuid"
import screenshot from "screenshot-desktop"
import { StealthHelper } from "./StealthHelper"
import crypto from "crypto"
import sharp from "sharp"

export class ScreenshotHelper {
  private screenshotQueue: string[] = []
  private extraScreenshotQueue: string[] = []
  private readonly MAX_SCREENSHOTS = 5
  private previewCache = new Map<string, string>()

  private readonly screenshotDir: string
  private readonly extraScreenshotDir: string
  private stealthHelper: StealthHelper

  private view: "queue" | "solutions" = "queue"

  constructor(view: "queue" | "solutions" = "queue") {
    this.view = view
    this.stealthHelper = StealthHelper.getInstance()

    // Initialize stealth directories with randomized names
    const baseDir = this.stealthHelper.getStealthPath('stealth')
    const randomSuffix1 = crypto.randomBytes(8).toString('hex')
    const randomSuffix2 = crypto.randomBytes(8).toString('hex')
    
    this.screenshotDir = path.join(baseDir, `.sys_${randomSuffix1}`)
    this.extraScreenshotDir = path.join(baseDir, `.tmp_${randomSuffix2}`)

    // Create directories if they don't exist
    this.createStealthDirectories()
  }

  private createStealthDirectories(): void {
    try {
      if (!fs.existsSync(this.screenshotDir)) {
        fs.mkdirSync(this.screenshotDir, { recursive: true, mode: 0o755 })
        // Hide directory on macOS
        if (process.platform === "darwin") {
          fs.writeFileSync(path.join(this.screenshotDir, '.hidden'), '')
        }
      }
      if (!fs.existsSync(this.extraScreenshotDir)) {
        fs.mkdirSync(this.extraScreenshotDir, { recursive: true, mode: 0o755 })
        // Hide directory on macOS
        if (process.platform === "darwin") {
          fs.writeFileSync(path.join(this.extraScreenshotDir, '.hidden'), '')
        }
      }
    } catch (error) {
      // Fallback to temp directory
      console.warn("[STEALTH] Failed to create stealth directories, using fallback:", error)
      // Set fallback paths
      const fallbackBase = path.join(require('os').tmpdir(), 'assistant_screenshots')
      try {
        fs.mkdirSync(fallbackBase, { recursive: true, mode: 0o755 })
        Object.defineProperty(this, 'screenshotDir', { value: fallbackBase, writable: false })
        Object.defineProperty(this, 'extraScreenshotDir', { value: fallbackBase, writable: false })
      } catch (fallbackError) {
        console.error("[STEALTH] Critical: Cannot create any screenshot directories")
      }
    }
  }

  public getView(): "queue" | "solutions" {
    return this.view
  }

  public setView(view: "queue" | "solutions"): void {
    this.view = view
  }

  public getScreenshotQueue(): string[] {
    return this.screenshotQueue
  }

  public getExtraScreenshotQueue(): string[] {
    return this.extraScreenshotQueue
  }

  public clearQueues(): void {
    // Clear screenshotQueue
    this.screenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          console.error(`Error deleting screenshot at ${screenshotPath}:`, err)
      })
    })
    this.screenshotQueue = []

    // Clear extraScreenshotQueue
    this.extraScreenshotQueue.forEach((screenshotPath) => {
      fs.unlink(screenshotPath, (err) => {
        if (err)
          console.error(
            `Error deleting extra screenshot at ${screenshotPath}:`,
            err
          )
      })
    })
    this.extraScreenshotQueue = []
  }

  public async takeScreenshot(
    hideMainWindow: () => void,
    showMainWindow: () => void
  ): Promise<string> {
    hideMainWindow()
    
    let screenshotPath = ""

    if (this.view === "queue") {
      // Use proper PNG extension for screenshot capture
      const tempPath = path.join(this.screenshotDir, `${crypto.randomBytes(8).toString('hex')}.png`)
      
      try {
        await screenshot({ 
          filename: tempPath,
          format: 'png'
        })
      } catch (error) {
        console.error("[SCREENSHOT] Failed to capture screenshot:", error)
        if (error.message && error.message.includes('could not create image from display')) {
          console.error("[SCREENSHOT] This usually means the app needs Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording")
        }
        throw error
      }
      
      // Rename to stealth path and obfuscate
      screenshotPath = await this.createStealthScreenshotPath(this.screenshotDir)
      await fs.promises.rename(tempPath, screenshotPath)
      await this.obfuscateScreenshotFile(screenshotPath)

      this.screenshotQueue.push(screenshotPath)
      if (this.screenshotQueue.length > this.MAX_SCREENSHOTS) {
        const removedPath = this.screenshotQueue.shift()
        if (removedPath) {
          await this.secureDeleteFile(removedPath)
        }
      }
    } else {
      // Use proper PNG extension for screenshot capture
      const tempPath = path.join(this.extraScreenshotDir, `${crypto.randomBytes(8).toString('hex')}.png`)
      
      try {
        await screenshot({ 
          filename: tempPath,
          format: 'png'
        })
      } catch (error) {
        console.error("[SCREENSHOT] Failed to capture screenshot:", error)
        if (error.message && error.message.includes('could not create image from display')) {
          console.error("[SCREENSHOT] This usually means the app needs Screen Recording permission in System Preferences > Security & Privacy > Privacy > Screen Recording")
        }
        throw error
      }
      
      // Rename to stealth path and obfuscate
      screenshotPath = await this.createStealthScreenshotPath(this.extraScreenshotDir)
      await fs.promises.rename(tempPath, screenshotPath)
      await this.obfuscateScreenshotFile(screenshotPath)

      this.extraScreenshotQueue.push(screenshotPath)
      if (this.extraScreenshotQueue.length > this.MAX_SCREENSHOTS) {
        const removedPath = this.extraScreenshotQueue.shift()
        if (removedPath) {
          await this.secureDeleteFile(removedPath)
        }
      }
    }

    showMainWindow()
    return screenshotPath
  }


  private async createStealthScreenshotPath(dir: string): Promise<string> {
    // Generate stealth filename that looks like system file
    const systemFileNames = [
      'cache', 'tmp', 'log', 'sys', 'data', 'config', 'pref', 'info'
    ]
    const randomBaseName = systemFileNames[Math.floor(Math.random() * systemFileNames.length)]
    const randomSuffix = crypto.randomBytes(4).toString('hex')
    const timestamp = Date.now().toString(36)
    
    return path.join(dir, `.${randomBaseName}_${timestamp}_${randomSuffix}.dat`)
  }

  private async obfuscateScreenshotFile(filePath: string): Promise<void> {
    try {
      // Read original file
      const originalData = await fs.promises.readFile(filePath)
      
      // Create obfuscated header to mask PNG signature
      const obfuscatedData = Buffer.concat([
        Buffer.from([0x00, 0x01, 0x02, 0x03]), // Dummy header
        originalData
      ])
      
      // Write obfuscated file
      await fs.promises.writeFile(filePath, obfuscatedData)
      
      // Set file attributes to hide it further
      if (process.platform === "darwin") {
        try {
          // Set file as hidden and system file
          await fs.promises.chmod(filePath, 0o600) // Owner read/write only
        } catch (error) {
          // Silent failure
        }
      }
    } catch (error) {
      console.warn("[STEALTH] Failed to obfuscate screenshot file")
    }
  }

  private async secureDeleteFile(filePath: string): Promise<void> {
    try {
      // Overwrite file with random data before deletion
      const fileSize = (await fs.promises.stat(filePath)).size
      const randomData = crypto.randomBytes(fileSize)
      await fs.promises.writeFile(filePath, randomData)
      
      // Delete the file
      await fs.promises.unlink(filePath)
    } catch (error) {
      // Silent failure for stealth
      try {
        await fs.promises.unlink(filePath)
      } catch (e) {
        console.error("Error securely deleting screenshot:", e)
      }
    }
  }

  public async getImagePreview(filepath: string): Promise<string> {
    // Check cache first
    const cacheKey = `${filepath}_${(await fs.promises.stat(filepath)).mtime.getTime()}`
    if (this.previewCache.has(cacheKey)) {
      return this.previewCache.get(cacheKey)!
    }

    try {
      const data = await fs.promises.readFile(filepath)
      
      // Remove obfuscation header if present
      const actualImageData = data.length > 4 && 
        data[0] === 0x00 && data[1] === 0x01 && 
        data[2] === 0x02 && data[3] === 0x03 
        ? data.slice(4) 
        : data

      // Create compressed thumbnail for UI preview
      const compressed = await sharp(actualImageData)
        .resize({
          width: 400,
          height: 300,
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({
          quality: 75,
          progressive: true
        })
        .toBuffer()

      const preview = `data:image/jpeg;base64,${compressed.toString("base64")}`
      
      // Cache the preview
      this.previewCache.set(cacheKey, preview)
      
      // Limit cache size
      if (this.previewCache.size > 20) {
        const firstKey = this.previewCache.keys().next().value
        this.previewCache.delete(firstKey)
      }
      
      console.log(`📸 UI Preview: Compressed ${filepath.split('/').pop()} from ${(actualImageData.length / 1024).toFixed(1)}KB to ${(compressed.length / 1024).toFixed(1)}KB`)
      
      return preview
    } catch (error) {
      console.error("Error creating compressed preview:", error)
      // Fallback to original method
      try {
        const data = await fs.promises.readFile(filepath)
        const actualImageData = data.length > 4 && 
          data[0] === 0x00 && data[1] === 0x01 && 
          data[2] === 0x02 && data[3] === 0x03 
          ? data.slice(4) 
          : data
        return `data:image/png;base64,${actualImageData.toString("base64")}`
      } catch (fallbackError) {
        console.error("Error reading image:", fallbackError)
        throw fallbackError
      }
    }
  }

  public async deleteScreenshot(
    path: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use secure deletion
      await this.secureDeleteFile(path)
      
      // Clear from cache
      for (const [key] of this.previewCache) {
        if (key.startsWith(path)) {
          this.previewCache.delete(key)
        }
      }
      
      if (this.view === "queue") {
        this.screenshotQueue = this.screenshotQueue.filter(
          (filePath) => filePath !== path
        )
      } else {
        this.extraScreenshotQueue = this.extraScreenshotQueue.filter(
          (filePath) => filePath !== path
        )
      }
      return { success: true }
    } catch (error) {
      console.error("Error deleting file:", error)
      return { success: false, error: error.message }
    }
  }
}
