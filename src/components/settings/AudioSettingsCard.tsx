import React from 'react';
import { Volume2 } from 'lucide-react';
import { AppSettings } from '../../types';
import { audioEngine } from '../../services/audioEngine';

interface AudioSettingsCardProps {
  formData: AppSettings;
  setFormData: React.Dispatch<React.SetStateAction<AppSettings>>;
  onTestAudio: () => void;
}

export const AudioSettingsCard: React.FC<AudioSettingsCardProps> = ({
  formData,
  setFormData,
  onTestAudio,
}) => {
  return (
    <div className="p-5 rounded-xl bg-[#0B0F1A] border border-slate-800 space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
        <span className="text-sm font-bold text-white flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-violet-400" />
          Sintetizador de Audio & Volumen Maestro
        </span>
      </div>

      <div className="space-y-4 text-xs">
        <div>
          <div className="flex justify-between text-slate-300 mb-1.5">
            <span>Volumen Maestro de Efectos</span>
            <span className="font-mono font-bold text-cyan-400">
              {formData.masterVolume}%
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            value={formData.masterVolume}
            onChange={(e) => {
              const val = Number(e.target.value);
              setFormData((prev) => ({ ...prev, masterVolume: val }));
              audioEngine.setMasterVolume(val);
            }}
            className="w-full"
          />
        </div>

        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="enableAudioSynth"
              checked={formData.enableAudioSynthesizer}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, enableAudioSynthesizer: e.target.checked }))
              }
              className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-cyan-500"
            />
            <label htmlFor="enableAudioSynth" className="text-slate-200 cursor-pointer">
              Activar Sintetizador Web Audio API nativo
            </label>
          </div>

          <button
            type="button"
            onClick={onTestAudio}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700 text-[11px] font-semibold"
          >
            Probar Sonido
          </button>
        </div>
        <p className="text-[11px] text-slate-500 leading-relaxed">
          El motor sintetiza ondas cuadradas y senoidales directamente en el navegador. Cero retrasos y sin caídas de enlaces externos.
        </p>
      </div>
    </div>
  );
};
