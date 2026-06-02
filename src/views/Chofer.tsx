/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLogistika, formatedDisplayDate, getMexicoCityDateStr } from '../context/LogistikaContext';
import { Truck, MapPin, Phone, CheckCircle, Play, Image, Upload, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { compressBase64Image } from '../lib/imageCompressor';

export const Chofer: React.FC<{ lockedDriver?: string }> = ({ lockedDriver }) => {
  const {
    choferes,
    offlineQueue,
    obtenerTareasChofer,
    actualizarEstatusChofer,
    subirFotoDrive,
    obtenerEtaParaTicket,
    guardarLocalPendiente,
    sincronizarPendientesLocales,
    clearOfflineQueue
  } = useLogistika();

  const [internalActiveChofer, setInternalActiveChofer] = useState<string>(choferes[0]?.nombre || 'Elias');
  const activeChofer = lockedDriver || internalActiveChofer;
  const [offlineSimulated, setOfflineSimulated] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Active inputs inside delivery completions
  const [completionTicketId, setCompletionTicketId] = useState<string | null>(null);
  const [receptor, setReceptor] = useState('');
  const [capturedFotos, setCapturedFotos] = useState<string[]>([]);

  const activeTaskList = obtenerTareasChofer(activeChofer);

  const handleToggleOffline = () => {
    setOfflineSimulated(!offlineSimulated);
  };

  const handleSyncClick = async () => {
    if (offlineSimulated) {
      Swal.fire({
        icon: 'warning',
        title: 'Desactive el modo offline',
        text: 'Aún se encuentra en modo sin conexión simulado. Desactívelo primero para poder sincronizar sus datos con la red.',
        background: '#0d1b2a',
        color: '#fff'
      });
      return;
    }

    if (offlineQueue.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'Todo Sincronizado',
        text: 'No tienes entregas pendientes en tu buzón local de almacenamiento.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0d1b2a',
        color: '#fff'
      });
      return;
    }

    setSyncing(true);
    // Simulate slight syncing delay for beautiful, realistic loading progress
    setTimeout(async () => {
      const syncedCount = await sincronizarPendientesLocales();
      setSyncing(false);
      Swal.fire({
        icon: 'success',
        title: '¡Sincronización Terminada!',
        text: `Se subieron ${syncedCount} entregas al sistema central de forma segura.`,
        background: '#0d1b2a',
        color: '#fff'
      });
    }, 1800);
  };

  const handleStartRoute = async (task: any) => {
    // 1. WhatsApp notification trigger
    const phoneClean = task.telefono ? task.telefono.replace(/\D/g, '') : '';
    const formattedTel = phoneClean.length === 10 ? `52${phoneClean}` : phoneClean;
    const isEntrega = task.tipo === 'Entrega';
    const todayStr = getMexicoCityDateStr();

    let etaWindow = 'en los próximos minutos';
    if (isEntrega) {
      etaWindow = obtenerEtaParaTicket(activeChofer, task.id, todayStr, true);
    }

    const templateMsg = `Hola ${task.cliente}!!!\n\nSoy ${activeChofer}, chofer de la tienda ${task.tienda || 'LOGISTIKA'} y me dirijo a su domicilio para hacer la entrega de los materiales que usted adquirió con nosotros. Mi tiempo estimado de llegada es ${etaWindow} del día de hoy.`;

    if (isEntrega && formattedTel) {
      const { isConfirmed } = await Swal.fire({
        title: 'Aviso de WhatsApp',
        html: `
          <p class="text-xs text-slate-300 text-left leading-relaxed">
            Se ha calculado su arribo en la secuencia actual. Presione <strong>Enviar</strong> para simular abrir WhatsApp e informar al cliente:
          </p>
          <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-left mt-3 font-mono text-slate-300 whitespace-pre-line">
            ${templateMsg}
          </div>
        `,
        icon: 'info',
        showCancelButton: true,
        confirmButtonColor: '#25D366',
        confirmButtonText: '💬 Abrir WhatsApp',
        cancelButtonText: 'Omitir Aviso',
        background: '#0d1b2a',
        color: '#fff'
      });

      if (isConfirmed) {
        // Simulated click inside safe window tab
        window.open(`https://wa.me/${formattedTel}?text=${encodeURIComponent(templateMsg)}`, '_blank');
      }
    }

    // Toggle status to EN RUTA
    if (offlineSimulated) {
      // offline status
      guardarLocalPendiente({
        id: task.id,
        hoja: task.hoja,
        nuevoEstatus: 'EN RUTA',
        chofer: activeChofer,
        lat: 19.3980,
        lng: -99.2740,
        receptor: ''
      });
      Swal.fire({
        icon: 'warning',
        title: 'Recorrido Resguardado Offline',
        text: 'Sin señal de red. El inicio de ruta se sincronizará automáticamente al recuperar conexión.',
        background: '#0d1b2a',
        color: '#fff'
      });
    } else {
      actualizarEstatusChofer({
        id: task.id,
        hoja: task.hoja,
        nuevoEstatus: 'EN RUTA',
        chofer: activeChofer,
        lat: 19.3980,
        lng: -99.2740
      });
    }
  };

  const handleOpenFinalizar = (task: any) => {
    setCompletionTicketId(task.id);
    setReceptor('');
    setCapturedFotos([]);
  };

  const handleFotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (capturedFotos.length >= 5) {
        Swal.fire({
          icon: 'warning',
          title: 'Límite alcanzado',
          text: 'Solo se pueden agregar hasta 5 fotografías de la entrega.',
          background: '#0d1b2a',
          color: '#fff'
        });
        return;
      }
      const reader = new FileReader();
      reader.onload = async (event) => {
        const rawBase64 = event.target?.result as string;
        try {
          const compressed = await compressBase64Image(rawBase64);
          setCapturedFotos(prev => [...prev, compressed]);
        } catch (error) {
          console.error("Compression failed, using raw base64 instead:", error);
          setCapturedFotos(prev => [...prev, rawBase64]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveFoto = (idxToRemove: number) => {
    setCapturedFotos(prev => prev.filter((_, idx) => idx !== idxToRemove));
  };

  const handleCompleteTask = () => {
    if (!completionTicketId) return;

    const task = activeTaskList.find(t => t.id === completionTicketId);
    if (!task) return;

    const isEntrega = task.tipo === 'Entrega';
    if (isEntrega && !receptor.trim()) {
      alert('Debe ingresar el nombre de la persona que recibe el material');
      return;
    }

    const receptorLabel = isEntrega ? receptor.toUpperCase().trim() : 'RECOLECTADO';

    if (offlineSimulated) {
      guardarLocalPendiente({
        id: task.id,
        hoja: task.hoja,
        nuevoEstatus: 'FINALIZADO',
        chofer: activeChofer,
        lat: 19.3980,
        lng: -99.2740,
        receptor: receptorLabel,
        fotos: capturedFotos
      });

      Swal.fire({
        icon: 'info',
        title: 'Entrega Resguardada',
        text: 'Sin señal de internet. Esta entrega se guardó localmente de forma segura. Recuerda darle al botón Sincronizar al recuperar señal.',
        background: '#0d1b2a',
        color: '#fff'
      });
    } else {
      actualizarEstatusChofer({
        id: task.id,
        hoja: task.hoja,
        nuevoEstatus: 'FINALIZADO',
        chofer: activeChofer,
        lat: 19.3980,
        lng: -99.2740,
        receptor: receptorLabel,
        fotos: capturedFotos
      });

      Swal.fire({
        icon: 'success',
        title: '¡Entrega Completada!',
        text: 'Registrado en base de datos central.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0d1b2a',
        color: '#fff'
      });
    }

    setCompletionTicketId(null);
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* Syncing loader indicator */}
      {syncing && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-sm">
          <RefreshCw className="animate-spin text-teal-400 mb-3" size={32} />
          <h4 className="text-slate-100 font-bold text-sm">Sincronizando caja fuerte de datos local...</h4>
          <p className="text-slate-500 text-xs mt-1">Subiendo fotos y registros de Sheets en una única transacción.</p>
        </div>
      )}

      {/* Driver profile selector */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h3 className="font-bold text-slate-100 text-lg">Módulo Chofer</h3>
            <span className="text-teal-400 text-xs font-semibold">Consola móvil del transportista</span>
          </div>

          {/* Sync Button */}
          <button 
            onClick={handleSyncClick}
            className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition ${
              offlineQueue.length > 0 
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 animate-pulse' 
                : 'bg-slate-800 text-slate-500 hover:text-slate-400 border border-slate-700/50'
            }`}
          >
            <RefreshCw size={12} className={offlineQueue.length > 0 ? "animate-spin" : ""} />
            Sincronizar {offlineQueue.length > 0 && `(${offlineQueue.length})`}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-2">
          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Operador Activo</label>
            {lockedDriver ? (
              <div className="w-full bg-slate-800 border border-slate-700 text-teal-400 font-bold text-xs rounded-lg p-2.5 select-none">
                👤 {lockedDriver}
              </div>
            ) : (
              <select 
                value={activeChofer}
                onChange={(e) => setInternalActiveChofer(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 focus:outline-none"
              >
                {choferes.map(ch => (
                  <option key={ch.id} value={ch.nombre}>{ch.nombre}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider mb-1">Estado de Red</label>
            <button 
              onClick={handleToggleOffline}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition border ${
                offlineSimulated 
                  ? 'bg-rose-950/20 text-rose-400 border-rose-920' 
                  : 'bg-teal-950/20 text-teal-400 border-teal-920'
              }`}
            >
              {offlineSimulated ? (
                <>
                  <WifiOff size={13} />
                  Modo Offline
                </>
              ) : (
                <>
                  <Wifi size={13} />
                  Online
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {offlineSimulated && (
        <div className="bg-rose-950/30 text-rose-400 border border-rose-910 p-3 rounded-xl text-center text-xs font-semibold flex items-center justify-center gap-2">
          <span>⚠️ Modo Sin Conexión Activado</span>
          <span className="text-[10px] bg-rose-900 text-white font-black px-1.5 py-0.5 rounded">LOCAL CACHE</span>
        </div>
      )}

      {/* Task list list */}
      <div className="space-y-4">
        <h4 className="text-xs uppercase font-extrabold tracking-widest text-slate-450 border-b border-slate-800 pb-2 flex justify-between items-center">
          <span>Ruta de Trabajo</span>
          <span className="text-slate-500">{activeTaskList.length} paradas</span>
        </h4>

        {activeTaskList.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/10 border border-slate-800/80 rounded-xl text-slate-400 text-xs">
            Sin servicios o recolecciones pendientes para hoy.
          </div>
        ) : (
          activeTaskList.map((t, index) => {
            const enRuta = t.estatus === 'EN RUTA';
            const esEntrega = t.tipo === 'Entrega';
            const mapsQuery = t.direccion.replace(/\(.*?\)/g, '').trim();
            const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery)}`;

            return (
              <div key={t.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow">
                <div className="bg-slate-950/80 p-3 border-b border-slate-900 flex justify-between items-center">
                  <span className="text-xs font-mono font-bold text-teal-400 inline-flex items-center gap-1">
                    🎯 Parada #{index + 1} ({t.id})
                  </span>
                  
                  <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded ${
                    enRuta 
                      ? 'bg-rose-955 text-rose-400 border border-rose-900' 
                      : 'bg-amber-955 text-amber-500 border border-amber-900/60'
                  }`}>
                    {t.estatus}
                  </span>
                </div>

                <div className="p-5 space-y-4">
                  <div>
                    <h4 className="text-base font-bold text-slate-100 leading-tight">{t.cliente}</h4>
                    <p className="text-xs text-slate-400 flex items-start gap-1 mt-1.5 leading-relaxed">
                      <MapPin size={12} className="text-rose-455 shrink-0 mt-0.5" />
                      <span>{t.direccion}</span>
                    </p>
                    {t.referencia && (
                      <p className="text-[11px] text-teal-350 ml-4 mt-1">Ref: {t.referencia}</p>
                    )}
                  </div>

                  {/* Operational navigation drivers buttons */}
                  <div className="grid grid-cols-2 gap-3 text-center">
                    <a 
                      href={mapsUrl} 
                      target="_blank" 
                      rel="noreferrer"
                      className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:text-white text-slate-350 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <MapPin size={13} className="text-rose-500" />
                      Navegar (Maps)
                    </a>

                    {t.telefono ? (
                      <a 
                        href={`tel:${t.telefono}`}
                        className="bg-slate-800 hover:bg-slate-700/80 border border-slate-700 hover:text-white text-slate-350 text-xs font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        <Phone size={13} className="text-emerald-500" />
                        Llamar Cliente
                      </a>
                    ) : (
                      <button disabled className="bg-slate-800/40 border border-slate-800/40 text-slate-600 text-xs font-bold py-2.5 rounded-lg shrink-0 cursor-not-allowed">
                        Teléfono N/A
                      </button>
                    )}
                  </div>

                  {/* Actions buttons */}
                  {enRuta ? (
                    <button 
                      onClick={() => handleOpenFinalizar(t)}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition shadow shadow-emerald-950 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle size={15} />
                      Finalizar {esEntrega ? 'Entrega' : 'Recolección'}
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleStartRoute(t)}
                      className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition shadow shadow-teal-950 cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Play size={13} fill="currentColor" />
                      Iniciar Recorrido
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* FINALIZATION DETAILS FILLERS MODAL */}
      {completionTicketId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4">
              <h3 className="font-bold text-slate-100 text-xs uppercase tracking-widest text-teal-400">
                Evidencia de Entrega: #{completionTicketId}
              </h3>
              <button onClick={() => setCompletionTicketId(null)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {activeTaskList.find(t => t.id === completionTicketId)?.tipo === 'Entrega' && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">¿Quién Recibe el Material?</label>
                  <input 
                    type="text" 
                    placeholder="Ej: Lic. Rodolfo Huerta Huerta"
                    value={receptor}
                    onChange={(e) => setReceptor(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase font-semibold"
                  />
                </div>
              )}

              {/* Photo Evidence block */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Captura Fotográfica de la Entrega
                </label>
                
                <div className="bg-slate-950 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                  {capturedFotos.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center py-4 gap-2">
                      <Image size={32} className="text-slate-600" />
                      <div>
                        <p className="text-[11px] text-slate-400 font-bold">Sin fotografías capturadas</p>
                        <p className="text-[9px] text-slate-500 mt-0.5">Captura hasta 5 fotos directo con la cámara móvil</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {capturedFotos.map((pic, idx) => (
                          <div key={idx} className="relative aspect-square border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
                            <img 
                              src={pic} 
                              alt={`Foto ${idx + 1}`} 
                              className="w-full h-full object-cover" 
                            />
                            <button 
                              type="button"
                              onClick={() => handleRemoveFoto(idx)}
                              className="absolute top-1 right-1 bg-rose-600/90 hover:bg-rose-500 text-white rounded-full p-1 cursor-pointer shadow-lg outline-none"
                              title="Suprimir foto"
                            >
                              <X size={10} />
                            </button>
                            <span className="absolute bottom-1 left-1 bg-slate-950/80 text-[8px] text-slate-300 px-1 py-0.5 rounded font-mono">
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-teal-400 font-bold text-right">
                        {capturedFotos.length} de 5 fotos capturadas
                      </p>
                    </div>
                  )}

                  {capturedFotos.length < 5 && (
                    <div className="flex justify-center pt-1">
                      <button 
                        type="button"
                        onClick={() => document.getElementById('cameraInput')?.click()}
                        className="bg-teal-950/40 hover:bg-teal-900/60 border border-teal-900/50 hover:border-teal-800 text-teal-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition inline-flex items-center gap-1.5 shadow"
                      >
                        <Upload size={12} />
                        {capturedFotos.length > 0 ? 'Tomar Otra Foto' : 'Tomar Foto'}
                      </button>
                    </div>
                  )}
                  
                  <input 
                    type="file" 
                    id="cameraInput" 
                    accept="image/*" 
                    capture="environment" 
                    className="hidden" 
                    onChange={handleFotoUpload} 
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button 
                  onClick={handleCompleteTask}
                  className="w-full bg-emerald-600 hover:bg-emerald-555 text-white font-black py-3 rounded-lg text-xs uppercase tracking-widest shadow transition cursor-pointer"
                >
                  Confirmar Firma de Conclusión ✔️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
