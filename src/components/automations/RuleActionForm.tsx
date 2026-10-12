import React from 'react';
import { Trash2 } from 'lucide-react';
import { AutomationRule, OverlayEffect, RuleAction, SoundPresetId } from '../../types';

interface RuleActionFormProps {
  formData: AutomationRule;
  setFormData: React.Dispatch<React.SetStateAction<AutomationRule>>;
  effects: OverlayEffect[];
}

export const RuleActionForm: React.FC<RuleActionFormProps> = ({
  formData,
  setFormData,
  effects,
}) => {
  const handleToggleAction = (index: number) => {
    const updatedActions = [...formData.actions];
    updatedActions[index].enabled = !updatedActions[index].enabled;
    setFormData({ ...formData, actions: updatedActions });
  };

  const handleUpdateAction = (index: number, partial: Partial<RuleAction>) => {
    const updatedActions = [...formData.actions];
    updatedActions[index] = { ...updatedActions[index], ...partial };
    setFormData({ ...formData, actions: updatedActions });
  };

  const addAction = (newAct: RuleAction) => {
    setFormData({ ...formData, actions: [...formData.actions, newAct] });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-bold text-white block">Acciones a Ejecutar ({formData.actions.length})</span>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() =>
              addAction({
                id: 'act-' + Math.random().toString(36).substring(2, 9),
                type: 'custom_message',
                enabled: true,
                customMessageText: '¡Atención al directo: {user} activó evento!',
              })
            }
            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700"
          >
            + Mensaje
          </button>
          <button
            type="button"
            onClick={() =>
              addAction({
                id: 'act-' + Math.random().toString(36).substring(2, 9),
                type: 'update_counter',
                enabled: true,
                counterId: 'cnt-roses-goal',
                counterOperation: 'increment',
                counterAmount: 'event_amount',
              })
            }
            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded border border-slate-700"
          >
            + Contador
          </button>
          <button
            type="button"
            onClick={() =>
              addAction({
                id: 'act-' + Math.random().toString(36).substring(2, 9),
                type: 'add_leaderboard_points',
                enabled: true,
                leaderboardCategory: 'general',
                leaderboardPoints: 'event_diamonds',
              })
            }
            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 rounded border border-slate-700"
          >
            + Puntos MVP
          </button>
          <button
            type="button"
            onClick={() =>
              addAction({
                id: 'act-' + Math.random().toString(36).substring(2, 9),
                type: 'iot_device_order',
                enabled: true,
                deviceEndpoint: 'http://192.168.1.150/relay/0?turn=on',
                deviceMethod: 'POST',
                deviceCommandPayload: '{"state":"ON","trigger":"{gift}"}',
                deviceTimeoutMs: 2000,
              })
            }
            className="px-2 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-violet-300 rounded border border-slate-700"
          >
            + Dispositivo IoT
          </button>
        </div>
      </div>

      {formData.actions.map((act, idx) => (
        <div
          key={act.id}
          className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-2"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={act.enabled}
                onChange={() => handleToggleAction(idx)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-cyan-500"
              />
              <span className="font-semibold text-slate-200">
                {act.type === 'overlay_effect'
                  ? 'Alerta en Pantalla OBS'
                  : act.type === 'sound_fx'
                  ? 'Reproducir Sonido'
                  : act.type === 'tts_speech'
                  ? 'Locución de Voz (TTS)'
                  : act.type === 'custom_message'
                  ? 'Mensaje en Pantalla'
                  : act.type === 'update_counter'
                  ? 'Actualizar Contador de Transmisión'
                  : act.type === 'add_leaderboard_points'
                  ? 'Añadir Puntos a la Clasificación'
                  : act.type === 'iot_device_order'
                  ? 'Orden a Dispositivo / IoT Seguro'
                  : 'Acción personalizada'}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                const updated = formData.actions.filter((_, i) => i !== idx);
                setFormData({ ...formData, actions: updated });
              }}
              className="text-slate-500 hover:text-rose-400 p-0.5"
              title="Eliminar acción"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {act.type === 'overlay_effect' && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Diseño de Alerta</label>
              <select
                value={act.effectId}
                onChange={(e) => handleUpdateAction(idx, { effectId: e.target.value })}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
              >
                {effects.map((eff) => (
                  <option key={eff.id} value={eff.id}>
                    {eff.name} ({eff.animationType})
                  </option>
                ))}
              </select>
            </div>
          )}

          {act.type === 'sound_fx' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Sonido Sintetizado</label>
                <select
                  value={act.soundId}
                  onChange={(e) =>
                    handleUpdateAction(idx, { soundId: e.target.value as SoundPresetId })
                  }
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                >
                  <option value="chime">Chime Neón (Melódico)</option>
                  <option value="fanfare">Fanfarria Real (Épico)</option>
                  <option value="laser">Láser Cyber (Zap)</option>
                  <option value="coin">Monedas Arcade</option>
                  <option value="powerup">Power Up Ascendente</option>
                  <option value="explosion">Explosión con Filtro</option>
                  <option value="airhorn">Stream Airhorn</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Volumen ({act.volume}%)</label>
                <input
                  type="range"
                  min="10"
                  max="100"
                  value={act.volume || 80}
                  onChange={(e) =>
                    handleUpdateAction(idx, { volume: Number(e.target.value) })
                  }
                  className="w-full"
                />
              </div>
            </div>
          )}

          {act.type === 'tts_speech' && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Mensaje a leer (Variables: {'{user}'}, {'{gift}'}, {'{amount}'}, {'{diamonds}'})
              </label>
              <input
                type="text"
                value={act.ttsTemplate || ''}
                onChange={(e) => handleUpdateAction(idx, { ttsTemplate: e.target.value })}
                placeholder="{user} envió {amount}x {gift}!"
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
              />
            </div>
          )}

          {act.type === 'custom_message' && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">
                Texto del Mensaje en Pantalla
              </label>
              <input
                type="text"
                value={act.customMessageText || ''}
                onChange={(e) => handleUpdateAction(idx, { customMessageText: e.target.value })}
                placeholder="¡Atención al directo: {user} activó evento!"
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
              />
            </div>
          )}

          {act.type === 'update_counter' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Contador Destino</label>
                <select
                  value={act.counterId || 'cnt-roses-goal'}
                  onChange={(e) => handleUpdateAction(idx, { counterId: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                >
                  <option value="cnt-roses-goal">Meta de Rosas</option>
                  <option value="cnt-diamonds-session">Diamantes Acumulados</option>
                  <option value="cnt-likes-rush">Ráfaga de Likes</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Cantidad a Sumar</label>
                <select
                  value={act.counterAmount || 'event_amount'}
                  onChange={(e) => handleUpdateAction(idx, { counterAmount: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                >
                  <option value="event_amount">Cantidad del evento (ej. Rosas x5)</option>
                  <option value="event_diamonds">Diamantes del regalo</option>
                  <option value="1">+1 Unidad fija</option>
                </select>
              </div>
            </div>
          )}

          {act.type === 'add_leaderboard_points' && (
            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Cálculo de Puntos MVP</label>
              <select
                value={act.leaderboardPoints || 'event_diamonds'}
                onChange={(e) => handleUpdateAction(idx, { leaderboardPoints: e.target.value as any })}
                className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
              >
                <option value="event_diamonds">Valor en Diamantes donados</option>
                <option value="50">+50 Puntos fijos</option>
                <option value="100">+100 Puntos fijos</option>
              </select>
            </div>
          )}

          {act.type === 'iot_device_order' && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Dirección del Dispositivo / Smart Plug (HTTP/HTTPS)</label>
                <input
                  type="text"
                  value={act.deviceEndpoint || ''}
                  onChange={(e) => handleUpdateAction(idx, { deviceEndpoint: e.target.value })}
                  placeholder="http://192.168.1.50/relay/0?turn=on"
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Método HTTP</label>
                  <select
                    value={act.deviceMethod || 'POST'}
                    onChange={(e) => handleUpdateAction(idx, { deviceMethod: e.target.value as any })}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white"
                  >
                    <option value="POST">POST (JSON payload)</option>
                    <option value="GET">GET (URL query)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Timeout (ms)</label>
                  <input
                    type="number"
                    value={act.deviceTimeoutMs || 2000}
                    onChange={(e) => handleUpdateAction(idx, { deviceTimeoutMs: Number(e.target.value) })}
                    className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
