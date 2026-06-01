/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLogistika, formatedDisplayDate } from '../context/LogistikaContext';
import { Pedido } from '../types';
import { Camera, ArrowLeft, ArrowUpCircle, Eye, X, Image as ImageIcon, CheckCircle2 } from 'lucide-react';
import Swal from 'sweetalert2';

export const FotoTicket: React.FC<{ lockedStore?: string }> = ({ lockedStore }) => {
  const {
    pedidos,
    tiendas,
    subirFotoDrive
  } = useLogistika();

  const [internalSelectedTienda, setInternalSelectedTienda] = useState<string>(tiendas[0]?.nombre || 'TEKNO INTERLOMAS');
  const selectedTienda = lockedStore || internalSelectedTienda;
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [capturedFoto, setCapturedFoto] = useState<string | null>(null);

  const filterTickets = pedidos.filter(p => {
    const isTiendaMatch = p.tienda.toUpperCase().trim() === selectedTienda.toUpperCase().trim();
    const isParcial = p.tipo.toUpperCase().includes('PARCIAL');
    return isTiendaMatch && isParcial;
  });

  const handleOpenPanel = (p: Pedido) => {
    setSelectedTicketId(p.ticket);
    setCapturedFoto(null);
    setPanelOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedFoto(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUploadClick = () => {
    if (!selectedTicketId || !capturedFoto) return;

    Swal.fire({
      title: '¿Subir esta foto de ticket?',
      html: `Se registrará la evidencia digital para el ticket <strong>${selectedTicketId}</strong> en el sistema central.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#0ea5e9',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, subir',
      background: '#0d1b2a',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        subirFotoDrive(selectedTicketId, capturedFoto);
        setPanelOpen(false);
        Swal.fire({
          icon: 'success',
          title: '¡Evidencia Guardada!',
          text: 'Se actualizó la columna de evidencia en la base de datos.',
          timer: 1500,
          showConfirmButton: false,
          background: '#0d1b2a',
          color: '#fff'
        });
      }
    });
  };

  const activePedidoItem = pedidos.find(p => p.ticket === selectedTicketId);

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header store selection trigger */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-100 text-sm flex items-center gap-1">
            <Camera size={15} className="text-teal-400" />
            Evidencia Parcial
          </h3>
          <p className="text-[10px] text-slate-500 font-medium">Buzón móvil de Foto Ticket</p>
        </div>

        {lockedStore ? (
          <div className="bg-teal-950/40 text-teal-400 border border-teal-900/60 px-3 py-1.5 rounded-lg font-bold text-xs select-none">
            🏢 {lockedStore}
          </div>
        ) : (
          <select 
            value={selectedTienda}
            onChange={(e) => setInternalSelectedTienda(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg p-2 font-bold focus:outline-none"
          >
            {tiendas.map(t => (
              <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="space-y-3">
        <h4 className="text-[10px] uppercase font-bold tracking-widest text-slate-500">
          Entregas Parciales Pendientes de Foto
        </h4>

        {filterTickets.length === 0 ? (
          <div className="text-center py-12 bg-slate-900/10 border border-slate-800 rounded-xl text-slate-500 text-xs font-semibold">
            No se encontraron pedidos de entrega parcial para esta sucursal.
          </div>
        ) : (
          <div className="space-y-3">
            {filterTickets.map((t) => {
              const tieneFoto = t.fotoUrl && t.fotoUrl.trim() !== '';

              return (
                <div 
                  key={t.ticket} 
                  onClick={() => handleOpenPanel(t)}
                  className={`bg-slate-900/60 border ${tieneFoto ? 'border-emerald-900/40' : 'border-slate-800'} p-4 rounded-2xl cursor-pointer hover:border-slate-750 transition flex justify-between items-start gap-3`}
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-xs font-bold text-slate-100">
                        #{t.ticket}
                      </span>
                      <span className="text-[9px] bg-amber-950 text-amber-500 font-extrabold px-1.5 rounded uppercase">
                        {t.tipo}
                      </span>
                    </div>

                    <h4 className="font-bold text-slate-250 truncate text-[13px]">{t.cliente}</h4>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      ⌛ Recibido: {formatedDisplayDate(t.fecha.split(' ')[0])}
                    </p>
                  </div>

                  <div className={`p-2 rounded-full shrink-0 border transition-colors ${
                    tieneFoto 
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-900/50' 
                      : 'bg-rose-950/20 text-rose-455 border-rose-950/50'
                  }`}>
                    <Camera size={16} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SLIDE UP EVIDENCE UPLOADER PANEL */}
      {panelOpen && selectedTicketId && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border-t border-slate-800 rounded-t-3xl w-full max-w-md mx-auto p-6 space-y-5 animate-slide-up shadow-2xl overflow-y-auto max-h-[85vh]">
            <div className="flex justify-between items-center pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setPanelOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-100"
                >
                  <ArrowLeft size={18} />
                </button>
                <div>
                  <h3 className="font-bold text-slate-100 text-sm">Evidencia de Ticket</h3>
                  <p className="text-[10px] text-teal-400 font-mono font-bold">#{selectedTicketId}</p>
                </div>
              </div>
              <button onClick={() => setPanelOpen(false)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            {/* Display existing evidence links */}
            {activePedidoItem?.fotoUrl && (
              <div className="bg-emerald-950/20 text-emerald-400 border border-emerald-950/40 p-3 rounded-lg flex items-center gap-2 text-xs">
                <CheckCircle2 size={16} className="shrink-0" />
                <div className="truncate">
                  <p className="font-bold">Foto Registrada Previamente</p>
                  <a 
                    href={activePedidoItem.fotoUrl} 
                    target="_blank" 
                    rel="noreferrer"
                    className="text-teal-400 text-[10px] underline font-bold cursor-pointer block mt-0.5"
                  >
                    Ver archivo original en Google Drive ↗
                  </a>
                </div>
              </div>
            )}

            {/* Photo capture block previews */}
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">
                Subir Foto desde Celular
              </label>

              <div className="bg-slate-950 border border-dashed border-slate-800 rounded-2xl p-4 flex flex-col items-center justify-center text-center gap-4 aspect-[4/3] relative overflow-hidden">
                {capturedFoto ? (
                  <img src={capturedFoto} alt="Ticket actual" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <>
                    <ImageIcon size={36} className="text-slate-600" />
                    <span className="text-[11px] text-slate-400 font-semibold">Sin foto cargada aún</span>
                  </>
                )}

                <button 
                  type="button"
                  onClick={() => document.getElementById('cameraInputUpload')?.click()}
                  className="bg-slate-850 hover:bg-slate-800 border border-slate-750 text-slate-200 text-xs font-bold px-4 py-2.5 rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow"
                >
                  <Camera size={13} />
                  Tomar / Buscar Foto
                </button>
                <input 
                  type="file" 
                  id="cameraInputUpload" 
                  accept="image/*" 
                  capture="environment" 
                  className="hidden" 
                  onChange={handleFileChange} 
                />
              </div>
            </div>

            {capturedFoto && (
              <button 
                onClick={handleUploadClick}
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-black py-3 rounded-xl text-xs uppercase tracking-widest shadow transition cursor-pointer flex items-center justify-center gap-1.5"
              >
                <ArrowUpCircle size={15} />
                Subir a Google Drive
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
