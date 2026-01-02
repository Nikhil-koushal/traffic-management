
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { RoadState, RoadId, SignalStatus, SystemLogs, TrafficLevel } from './types';
import RoadCard from './components/RoadCard';
import { analyzeRoadImage } from './services/geminiService';
import { TrendingUp, Layers, Play, Square, Cpu, Activity, ArrowRight, ShieldAlert, Radio } from 'lucide-react';
import { CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, XAxis, YAxis } from 'recharts';

const INITIAL_ROADS: RoadState[] = [
  { id: 'A', name: 'North Boulevard', status: 'RED', analysis: null, image: null, timer: 0, isActive: false, lastGreenTime: 0 },
  { id: 'B', name: 'East Avenue', status: 'RED', analysis: null, image: null, timer: 0, isActive: false, lastGreenTime: 0 },
  { id: 'C', name: 'South Drive', status: 'RED', analysis: null, image: null, timer: 0, isActive: false, lastGreenTime: 0 },
  { id: 'D', name: 'West Way', status: 'RED', analysis: null, image: null, timer: 0, isActive: false, lastGreenTime: 0 },
];

const GREEN_TIME_MAP: Record<TrafficLevel, number> = {
  'Low': 15,
  'Medium': 30,
  'High': 45
};

const YELLOW_TIME = 3;

