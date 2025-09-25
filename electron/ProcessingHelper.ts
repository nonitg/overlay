// ProcessingHelper.ts

import { AppState } from "./main"
import { LLMHelper } from "./LLMHelper"
import dotenv from "dotenv"

dotenv.config()

const isDev = process.env.NODE_ENV === "development"
const isDevTest = process.env.IS_DEV_TEST === "true"
const MOCK_API_WAIT_TIME = Number(process.env.MOCK_API_WAIT_TIME) || 500

export class ProcessingHelper {
  private appState: AppState
  private llmHelper: LLMHelper
  private currentProcessingAbortController: AbortController | null = null
  private currentExtraProcessingAbortController: AbortController | null = null

  constructor(appState: AppState) {
    this.appState = appState
    
    // hardcoded API key - replace YOUR_GEMINI_API_KEY_HERE with your actual key
    const apiKey = "AIzaSyBg3HCnDBgY022Wy7Jaj4TwDp0PGkZoXo4"
    
    this.llmHelper = new LLMHelper(apiKey)
  }

  // processScreenshots method removed - problem extraction logic eliminated

  // cancelOngoingRequests method removed - problem extraction logic eliminated

  // Audio processing removed

  public getLLMHelper() {
    return this.llmHelper;
  }
}
