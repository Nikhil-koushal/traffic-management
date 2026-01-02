
import React from 'react';
import { SignalStatus } from '../types';

interface TrafficSignalProps {
  status: SignalStatus;
  size?: 'sm' | 'md' | 'lg';
}

const TrafficSignal: React.FC<TrafficSignalProps> = ({ status, size = 'md' }) => {
  const containerClasses = {
    sm: 'w-8 h-20 p-1',
    md: 'w-12 h-32 p-2',
    lg: 'w-16 h-48 p-2'
  };

  const lightClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-12 h-12'
  };

  return (
    <div className={`bg-slate-900 rounded-2xl flex flex-col items-center justify-between shadow-2xl border-2 border-slate-700 ${containerClasses[size]}`}>
      {/* Red */}
      <div className={`rounded-full transition-all duration-300 ${lightClasses[size]} ${
        status === 'RED' ? 'bg-red-500 shadow-[0_0_20px_rgba(239,68,68,0.8)]' : 'bg-red-950'
      }`} />
      
      {/* Yellow */}
      <div className={`rounded-full transition-all duration-300 ${lightClasses[size]} ${
        status === 'YELLOW' ? 'bg-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.8)]' : 'bg-yellow-950'
      }`} />
      
      {/* Green */}
      <div className={`rounded-full transition-all duration-300 ${lightClasses[size]} ${
        status === 'GREEN' ? 'bg-green-500 shadow-[0_0_20px_rgba(34,197,94,0.8)]' : 'bg-green-950'
      }`} />
    </div>
  );
};

export default TrafficSignal;