const App: React.FC = () => {
  const [roads, setRoads] = useState<RoadState[]>(INITIAL_ROADS);
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [isSimActive, setIsSimActive] = useState(false);
  const [isManualMode, setIsManualMode] = useState(false);
  const [logs, setLogs] = useState<SystemLogs[]>([]);
  const [analytics, setAnalytics] = useState<{ time: string, weight: number }[]>([]);
  
  const addLog = (message: string, type: SystemLogs['type'] = 'INFO') => {
    setLogs(prev => [{ id: Date.now().toString(), timestamp: new Date(), message, type }, ...prev].slice(0, 30));
  };

  const handleImageUpload = async (id: RoadId, file: File) => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const analysis = await analyzeRoadImage(base64);
      
      setRoads(prev => prev.map(r => r.id === id ? { ...r, image: reader.result as string, analysis } : r));
      
      if (analysis.ambulanceDetected) addLog(`Emergency: Ambulance Road ${id}`, 'EMERGENCY');
      if (analysis.accidentDetected) addLog(`Alert: Accident Road ${id}`, 'ALERT');

      setAnalytics(prev => [...prev, { 
        time: new Date().toLocaleTimeString([], { hour12: false }), 
        weight: analysis.totalWeight 
      }].slice(-20));
    };
    reader.readAsDataURL(file);
  };

  const calculateNextIdx = useCallback((currentRds: RoadState[]) => {
    const candidates = currentRds.map((road, idx) => {
      if (idx === currentIdx) return { idx, score: -1 };
      
      let score = 0;
      if (road.analysis?.ambulanceDetected) score += 10000;
      
      const totalCount = Object.values(road.analysis?.breakdown || {}).reduce((a, b) => a + b, 0);
      if (totalCount > 30) score += 3000;
      else if (totalCount > 20) score += 2000;
      else score += 1000;

      score += (road.analysis?.totalWeight || 0);
      
      const waitTime = Date.now() - road.lastGreenTime;
      if (waitTime > 180000) score += 5000;

      return { idx, score };
    });

    const winner = candidates.sort((a, b) => b.score - a.score)[0];
    return winner.idx;
  }, [currentIdx]);

  const nextIdx = useMemo(() => (isSimActive && !isManualMode) ? calculateNextIdx(roads) : -1, [roads, isSimActive, isManualMode, calculateNextIdx]);

  const pickNextRoad = useCallback(() => {
    // If Manual Mode is on, AI signal control is completely suspended
    if (isManualMode) return;

    setRoads(prev => {
      const targetIdx = calculateNextIdx(prev);
      const updated = prev.map((r, i) => {
        if (i === targetIdx) {
          const level = r.analysis?.trafficLevel || 'Low';
          return { ...r, status: 'GREEN' as SignalStatus, timer: GREEN_TIME_MAP[level], isActive: true, lastGreenTime: Date.now() };
        }
        return { ...r, status: 'RED' as SignalStatus, timer: 0, isActive: false };
      });
      setCurrentIdx(targetIdx);
      addLog(`AI Mode: Route ${updated[targetIdx].id} Open`, 'INFO');
      return updated;
    });
  }, [calculateNextIdx, isManualMode]);

  const handleManualOverride = (targetId: RoadId) => {
    // Only allow manual control if Manual Mode is explicitly enabled
    if (!isManualMode) return;

    const targetIdx = roads.findIndex(r => r.id === targetId);
    setRoads(prev => prev.map((r, i) => {
      if (i === targetIdx) {
        // In Manual Mode, we open exactly one signal and close others
        return { ...r, status: 'GREEN', timer: 0, isActive: true, lastGreenTime: Date.now() };
      }
      return { ...r, status: 'RED', timer: 0, isActive: false };
    }));
    setCurrentIdx(targetIdx);
    addLog(`Manual Command: Open Route ${targetId}`, 'INFO');
  };

  const toggleControlMode = (manual: boolean) => {
    setIsManualMode(manual);
    if (manual) {
      addLog("Operator Authority: Manual Override Enabled", 'ALERT');
    } else {
      addLog("System Authority: AI Control Resumed", 'INFO');
    }
  };

  useEffect(() => {
    // Strict Authority Check: If simulation isn't active or we are in manual mode, stop the AI ticker
    if (!isSimActive || isManualMode) return;
    
    if (currentIdx === -1) pickNextRoad();

    const ticker = setInterval(() => {
      setRoads(prev => {
        const current = prev[currentIdx];
        if (!current) return prev;

        if (current.timer <= 1) {
          if (current.status === 'GREEN') {
            return prev.map((r, i) => i === currentIdx ? { ...r, status: 'YELLOW' as SignalStatus, timer: YELLOW_TIME } : r);
          } else if (current.status === 'YELLOW') {
            setTimeout(pickNextRoad, 0);
            return prev;
          }
        }
        return prev.map((r, i) => i === currentIdx ? { ...r, timer: Math.max(0, r.timer - 1) } : r);
      });
    }, 1000);

    return () => clearInterval(ticker);
  }, [isSimActive, isManualMode, currentIdx, pickNextRoad]);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-inter p-4 md:p-8 overflow-x-hidden">
      <header className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
        <div className="flex items-center gap-6">
          <div className="relative w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl">
            <Cpu className="text-white" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-tech tracking-tighter text-white">SMARTFLOW <span className="text-indigo-500">PRO</span></h1>
            <div className="flex items-center gap-3">
              <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[9px] font-black uppercase ${isManualMode ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : 'bg-green-500/10 text-green-400 border-green-500/20'}`}>
                <Activity size={10} /> {isManualMode ? 'MANUAL MODE' : 'AI MODE'}
              </span>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-[0.3em]">Traffic Control Node</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Mode Selector */}
          <div className="flex bg-slate-900/60 p-1.5 rounded-2xl border border-white/5">
            <button 
              onClick={() => toggleControlMode(false)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-tech transition-all ${!isManualMode ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              AI AUTO
            </button>
            <button 
              onClick={() => toggleControlMode(true)}
              className={`px-5 py-2.5 rounded-xl text-[10px] font-tech transition-all ${isManualMode ? 'bg-orange-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
            >
              MANUAL
            </button>
          </div>

          <div className="bg-slate-900/60 border border-white/5 px-6 py-3 rounded-2xl flex items-center gap-8">
            <div className="flex flex-col">
              <span className="text-[8px] text-slate-500 font-black uppercase">Active Signal</span>
              <span className="text-sm font-tech text-indigo-400">{currentIdx !== -1 ? roads[currentIdx].id : '--'}</span>
            </div>
            {!isManualMode && (
              <>
                <ArrowRight size={14} className="text-slate-700" />
                <div className="flex flex-col">
                  <span className="text-[8px] text-slate-500 font-black uppercase">Next AI Goal</span>
                  <span className="text-sm font-tech text-slate-300">{nextIdx !== -1 ? roads[nextIdx].id : '--'}</span>
                </div>
              </>
            )}
          </div>

          <button onClick={() => { if (!isSimActive) setCurrentIdx(-1); setIsSimActive(!isSimActive); }} className={`px-10 py-4 rounded-2xl font-tech text-xs tracking-widest transition-all ${isSimActive ? 'bg-red-500/10 text-red-500 border border-red-500/30' : 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 hover:scale-105'}`}>
            {isSimActive ? 'HALT' : 'INITIATE'}
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8">
          {/* Signal Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roads.map((road, i) => (
              <RoadCard 
                key={road.id} 
                road={road} 
                isCurrent={currentIdx === i && isSimActive} 
                onImageUpload={(file) => handleImageUpload(road.id, file)}
                onManualOverride={() => handleManualOverride(road.id)}
                isManualMode={isManualMode}
              />
            ))}
          </div>

          {/* Load Analysis Area */}
          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] p-8">
            <h3 className="font-tech text-[9px] text-indigo-400 tracking-[0.3em] uppercase flex items-center gap-2 mb-8">
              <TrendingUp size={14} /> Traffic Density Analytics
            </h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics}>
                  <defs>
                    <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="time" stroke="#475569" fontSize={9} axisLine={false} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={9} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #1e293b' }} />
                  <Area type="monotone" dataKey="weight" stroke="#6366f1" fill="url(#loadGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Console Side Panel */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {isManualMode ? (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-[2rem] p-6 shadow-[inset_0_0_30px_rgba(249,115,22,0.1)]">
              <h3 className="text-orange-500 font-tech text-[9px] mb-4 tracking-widest uppercase flex items-center gap-2">
                <ShieldAlert size={16} /> MANUAL CONTROL ACTIVE
              </h3>
              <div className="space-y-3">
                <div className="bg-orange-600 text-white px-3 py-2 rounded-xl text-[10px] font-black uppercase text-center border border-orange-400/50">
                  AI Control Overridden
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  The automated AI sequence has been suspended. Operator must explicitly choose which signal to open using the console buttons.
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] p-6">
              <h3 className="text-indigo-400 font-tech text-[9px] mb-4 tracking-widest uppercase flex items-center gap-2">
                <Radio size={14} /> AI AUTONOMOUS SCAN
              </h3>
              <div className="space-y-2">
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 uppercase font-black">Emergency Status</span>
                    <span className={roads.some(r => r.analysis?.ambulanceDetected) ? 'text-red-500' : 'text-green-500'}>
                       {roads.some(r => r.analysis?.ambulanceDetected) ? 'DETECTED' : 'CLEAR'}
                    </span>
                 </div>
                 <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-500 uppercase font-black">Safety Integrity</span>
                    <span className={roads.some(r => r.analysis?.accidentDetected) ? 'text-orange-500' : 'text-green-500'}>
                       {roads.some(r => r.analysis?.accidentDetected) ? 'ALERT' : 'NOMINAL'}
                    </span>
                 </div>
              </div>
            </div>
          )}

          <div className="bg-slate-900/60 rounded-[2rem] border border-white/5 p-6 flex flex-col h-full flex-1">
            <h3 className="font-tech text-[9px] text-indigo-400 mb-6 tracking-widest uppercase flex items-center gap-2">
              <Layers size={14} /> Activity Feed
            </h3>
            <div className="space-y-4 overflow-y-auto pr-2 custom-scrollbar">
              {logs.map(log => (
                <div key={log.id} className="flex justify-between items-start border-b border-white/5 pb-3">
                  <div className="flex flex-col gap-1">
                    <span className={`text-[8px] font-black w-fit px-1.5 py-0.5 rounded uppercase ${
                      log.type === 'EMERGENCY' ? 'bg-red-500 text-white' : 
                      log.type === 'ALERT' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-500'
                    }`}>
                      {log.type}
                    </span>
                    <p className="text-[10px] text-slate-300 font-medium">{log.message}</p>
                  </div>
                  <span className="text-[8px] text-slate-700 font-mono mt-1">{log.timestamp.toLocaleTimeString([], { hour12: false })}</span>
                </div>
              ))}
              {logs.length === 0 && <div className="py-20 text-center text-slate-700 text-[10px] uppercase font-tech tracking-widest">Awaiting Input</div>}
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-slate-700 text-[8px] font-black uppercase tracking-[0.5em] gap-4">
        <div className="flex items-center gap-4">
           <span>Control: 0x4A2-PRO</span>
           <span className="w-1 h-1 bg-slate-800 rounded-full" />
           <span>Controller Authority: {isManualMode ? 'OPERATOR' : 'AI ENGINE'}</span>
        </div>
        <div className="flex items-center gap-2">
           <div className={`w-2 h-2 rounded-full ${isSimActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-700'}`} />
           SYSTEM {isSimActive ? 'ENGAGED' : 'STANDBY'}
        </div>
      </footer>

      <style>{`
        .font-tech { font-family: 'Orbitron', sans-serif; }
        .custom-scrollbar::-webkit-scrollbar { width: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #1e293b; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;
