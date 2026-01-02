
import React, { useRef } from 'react';
import { RoadState } from '../types';
import TrafficSignal from './TrafficSignal';
import { Ambulance, Car, Camera, Bike, Truck, Bus, Zap, AlertCircle, Power } from 'lucide-react';

interface RoadCardProps {
  road: RoadState;
  onImageUpload: (file: File) => void;
  onManualOverride: () => void;
  isCurrent: boolean;
  isManualMode: boolean;
}

const RoadCard: React.FC<RoadCardProps> = ({ road, onImageUpload, onManualOverride, isCurrent, isManualMode }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getLevelColor = (level?: string) => {
    switch (level) {
      case 'High': return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'Medium': return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'Low': return 'text-green-400 border-green-500/30 bg-green-500/10';
      default: return 'text-slate-500 border-slate-700 bg-slate-800/50';
    }
  };

  return (
    <div className={`relative bg-slate-900/60 backdrop-blur-2xl rounded-[2.5rem] border-2 p-6 transition-all duration-500 ${
      isCurrent ? 'border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.15)]' : 'border-white/5'
    }`}>
      
      {/* HUD Badges */}
      <div className="absolute top-6 right-6 flex flex-col items-end gap-2 z-20">
        <div className={`px-3 py-1 rounded-lg border text-[10px] font-black uppercase tracking-widest ${getLevelColor(road.analysis?.trafficLevel)}`}>
          {road.analysis?.trafficLevel || 'IDLE'}
        </div>
      </div>

      <div className="flex gap-6">
        {/* Signal Column */}
        <div className="flex flex-col items-center gap-4">
          <TrafficSignal status={road.status} size="md" />
          <div className={`font-tech text-3xl font-bold ${isCurrent ? 'text-indigo-400' : 'text-slate-800'}`}>
            {isCurrent && !isManualMode ? String(Math.ceil(road.timer)).padStart(2, '0') : '--'}
          </div>
        </div>

        {/* Data Content */}
        <div className="flex-1 min-w-0">
          <header className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-tech border transition-all ${isCurrent ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-800 border-white/5 text-slate-500'}`}>
                {road.id}
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">{road.name}</h3>
            </div>
          </header>

          <div className="space-y-4">
            {/* Status Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className={`p-2 rounded-xl border text-[9px] font-black flex items-center gap-2 uppercase tracking-tighter ${road.analysis?.accidentDetected ? 'bg-orange-500/20 text-orange-500 border-orange-500/30' : 'bg-slate-800/50 text-slate-500 border-white/5'}`}>
                <AlertCircle size={12} /> Accident: {road.analysis?.accidentDetected ? 'Detected' : 'Not Detected'}
              </div>
              <div className={`p-2 rounded-xl border text-[9px] font-black flex items-center gap-2 uppercase tracking-tighter ${road.analysis?.ambulanceDetected ? 'bg-red-500/20 text-red-500 border-red-500/30' : 'bg-slate-800/50 text-slate-500 border-white/5'}`}>
                <Ambulance size={12} /> Ambulance: {road.analysis?.ambulanceDetected ? 'Detected' : 'Not Detected'}
              </div>
            </div>

            {/* Visual Feed */}
            <div onClick={() => fileInputRef.current?.click()} className="relative aspect-video rounded-2xl bg-black/40 border border-white/5 overflow-hidden cursor-pointer group shadow-inner">
              {road.image ? (
                <img src={road.image} alt={road.name} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-700">
                  <Camera size={24} className="mb-1" />
                  <span className="text-[8px] font-tech uppercase tracking-widest text-center px-4">Tap to connect Sensor Feed</span>
                </div>
              )}
              <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => e.target.files?.[0] && onImageUpload(e.target.files[0])} accept="image/*" />
            </div>

            {/* Manual Action Button */}
            {isManualMode && (
              <button 
                onClick={(e) => { e.stopPropagation(); onManualOverride(); }}
                className={`w-full py-4 rounded-xl text-[11px] font-tech font-black uppercase tracking-[0.2em] transition-all border flex items-center justify-center gap-3 ${
                  isCurrent 
                  ? 'bg-green-600 border-green-400 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)]' 
                  : 'bg-slate-800 border-white/10 text-slate-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-400'
                }`}
              >
                <Power size={14} />
                {isCurrent ? 'SIGNAL OPEN' : 'OPEN SIGNAL'}
              </button>
            )}

            {/* Numerical Breakdown */}
            <div className="grid grid-cols-5 gap-1">
              <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center" title="Bikes">
                <Bike size={12} className="text-slate-500 mb-1" />
                <span className="text-[10px] font-bold">{road.analysis?.breakdown.bikes ?? 0}</span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center" title="Cars">
                <Car size={12} className="text-slate-500 mb-1" />
                <span className="text-[10px] font-bold">{road.analysis?.breakdown.cars ?? 0}</span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center" title="Autos">
                <Zap size={12} className="text-slate-500 mb-1" />
                <span className="text-[10px] font-bold">{road.analysis?.breakdown.autos ?? 0}</span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center" title="Buses">
                <Bus size={12} className="text-slate-500 mb-1" />
                <span className="text-[10px] font-bold">{road.analysis?.breakdown.buses ?? 0}</span>
              </div>
              <div className="bg-slate-800/50 p-2 rounded-lg border border-white/5 flex flex-col items-center" title="Heavy">
                <Truck size={12} className="text-slate-500 mb-1" />
                <span className="text-[10px] font-bold">{road.analysis?.breakdown.trucks ?? 0}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoadCard;
