
export type RoadId = 'A' | 'B' | 'C' | 'D';
export type SignalStatus = 'RED' | 'YELLOW' | 'GREEN';
export type TrafficLevel = 'Low' | 'Medium' | 'High';

export interface VehicleBreakdown {
  bikes: number;
  cars: number;
  autos: number;
  buses: number;
  trucks: number;
}

export interface AnalysisResult {
  breakdown: VehicleBreakdown;
  totalWeight: number;
  trafficLevel: TrafficLevel;
  ambulanceDetected: boolean;
  accidentDetected: boolean;
}

export interface RoadState {
  id: RoadId;
  name: string;
  status: SignalStatus;
  analysis: AnalysisResult | null;
  image: string | null;
  timer: number;
  isActive: boolean;
  lastGreenTime: number;
}

export interface SystemLogs {
  id: string;
  timestamp: Date;
  message: string;
  type: 'INFO' | 'ALERT' | 'EMERGENCY';
}
