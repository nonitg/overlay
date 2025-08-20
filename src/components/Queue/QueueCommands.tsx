import React, { useState, useEffect, useRef } from "react"
import { IoLogOutOutline } from "react-icons/io5"
import { Mic, MicOff } from "lucide-react"
import { Dialog, DialogContent, DialogClose } from "../ui/dialog"

interface QueueCommandsProps {
  screenshots: Array<{ path: string; preview: string }>
}

const QueueCommands: React.FC<QueueCommandsProps> = ({
  screenshots
}) => {

  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [audioResult, setAudioResult] = useState<string | null>(null)
  const chunks = useRef<Blob[]>([])






  const handleRecordClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const recorder = new MediaRecorder(stream)
        recorder.ondataavailable = (e) => chunks.current.push(e.data)
        recorder.onstop = async () => {
          const blob = new Blob(chunks.current, { type: chunks.current[0]?.type || 'audio/webm' })
          chunks.current = []
          const reader = new FileReader()
          reader.onloadend = async () => {
            const base64Data = (reader.result as string).split(',')[1]
            try {
              const result = await window.electronAPI.analyzeAudioFromBase64(base64Data, blob.type)
              setAudioResult(result.text)
            } catch (err) {
              setAudioResult('Audio analysis failed.')
            }
          }
          reader.readAsDataURL(blob)
        }
        setMediaRecorder(recorder)
        recorder.start()
        setIsRecording(true)
      } catch (err) {
        setAudioResult('Could not start recording.')
      }
    } else {
      // Stop recording
      mediaRecorder?.stop()
      setIsRecording(false)
      setMediaRecorder(null)
    }
  }

  // Remove handleChatSend function

  return (
    <div className="w-full max-w-fit">
      <div className="text-xs liquid-glass-bar py-1 px-3 flex items-center justify-start gap-3 draggable-area w-full max-w-max">
        {/* Show/Hide */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] leading-none text-white/85 font-medium">Show/Hide</span>
          <div className="flex gap-1">
            <kbd className="glass-button-secondary rounded-md px-1.5 py-0.5 text-[10px] leading-none">⌘</kbd>
            <kbd className="glass-button-secondary rounded-md px-1.5 py-0.5 text-[10px] leading-none">B</kbd>
          </div>
        </div>

        {/* Solve Command */}
        {screenshots.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] leading-none text-white/85 font-medium">Solve</span>
            <div className="flex gap-1">
              <kbd className="glass-button-secondary rounded-md px-1.5 py-0.5 text-[10px] leading-none">⌘</kbd>
              <kbd className="glass-button-secondary rounded-md px-1.5 py-0.5 text-[10px] leading-none">↵</kbd>
            </div>
          </div>
        )}

        {/* Voice Recording Button */}
        <div className="flex items-center gap-2">
          <button
            className={`glass-button-secondary rounded-md px-2 py-1 text-[11px] leading-none flex items-center gap-1.5 ${isRecording ? 'glass-button-danger' : ''}`}
            onClick={handleRecordClick}
            type="button"
          >
            {isRecording ? (
              <>
                <MicOff size={12} className="animate-pulse" />
                <span className="font-medium">Stop</span>
              </>
            ) : (
              <>
                <Mic size={12} />
                <span className="font-medium">Record</span>
              </>
            )}
          </button>
        </div>

        {/* chat button removed */}

        {/* Sign Out Button */}
        <button
          className="glass-button-danger rounded-md p-1.5 transition-colors hover:cursor-pointer"
          title="Quit App"
          onClick={() => window.electronAPI.quitApp()}
        >
          <IoLogOutOutline className="w-4 h-4" />
        </button>
      </div>
      {/* Audio Result Display */}
      {audioResult && (
        <div className="mt-3 p-3 liquid-glass rounded-lg text-slate-200 text-xs max-w-md break-words">
          <span className="font-semibold accent-secondary">Audio Result:</span> {audioResult}
        </div>
      )}

    </div>
  )
}

export default QueueCommands
