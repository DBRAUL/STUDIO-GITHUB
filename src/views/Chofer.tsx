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
    clearOfflineQueue,
    kilometrajes,
    guardarKilometrajeHoy,
    unidades
  } = useLogistika();

  const [internalActiveChofer, setInternalActiveChofer] = useState<string>(choferes[0]?.nombre || 'Elias');
  const activeChofer = lockedDriver || internalActiveChofer;
  const [offlineSimulated, setOfflineSimulated] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Mileage verification state
  const [mileageTaskToStart, setMileageTaskToStart] = useState<any | null>(null);
  const [mileageBase64, setMileageBase64] = useState<string | null>(null);
  const [savingMileage, setSavingMileage] = useState(false);
  const [selectedUnidadId, setSelectedUnidadId] = useState<string>('');
  const [ocrMileage, setOcrMileage] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);

  // Active inputs inside delivery completions
  const [completionTicketId, setCompletionTicketId] = useState<string | null>(null);
  const [receptor, setReceptor] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [capturedFotos, setCapturedFotos] = useState<string[]>([]);

  const activeTaskList = obtenerTareasChofer(activeChofer);

  const runOdometerOcr = async (base64Str: string) => {
    setIsOcrProcessing(true);
    setOcrMileage('');
    try {
      const response = await fetch('/api/gemini/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Str })
      });
      if (!response.ok) {
        throw new Error('Server returned error status');
      }
      const data = await response.json();
      if (data && (typeof data.kmValue === 'number' || data.kmValue)) {
        setOcrMileage(String(data.kmValue));
      }
    } catch (err) {
      console.error("Error during odometer OCR:", err);
    } finally {
      setIsOcrProcessing(false);
    }
  };

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
    // Check if this driver already registered mileage for today
    const todayStr = getMexicoCityDateStr();
    const hasMileage = (kilometrajes || []).some(
      k => k.chofer?.toLowerCase() === activeChofer.toLowerCase() && k.fecha === todayStr
    );

    if (!hasMileage) {
      // Intercept with mileage photo prompt modal
      setMileageTaskToStart(task);
      setMileageBase64(null);
      return;
    }

    await proceedStartRoute(task);
  };

  const proceedStartRoute = async (task: any) => {
    // 1. WhatsApp notification trigger
    const phoneClean = task.telefono ? task.telefono.replace(/\D/g, '') : '';
    const formattedTel = phoneClean.length === 10 ? `52${phoneClean}` : phoneClean;
    const isEntrega = task.tipo === 'Entrega';
    const isEntregaEnTienda = task.direccion && task.direccion.toUpperCase().includes('ENTREGA EN TIENDA');
    const todayStr = getMexicoCityDateStr();

    let etaWindow = 'en los próximos minutos';
    if (isEntrega) {
      etaWindow = obtenerEtaParaTicket(activeChofer, task.id, todayStr, true);
    }

    const templateMsg = `Hola ${task.cliente}!!!\n\nSoy ${activeChofer}, chofer de la tienda ${task.tienda || 'LOGISTIKA'} y me dirijo a su domicilio para hacer la entrega de los materiales que usted adquirió con nosotros. Mi tiempo estimado de llegada es ${etaWindow} del día de hoy.`;

    if (isEntrega && formattedTel && !isEntregaEnTienda) {
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
    setComentarios('');
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
      Swal.fire({
        icon: 'warning',
        title: 'Atención',
        text: 'Debe ingresar el nombre de la persona que recibe el material de forma obligatoria.',
        background: '#0d1b2a',
        color: '#fff',
        confirmButtonColor: '#eab308'
      });
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
        fotos: capturedFotos,
        comentarioChofer: comentarios.trim()
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
        fotos: capturedFotos,
        comentarioChofer: comentarios.trim()
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
    setReceptor('');
    setComentarios('');
    setCapturedFotos([]);
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

                  {/* Operational driver instructions and logistics/compras fields */}
                  {(t.obs || t.obsLogistica || t.comprasObs || t.comprasUbic) && (
                    <div className="bg-slate-950/40 border border-slate-800/80 rounded-xl p-3.5 space-y-3.5 text-xs">
                      {t.obs && (
                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase font-extrabold tracking-wider text-rose-455">
                            🏪 Obs. de la Tienda
                          </span>
                          <p className="text-slate-200 font-medium bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words leading-relaxed">
                            {t.obs}
                          </p>
                        </div>
                      )}

                      {t.obsLogistica && (
                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase font-extrabold tracking-wider text-teal-400">
                            📋 Obs. Logística
                          </span>
                          <p className="text-slate-200 font-medium bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words leading-relaxed">
                            {t.obsLogistica}
                          </p>
                        </div>
                      )}

                      {t.comprasObs && (
                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase font-extrabold tracking-wider text-amber-500">
                            📝 Notas de Compras
                          </span>
                          <p className="text-slate-200 font-medium bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words leading-relaxed">
                            {t.comprasObs}
                          </p>
                        </div>
                      )}

                      {t.comprasUbic && (
                        <div className="space-y-1">
                          <span className="block text-[10px] uppercase font-extrabold tracking-wider text-sky-400">
                            📍 Ubicación de Material
                          </span>
                          <p className="text-slate-250 font-mono bg-slate-900 border border-slate-800/50 rounded-lg px-2.5 py-1.5 whitespace-pre-wrap break-words tracking-wide leading-relaxed">
                            {t.comprasUbic}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

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
                      className="w-full bg-amber-600 hover:bg-amber-550 text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest transition shadow shadow-amber-950 cursor-pointer flex items-center justify-center gap-1.5"
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
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setCompletionTicketId(null); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 mt-24 mb-8 md:my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="font-bold text-slate-100 text-xs uppercase tracking-widest text-teal-400">
                Evidencia de Entrega: #{completionTicketId}
              </h3>
              <button onClick={() => setCompletionTicketId(null)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 overflow-y-auto flex-grow pr-1">
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

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5 font-sans">
                  Comentarios o Anotaciones de Carga/Entrega
                </label>
                <textarea 
                  placeholder="Escribe aquí observaciones, inconvenientes o detalles opcionales..."
                  value={comentarios}
                  onChange={(e) => setComentarios(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 text-xs rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                />
              </div>

              <div className="pt-2 border-t border-slate-800">
                <button 
                  onClick={handleCompleteTask}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white font-black py-3 rounded-lg text-xs uppercase tracking-widest shadow shadow-rose-950 transition cursor-pointer"
                >
                  Confirmar Firma de Conclusión ✔️
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ODÓMETRO / MILEAGE ENTRY MODAL */}
      {mileageTaskToStart && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) {
            setMileageTaskToStart(null);
            setSelectedUnidadId('');
            setOcrMileage('');
            setMileageBase64(null);
          }}}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 mt-24 mb-8 md:my-8 cursor-default overflow-hidden flex flex-col justify-between">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="font-bold text-slate-100 text-xs uppercase tracking-widest text-amber-500">
                Primer Viaje del Día: Kilometraje
              </h3>
              <button onClick={() => {
                setMileageTaskToStart(null);
                setSelectedUnidadId('');
                setOcrMileage('');
                setMileageBase64(null);
              }} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed text-left">
                Hola, <strong>{activeChofer}</strong>. Este es tu primer viaje del día actual. Por políticas de la empresa, debes seleccionar la camioneta y tomar una fotografía legible del <strong>odómetro (kilometraje)</strong> antes de iniciar recorrido.
              </p>

              {/* Vehicle Selection dropdown */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Selecciona la Camioneta / Unidad <span className="text-amber-500">*</span>
                </label>
                <select
                  value={selectedUnidadId}
                  onChange={(e) => setSelectedUnidadId(e.target.value)}
                  className="w-full bg-slate-950 text-slate-200 text-xs border border-slate-800 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                >
                  <option value="">-- Seleccionar Camioneta --</option>
                  {unidades.map(u => (
                    <option key={u.id} value={u.id}>{u.id} - {u.placa}</option>
                  ))}
                </select>
              </div>

              <div className="bg-slate-950 border border-dashed border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                {!mileageBase64 ? (
                  <div className="flex flex-col items-center justify-center text-center py-6 gap-2">
                    <Truck size={36} className="text-slate-600 animate-pulse" />
                    <div>
                      <p className="text-[11px] text-slate-400 font-bold">Foto del Odómetro/Kilometraje</p>
                      <p className="text-[9px] text-slate-500 mt-0.5">La foto se enviará para lectura artificial automática</p>
                    </div>
                  </div>
                ) : (
                  <div className="relative aspect-video border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
                    <img 
                      src={mileageBase64} 
                      alt="Kilometraje camioneta" 
                      className="w-full h-full object-cover" 
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        setMileageBase64(null);
                        setOcrMileage('');
                      }}
                      className="absolute top-2 right-2 bg-rose-600/90 hover:bg-rose-500 text-white rounded-full p-1.5 cursor-pointer shadow-lg outline-none"
                      title="Quitar foto"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}

                <div className="flex justify-center pt-1">
                  <button 
                    type="button"
                    onClick={() => document.getElementById('mileageCameraInput')?.click()}
                    className="bg-amber-950/40 hover:bg-amber-900/60 border border-amber-900/50 hover:border-amber-800 text-amber-300 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition inline-flex items-center gap-1.5 shadow"
                  >
                    <Upload size={12} />
                    {mileageBase64 ? 'Cambiar Foto' : 'Tomar Foto de Kilometraje'}
                  </button>
                </div>
                
                <input 
                  type="file" 
                  id="mileageCameraInput" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSavingMileage(true);
                      try {
                        const base64 = await compressBase64Image(file);
                        setMileageBase64(base64);
                        // Trigger AI OCR processing
                        runOdometerOcr(base64);
                      } catch (err) {
                        console.error("Error compressing mileage photo:", err);
                        Swal.fire({
                          icon: 'error',
                          title: 'Error de Compresión',
                          text: 'No se pudo procesar la imagen elegida.',
                          background: '#0d1b2a',
                          color: '#fff'
                        });
                      } finally {
                        setSavingMileage(false);
                      }
                    }
                  }} 
                />
              </div>

              {/* OCR Extracted mileage review section */}
              {mileageBase64 && (
                <div className="space-y-2 text-left animate-fade-in">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Kilometraje Registrado <span className="text-amber-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Ingrese kilómetros mostrados"
                      value={ocrMileage}
                      onChange={(e) => setOcrMileage(e.target.value)}
                      className="w-full bg-slate-950 text-slate-100 text-xs border border-slate-800 rounded-lg p-2.5 pr-20 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono font-bold"
                      disabled={isOcrProcessing}
                    />
                    {isOcrProcessing && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 text-[8px] text-teal-400 font-bold font-mono uppercase bg-slate-900 border border-teal-850 px-1.5 py-0.5 rounded">
                        <RefreshCw size={9} className="animate-spin text-teal-400" />
                        OCR AI...
                      </div>
                    )}
                  </div>
                  {isOcrProcessing ? (
                    <p className="text-[10px] text-teal-400 font-bold flex items-center gap-1 font-mono">
                      ✨ Gemini está procesando la lectura del odómetro...
                    </p>
                  ) : ocrMileage ? (
                    <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1 font-mono">
                      ✓ Kilometraje extraído por Gemini AI. Confirma o corrige si es necesario.
                    </p>
                  ) : (
                    <p className="text-[10px] text-yellow-500 font-bold flex items-center gap-1 font-mono">
                      ⚠️ No detectado automáticamente. Digiite los kilómetros manualmente por favor.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <button 
                onClick={async () => {
                  if (!selectedUnidadId) {
                    Swal.fire({
                      icon: 'warning',
                      title: 'Camioneta Requerida',
                      text: 'Por favor, selecciona la unidad o camioneta que vas a conducir hoy.',
                      background: '#0d1b2a',
                      color: '#fff'
                    });
                    return;
                  }
                  if (!mileageBase64) {
                    Swal.fire({
                      icon: 'warning',
                      title: 'Foto Obligatoria',
                      text: 'Debes capturar la fotografía del kilometraje antes de continuar.',
                      background: '#0d1b2a',
                      color: '#fff'
                    });
                    return;
                  }
                  if (!ocrMileage || Number(ocrMileage) <= 0) {
                    Swal.fire({
                      icon: 'warning',
                      title: 'Kilometraje Requerido',
                      text: 'Por favor ingresa un número de kilómetros válido mayor a cero.',
                      background: '#0d1b2a',
                      color: '#fff'
                    });
                    return;
                  }
                  setSavingMileage(true);
                  const todayStr = getMexicoCityDateStr();
                  const saved = await guardarKilometrajeHoy(activeChofer, todayStr, mileageBase64, selectedUnidadId, Number(ocrMileage));
                  if (saved) {
                    const task = mileageTaskToStart;
                    setMileageTaskToStart(null);
                    setMileageBase64(null);
                    setSelectedUnidadId('');
                    setOcrMileage('');
                    setSavingMileage(false);
                    // Now proceed normally to starting the route!
                    proceedStartRoute(task);
                  } else {
                    setSavingMileage(false);
                    Swal.fire({
                      icon: 'error',
                      title: 'Error al Guardar',
                      text: 'No se pudo registrar la foto del kilometraje. Verifique su señal e intente nuevamente.',
                      background: '#0d1b2a',
                      color: '#fff'
                    });
                  }
                }}
                disabled={savingMileage || !mileageBase64 || !selectedUnidadId || !ocrMileage || isOcrProcessing}
                className={`w-full font-black py-3 rounded-lg text-xs uppercase tracking-widest transition cursor-pointer ${
                  !mileageBase64 || !selectedUnidadId || !ocrMileage || savingMileage || isOcrProcessing
                    ? 'bg-slate-850 border border-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow shadow-amber-950/20'
                }`}
              >
                {savingMileage ? 'Guardando...' : 'Comenzar Ruta del Día 🚚'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
