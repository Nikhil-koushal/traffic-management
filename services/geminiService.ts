
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const GEMINI_MODEL = "gemini-3-flash-preview";

export const analyzeRoadImage = async (base64Image: string): Promise<AnalysisResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Analyze this traffic camera feed. Provide technical counts only.
    
    1. VEHICLE COUNTS:
       - Bikes (Motorcycles, Bicycles)
       - Cars (Sedans, SUVs)
       - Autos (Rickshaws, 3-wheelers)
       - Buses
       - Trucks (Heavy vehicles)
       
    2. STATUS:
       - Accident Detected: true/false
       - Ambulance Detected: true/false
       
    3. WEIGHTAGE CALCULATION (INTERNAL):
       - Bike = 1
       - Car/Auto = 2
       - Bus/Truck = 3
       - Total Weight = (Bikes*1) + (Cars*2) + (Autos*2) + (Buses*3) + (Trucks*3)
       
    4. TRAFFIC LEVEL (COUNT-BASED):
       - Total Vehicles <= 20: Low
       - Total Vehicles 21-30: Medium
       - Total Vehicles > 30: High

    Return JSON strictly following this schema:
    {
      "breakdown": { "bikes": number, "cars": number, "autos": number, "buses": number, "trucks": number },
      "totalWeight": number,
      "trafficLevel": "Low" | "Medium" | "High",
      "ambulanceDetected": boolean,
      "accidentDetected": boolean
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: "image/jpeg" } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            breakdown: {
              type: Type.OBJECT,
              properties: {
                bikes: { type: Type.NUMBER },
                cars: { type: Type.NUMBER },
                autos: { type: Type.NUMBER },
                buses: { type: Type.NUMBER },
                trucks: { type: Type.NUMBER }
              },
              required: ['bikes', 'cars', 'autos', 'buses', 'trucks']
            },
            totalWeight: { type: Type.NUMBER },
            trafficLevel: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
            ambulanceDetected: { type: Type.BOOLEAN },
            accidentDetected: { type: Type.BOOLEAN }
          },
          required: ['breakdown', 'totalWeight', 'trafficLevel', 'ambulanceDetected', 'accidentDetected']
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Error:", error);
    return {
      breakdown: { bikes: 0, cars: 0, autos: 0, buses: 0, trucks: 0 },
      totalWeight: 0,
      trafficLevel: 'Low',
      ambulanceDetected: false,
      accidentDetected: false
    };
  }
};
