import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai"
import fs from "fs"
import crypto from "crypto"
import sharp from "sharp"
import path from "path"

export class LLMHelper {
  private flashModel: GenerativeModel
  private proModel: GenerativeModel
  private currentModel: GenerativeModel
  private isProMode: boolean = false
  private compressionCache = new Map<string, string>()
  public readonly systemPrompt = `You are Nonit AI, a concise assistant. Answer questions directly and briefly. When referencing images, only mention relevant visual details. Keep responses under 3 sentences unless more detail is specifically requested.`

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey)
    this.flashModel = genAI.getGenerativeModel({ model: "gemini-2.5-flash" })
    this.proModel = genAI.getGenerativeModel({ model: "gemini-2.5-pro" })
    this.currentModel = this.flashModel // default to flash
  }

  public setProMode(isProMode: boolean): void {
    this.isProMode = isProMode
    this.currentModel = isProMode ? this.proModel : this.flashModel
    console.log(`🔧 LLMHelper: Switched to ${isProMode ? 'Gemini Pro' : 'Gemini Flash'} model`)
  }

  public getIsProMode(): boolean {
    return this.isProMode
  }

  public getCurrentModelName(): string {
    return this.isProMode ? "gemini-2.5-pro" : "gemini-2.5-flash"
  }

  private async fileToGenerativePart(imagePath: string) {
    const compressedImageData = await this.getCompressedImageForAI(imagePath)
    return {
      inlineData: {
        data: compressedImageData,
        mimeType: "image/jpeg"
      }
    }
  }

  private async readObfuscatedFile(filePath: string): Promise<Buffer> {
    const data = await fs.promises.readFile(filePath)
    
    // Remove obfuscation header if present
    if (data.length > 4 && 
        data[0] === 0x00 && data[1] === 0x01 && 
        data[2] === 0x02 && data[3] === 0x03) {
      return data.slice(4)
    }
    
    return data
  }

  private async getCompressedImageForAI(imagePath: string): Promise<string> {
    // Check cache first
    const cacheKey = `${imagePath}_${(await fs.promises.stat(imagePath)).mtime.getTime()}`
    if (this.compressionCache.has(cacheKey)) {
      return this.compressionCache.get(cacheKey)!
    }

    try {
      // Read and remove obfuscation if present
      const originalData = await this.readObfuscatedFile(imagePath)
      
      // Get image metadata
      const image = sharp(originalData)
      const metadata = await image.metadata()
      
      console.log(`🔧 AI Compression: Original ${metadata.width}x${metadata.height} (${(originalData.length / 1024).toFixed(1)}KB)`)
      
      let processedImage = image
      
      // Smart resizing for very large images to maintain text clarity
      if (metadata.width && metadata.width > 2048) {
        const scaleFactor = 2048 / metadata.width
        processedImage = processedImage.resize({
          width: 2048,
          height: Math.round((metadata.height || 1536) * scaleFactor),
          kernel: sharp.kernel.lanczos3, // Best for text preservation
          withoutEnlargement: true
        })
      }
      
      // High-quality JPEG compression optimized for text recognition
      const compressedBuffer = await processedImage
        .jpeg({
          quality: 92, // High quality to preserve text clarity
          progressive: true,
          mozjpeg: true // Better compression
        })
        .toBuffer()
      
      const compressedBase64 = compressedBuffer.toString('base64')
      console.log(`✅ AI Compression: Compressed to ${(compressedBuffer.length / 1024).toFixed(1)}KB (${((1 - compressedBuffer.length / originalData.length) * 100).toFixed(1)}% reduction)`)
      
      // Cache the compressed result
      this.compressionCache.set(cacheKey, compressedBase64)
      
      // Limit cache size
      if (this.compressionCache.size > 10) {
        const firstKey = this.compressionCache.keys().next().value
        this.compressionCache.delete(firstKey)
      }
      
      return compressedBase64
    } catch (error) {
      console.warn('⚠️ AI Compression failed, using original:', error)
      // Fallback to original
      const originalData = await this.readObfuscatedFile(imagePath)
      return originalData.toString('base64')
    }
  }

  private cleanJsonResponse(text: string): string {
    // Remove markdown code block syntax if present
    text = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
    // Remove any leading/trailing whitespace
    text = text.trim();
    return text;
  }

  // extractProblemFromImages method removed - problem extraction logic eliminated

  // generateSolution method removed - problem extraction logic eliminated

  // debugSolutionWithImages method removed - problem extraction logic eliminated

  // Audio analysis temporarily disabled
  // public async analyzeAudioFile(audioPath: string) {
  //   try {
  //     const audioData = await fs.promises.readFile(audioPath);
  //     const audioPart = {
  //       inlineData: {
  //         data: audioData.toString("base64"),
  //         mimeType: "audio/mp3"
  //       }
  //     };
  //     const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user.`;
  //     const result = await this.currentModel.generateContent([prompt, audioPart]);
  //     const response = await result.response;
  //     const text = response.text();
  //     return { text, timestamp: Date.now() };
  //   } catch (error) {
  //     console.error("Error analyzing audio file:", error);
  //     throw error;
  //   }
  // }

  // public async analyzeAudioFromBase64(data: string, mimeType: string) {
  //   try {
  //     const audioPart = {
  //       inlineData: {
  //         data,
  //         mimeType
  //       }
  //     };
  //     const prompt = `${this.systemPrompt}\n\nDescribe this audio clip in a short, concise answer. In addition to your main answer, suggest several possible actions or responses the user could take next based on the audio. Do not return a structured JSON object, just answer naturally as you would to a user and be concise.`;
  //     const result = await this.currentModel.generateContent([prompt, audioPart]);
  //     const response = await result.response;
  //     const text = response.text();
  //     return { text, timestamp: Date.now() };
  //   } catch (error) {
  //     console.error("Error analyzing audio from base64:", error);
  //     throw error;
  //   }
  // }

  public async analyzeImageFile(imagePath: string) {
    try {
      console.log(`🚀 AI Analysis: Starting with compressed image...`)
      const imagePart = await this.fileToGenerativePart(imagePath)
      
      const prompt = `${this.systemPrompt}\n\nDescribe this image concisely in 1-2 sentences.`;
      const result = await this.currentModel.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image file:", error);
      throw error;
    }
  }

  public async chatWithGemini(message: string): Promise<string> {
    try {
      const result = await this.currentModel.generateContent(message);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("[LLMHelper] Error in chatWithGemini:", error);
      throw error;
    }
  }


  // analyze image with custom prompt - used for conversation flow
  public async analyzeImageWithPrompt(imagePath: string, customPrompt: string) {
    try {
      console.log(`🚀 AI Analysis: Processing custom prompt with compressed image...`)
      const imagePart = await this.fileToGenerativePart(imagePath)
      
      const result = await this.currentModel.generateContent([customPrompt, imagePart]);
      const response = await result.response;
      const text = response.text();
      return { text, timestamp: Date.now() };
    } catch (error) {
      console.error("Error analyzing image with custom prompt:", error);
      throw error;
    }
  }
}