import React from 'react';
import { ViewType } from '@/lib/types';

interface ViewSwitcherProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  onLayoutToggle: () => void;
}

export function ViewSwitcher({ currentView, onViewChange, onLayoutToggle }: ViewSwitcherProps) {
  return (
    <div className="flex bg-[#091e4214] p-1 rounded-md gap-1">
      <button
        onClick={() => onViewChange('status')}
        className={`px-3 py-1.5 text-sm font-medium rounded transition-all cursor-pointer ${
          currentView === 'status'
            ? 'bg-white text-[#0079bf] shadow-sm'
            : 'text-[#5e6c84] hover:bg-white/50'
        }`}
      >
        Status View
      </button>
      <button
        onClick={() => onViewChange('context')}
        className={`px-3 py-1.5 text-sm font-medium rounded transition-all cursor-pointer ${
          currentView === 'context'
            ? 'bg-white text-[#0079bf] shadow-sm'
            : 'text-[#5e6c84] hover:bg-white/50'
        }`}
      >
        Context View
      </button>
      <button
        onClick={onLayoutToggle}
        className="px-3 py-1.5 text-sm font-medium rounded text-[#5e6c84] hover:bg-white/50 transition-all cursor-pointer"
        title="Toggle Vertical Layout"
      >
        🔃
      </button>
    </div>
  );
}
