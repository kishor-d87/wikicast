/**
 * ProgressTracker Component
 * 
 * Displays real-time progress indicators during podcast generation.
 * Shows 4 stages: Fetching → Writing → Generating → Complete
 */

export type ProgressStage = 'fetch' | 'generate_script' | 'synthesize_audio' | 'stitch_audio';
export type ProgressStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export interface ProgressState {
  stage: ProgressStage;
  status: ProgressStatus;
  message: string;
}

interface ProgressTrackerProps {
  currentStage: ProgressStage | null;
  currentStatus: ProgressStatus;
  error?: string | null;
}

interface StageInfo {
  id: ProgressStage;
  label: string;
  icon: string;
}

const STAGES: StageInfo[] = [
  { id: 'fetch', label: 'Fetching', icon: '📖' },
  { id: 'generate_script', label: 'Writing', icon: '✍️' },
  { id: 'synthesize_audio', label: 'Generating', icon: '🎙️' },
  { id: 'stitch_audio', label: 'Finalizing', icon: '🎵' },
];

export function ProgressTracker({ currentStage, currentStatus, error }: ProgressTrackerProps) {
  const getCurrentStageIndex = () => {
    if (!currentStage) return -1;
    return STAGES.findIndex(s => s.id === currentStage);
  };

  const getStageStatus = (stageIndex: number): ProgressStatus => {
    const currentIndex = getCurrentStageIndex();
    
    if (currentStatus === 'failed' && stageIndex === currentIndex) {
      return 'failed';
    }
    
    if (currentIndex === -1) return 'pending';
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return currentStatus;
    return 'pending';
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 p-8 backdrop-blur-sm">
      <div className="text-center mb-8">
        <h3 className="text-xl font-semibold text-white mb-2">
          Generating Your Podcast
        </h3>
        <p className="text-slate-400 text-sm">
          This may take 1-2 minutes
        </p>
      </div>

      {/* Progress Stages */}
      <div className="space-y-4">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(index);
          const isActive = getCurrentStageIndex() === index;
          
          return (
            <StageItem
              key={stage.id}
              stage={stage}
              status={status}
              isActive={isActive}
            />
          );
        })}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-start space-x-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <h4 className="text-red-400 font-semibold text-sm">Generation Failed</h4>
              <p className="text-red-300 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual Stage Item Component
 */
interface StageItemProps {
  stage: StageInfo;
  status: ProgressStatus;
  isActive: boolean;
}

function StageItem({ stage, status, isActive }: StageItemProps) {
  const getStatusIcon = () => {
    if (status === 'completed') {
      return (
        <div className="w-8 h-8 rounded-full bg-green-500/20 border-2 border-green-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    if (status === 'in_progress') {
      return (
        <div className="w-8 h-8 rounded-full bg-podcast-500/20 border-2 border-podcast-500 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-podcast-500 animate-pulse" />
        </div>
      );
    }
    
    if (status === 'failed') {
      return (
        <div className="w-8 h-8 rounded-full bg-red-500/20 border-2 border-red-500 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </div>
      );
    }
    
    // pending
    return (
      <div className="w-8 h-8 rounded-full bg-slate-700/50 border-2 border-slate-600 flex items-center justify-center">
        <div className="w-2 h-2 rounded-full bg-slate-500" />
      </div>
    );
  };

  const getTextColor = () => {
    if (status === 'completed') return 'text-green-400';
    if (status === 'in_progress') return 'text-podcast-400';
    if (status === 'failed') return 'text-red-400';
    return 'text-slate-500';
  };

  return (
    <div className={`flex items-center space-x-4 transition-all duration-300 ${isActive ? 'scale-105' : ''}`}>
      {/* Status Icon */}
      {getStatusIcon()}
      
      {/* Stage Info */}
      <div className="flex-1">
        <div className="flex items-center space-x-2">
          <span className="text-xl">{stage.icon}</span>
          <h4 className={`font-semibold ${getTextColor()}`}>
            {stage.label}
          </h4>
          {status === 'in_progress' && (
            <div className="flex space-x-1">
              <div className="w-1.5 h-1.5 bg-podcast-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-1.5 h-1.5 bg-podcast-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-1.5 h-1.5 bg-podcast-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

