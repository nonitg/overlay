import React from "react"
import ProModeToggle from "../ProModeToggle"

interface MainCommandsProps {
  isProMode: boolean
  onProModeToggle: (isProMode: boolean) => void
  isProcessing?: boolean
}

const MainCommands: React.FC<MainCommandsProps> = ({ 
  isProMode, 
  onProModeToggle, 
  isProcessing = false 
}) => {

  return (
    <div className="w-fit">
      <div className="liquid-glass-bar py-2.5 px-5 flex items-center gap-6 draggable-area">
        
        {/* Pro Mode Toggle */}
        <ProModeToggle 
          isProMode={isProMode}
          onToggle={onProModeToggle}
          disabled={isProcessing}
        />

        {/* Ask Question Command */}
        <div className="flex items-center gap-2.5">
          <span className="text-[12px] leading-none text-white/85 font-medium">Ask Question</span>
          <div className="flex gap-1">
            <kbd className="glass-button-secondary rounded-md px-2 py-1 text-[10px] leading-none">⌘</kbd>
            <kbd className="glass-button-secondary rounded-md px-2 py-1 text-[10px] leading-none">↵</kbd>
          </div>
        </div>

                 {/* Follow-up Command */}
         <div className="flex items-center gap-2.5">
           <span className="text-[12px] leading-none text-white/85 font-medium">Follow-up</span>
           <div className="flex gap-1">
             <kbd className="glass-button-secondary rounded-md px-2 py-1 text-[10px] leading-none">⌘</kbd>
             <kbd className="glass-button-secondary rounded-md px-2 py-1 text-[10px] leading-none">⇧</kbd>
             <kbd className="glass-button-secondary rounded-md px-2 py-1 text-[10px] leading-none">↵</kbd>
           </div>
         </div>
         


        {/* Drag Handle */}
        <div className="flex items-center gap-1 cursor-move ml-2">
          <div className="grid grid-cols-3 gap-0.5">
            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
            <div className="w-1 h-1 bg-white/60 rounded-full"></div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default MainCommands
