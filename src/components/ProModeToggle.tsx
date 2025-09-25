import React from "react"

interface ProModeToggleProps {
  isProMode: boolean
  onToggle: (isProMode: boolean) => void
  disabled?: boolean
}

const ProModeToggle: React.FC<ProModeToggleProps> = ({ 
  isProMode, 
  onToggle, 
  disabled = false 
}) => {
  
  const handleToggle = () => {
    if (!disabled) {
      onToggle(!isProMode)
    }
  }

  return (
    <div className="flex items-center gap-2.5">
      {/* Pro label */}
      <span className={`text-[12px] leading-none font-medium transition-colors duration-200 ${
        disabled 
          ? 'text-white/40' 
          : isProMode 
            ? 'text-amber-300' 
            : 'text-white/85'
      }`}>
        Pro
      </span>
      
      {/* Toggle switch */}
      <button 
        onClick={handleToggle}
        disabled={disabled}
        className={`w-8 h-4 rounded-full relative transition-all duration-200 ${
          disabled 
            ? 'glass-button-secondary opacity-50 cursor-not-allowed' 
            : isProMode
              ? 'bg-amber-500/80 shadow-sm'
              : 'glass-button-secondary hover:bg-white/10'
        }`}
      >
        {/* Toggle knob */}
        <div className={`w-3 h-3 rounded-full absolute top-0.5 transition-all duration-200 ${
          disabled
            ? 'bg-white/40'
            : isProMode 
              ? 'bg-white translate-x-4 shadow-sm' 
              : 'bg-white/60 translate-x-0.5'
        }`} />
      </button>
      
      {/* Model indicator */}
      <span className={`text-[10px] leading-none transition-colors duration-200 ${
        disabled
          ? 'text-white/30'
          : isProMode 
            ? 'text-amber-200' 
            : 'text-white/60'
      }`}>
        {isProMode ? '2.5 Pro' : '2.5 Flash'}
      </span>
    </div>
  )
}

export default ProModeToggle
