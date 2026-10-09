import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Terminal,
  Monitor,
  Server,
  Key,
  ShieldCheck,
} from 'lucide-react';

interface DeploymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DeploymentModal: React.FC<DeploymentModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'obs' | 'deploy' | 'env'>('obs');

  if (!isOpen) return null;

  const obsUrl = `${window.location.origin}${window.location.pathname}?mode=overlay`;

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-3xl bg-[#0D121F] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
              <Monitor className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                Guía de OBS Studio y Despliegue en Servidores
              </h2>
              <span className="text-xs text-slate-400">
                Instrucciones para producción, streaming en vivo y Cloud Run / Docker
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab selector */}
        <div className="flex items-center gap-2 px-5 pt-3 border-b border-slate-800/80 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('obs')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'obs'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Configuración OBS Studio
          </button>
          <button
            onClick={() => setActiveTab('deploy')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'deploy'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Despliegue Local & Cloud
          </button>
          <button
            onClick={() => setActiveTab('env')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all ${
              activeTab === 'env'
                ? 'border-cyan-400 text-cyan-300'
                : 'border-transparent text-slate-400 hover:text-white'
            }`}
          >
            Variables de Entorno (.env)
          </button>
        </div>

        {/* Body content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-300 leading-relaxed">
          {activeTab === 'obs' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <span className="text-xs font-bold text-white block">
                  1. URL de la Fuente de Navegador para OBS Studio
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={obsUrl}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-cyan-300 font-mono text-[11px] select-all"
                  />
                  <button
                    onClick={() => copyText('obs-url', obsUrl)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 hover:bg-cyan-500/30 rounded-lg font-semibold"
                  >
                    {copiedKey === 'obs-url' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedKey === 'obs-url' ? 'Copiado' : 'Copiar'}</span>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-white block">
                  2. Pasos para agregar la fuente en OBS Studio:
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>Abre OBS Studio y dirígete al panel de <strong>Fuentes</strong>.</li>
                  <li>Haz clic en el botón <strong>+</strong> y selecciona <strong>Navegador (Browser Source)</strong>.</li>
                  <li>Asígnale un nombre (ej. <em>LiveTrigger Alertas</em>).</li>
                  <li>Pega la URL copiada arriba en el campo <strong>URL</strong>.</li>
                  <li>Configura <strong>Ancho: 1920</strong> y <strong>Alto: 1080</strong> (o la resolución de tu lienzo).</li>
                  <li>Marca la casilla <strong>"Controlar audio a través de OBS"</strong> si deseas ecualizar el sonido en el mezclador de OBS.</li>
                  <li>Marca <strong>"Actualizar el navegador cuando la escena se active"</strong>.</li>
                </ol>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-800/40 text-[11px] text-emerald-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>
                  Sincronización instantánea activa mediante BroadcastChannel nativo. Todos los eventos disparados en tu panel se renderizan en OBS en menos de 10ms.
                </span>
              </div>
            </div>
          )}

          {activeTab === 'deploy' && (
            <div className="space-y-4">
              <div>
                <span className="font-bold text-white block mb-1">Ejecución Local con Node.js</span>
                <p className="text-slate-400 mb-2">
                  Puedes clonar y ejecutar LiveTrigger AI en tu propia máquina para máxima velocidad:
                </p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 space-y-1">
                  <div>npm install</div>
                  <div>npm run build</div>
                  <div>npm run dev   # corre en http://localhost:3000</div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <span className="font-bold text-white block mb-1">
                  Despliegue en la Nube (Google Cloud Run / Vercel / Docker)
                </span>
                <p className="text-slate-400 mb-2">
                  El build genera archivos estáticos optimizados listos para servir con cualquier CDN o contenedor Docker:
                </p>
                <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-300 space-y-1">
                  <div className="text-slate-500"># Dockerfile estándar</div>
                  <div>FROM node:20-alpine AS builder</div>
                  <div>WORKDIR /app</div>
                  <div>COPY package*.json ./</div>
                  <div>RUN npm install</div>
                  <div>COPY . .</div>
                  <div>RUN npm run build</div>
                  <div className="text-emerald-400">EXPOSE 3000</div>
                  <div>CMD ["npm", "run", "dev"]</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'env' && (
            <div className="space-y-4">
              <span className="font-bold text-white block">Archivo de Configuración .env</span>
              <p className="text-slate-400">
                Copia este contenido en tu archivo <code>.env</code> en la raíz del proyecto para definir variables seguras:
              </p>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-[11px] text-cyan-300 overflow-x-auto">
{`# Puerto del servidor web (por defecto 3000)
PORT=3000

# URL pública de la aplicación
APP_URL="https://tu-dominio-stream.com"

# API Key opcional si se habilitan funciones de resumen
GEMINI_API_KEY=""

# Modo por defecto: simulation o real_tiktok
DEFAULT_CONNECTION_MODE="simulation"`}
                </pre>
                <button
                  onClick={() =>
                    copyText(
                      'env-content',
                      'PORT=3000\nAPP_URL="http://localhost:3000"\nDEFAULT_CONNECTION_MODE="simulation"'
                    )
                  }
                  className="absolute top-3 right-3 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded text-[11px] font-semibold flex items-center gap-1"
                >
                  {copiedKey === 'env-content' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedKey === 'env-content' ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 rounded-lg"
          >
            Entendido, Cerrar Guía
          </button>
        </div>
      </div>
    </div>
  );
};
