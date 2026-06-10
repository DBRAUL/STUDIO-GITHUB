/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLogistika, formatedDisplayDate, formatedDisplayDateTime } from '../context/LogistikaContext';
import { Pedido } from '../types';
import { Plus, Search, MapPin, Phone, MessageSquare, Edit2, Calendar, FileText, X, Check, Eye, Upload } from 'lucide-react';
import Swal from 'sweetalert2';
import { compressBase64Image } from '../lib/imageCompressor';

export const Tienda: React.FC<{ lockedStore?: string }> = ({ lockedStore }) => {
  const {
    pedidos,
    tiendas,
    guardarPedidoTienda,
    verificarTicketExistente,
    obtenerProyeccionRutaPorTienda
  } = useLogistika();

  const [internalTiendaSelec, setInternalTiendaSelec] = useState<string>(tiendas[0]?.nombre || 'TEKNO INTERLOMAS');
  const tiendaSelec = lockedStore || internalTiendaSelec;
  const [buscar, setBuscar] = useState<string>('');
  
  // Modal states
  const [modalOpen, setModalOpen] = useState(false);
  const [esEdicion, setEsEdicion] = useState(false);
  const [ticketNum, setTicketNum] = useState('');
  const [clienteNombre, setClienteNombre] = useState('');
  const [clienteTel, setClienteTel] = useState('');
  const [tipoCarga, setTipoCarga] = useState('Todo el Ticket');
  const [checkTienda, setCheckTienda] = useState(false);
  const [direccionPegada, setDireccionPegada] = useState('');
  const [numInt, setNumInt] = useState('');
  const [referencias, setReferencias] = useState('');
  const [obsTienda, setObsTienda] = useState('');
  const [captura, setCaptura] = useState('');
  const [capturaLoading, setCapturaLoading] = useState(false);
  const [msgError, setMsgError] = useState('');

  // Suggestions state
  const [sugList, setSugList] = useState<any[]>([]);

  // Cronograma projection
  const [cronoOpen, setCronoOpen] = useState(false);
  const [cronoData, setCronoData] = useState<any>(null);

  // Zoomable Foto ticket
  const [zoomFotoUrl, setZoomFotoUrl] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });

  const activeSiglas = tiendas.find(t => t.nombre === tiendaSelec)?.siglas || 'TIV';

  const filterPedidos = pedidos.filter(p => p.tienda.toUpperCase() === tiendaSelec.toUpperCase());
  const displayPedidos = filterPedidos.filter(p => {
    const q = buscar.toLowerCase();
    return p.ticket.toLowerCase().includes(q) ||
           p.cliente.toLowerCase().includes(q) ||
           (p.dir || '').toLowerCase().includes(q) ||
           (p.tel || '').includes(q);
  });

  const uniqueCustomers = Array.from(new Set(pedidos.map(p => p.cliente))).map(cli => {
    return pedidos.find(p => p.cliente === cli);
  }).filter(Boolean);

  const handleClienteChange = (val: string) => {
    setClienteNombre(val);
    if (val.length > 2) {
      const match = uniqueCustomers.filter(c => c?.cliente.toUpperCase().includes(val.toUpperCase()));
      setSugList(match);
    } else {
      setSugList([]);
    }
  };

  const selectSurg = (item: any) => {
    setClienteNombre(item.cliente);
    setClienteTel(item.tel);
    setReferencias(item.ref);
    // clean address of Int block if exists
    let cleanAddress = item.dir || '';
    if (cleanAddress.toUpperCase().includes('(INT.')) {
      const match = cleanAddress.match(/\(INT\.\s?(.*?)\)/i);
      if (match) {
        setNumInt(match[1]);
        cleanAddress = cleanAddress.replace(/\(INT\.\s?.*?\)\s?/i, '').trim();
      }
    }
    setDireccionPegada(cleanAddress);
    setSugList([]);
  };

  const handleOpenNuevo = () => {
    setEsEdicion(false);
    setTicketNum('');
    setClienteNombre('');
    setClienteTel('');
    setTipoCarga('Todo el Ticket');
    setCheckTienda(false);
    setDireccionPegada('');
    setNumInt('');
    setReferencias('');
    setObsTienda('');
    setCaptura('');
    setMsgError('');
    setModalOpen(true);
  };

  const handleOpenEdicion = (p: Pedido) => {
    setEsEdicion(true);
    // remove store initials to isolate pure ticket number
    const numPart = p.ticket.replace(activeSiglas, '');
    setTicketNum(numPart);
    setClienteNombre(p.cliente);
    setClienteTel(p.tel);
    setTipoCarga(p.tipo);
    setReferencias(p.ref);
    setObsTienda(p.obs);
    setCaptura(p.captura || '');
    setMsgError('');

    const isStorePickup = p.dir.includes('(ENTREGA EN TIENDA:)');
    setCheckTienda(isStorePickup);

    if (isStorePickup) {
      setDireccionPegada('');
      setNumInt('');
    } else {
      let cleanAddress = p.dir;
      if (cleanAddress.toUpperCase().includes('(INT.')) {
        const match = cleanAddress.match(/\(INT\.\s?(.*?)\)/i);
        if (match) {
          setNumInt(match[1]);
          cleanAddress = cleanAddress.replace(/\(INT\.\s?.*?\)\s?/i, '').trim();
        }
      }
      setDireccionPegada(cleanAddress);
    }
    setModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError('');

    if (!ticketNum.trim()) {
      const err = 'ID de Ticket es obligatorio';
      setMsgError(err);
      Swal.fire({
        icon: 'error',
        title: 'Falta ID de Ticket',
        text: err,
        background: '#0d1b2a',
        color: '#fff',
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!checkTienda && !direccionPegada.trim()) {
      const err = 'Debe ingresar una dirección o activar "Recoger en tienda"';
      setMsgError(err);
      Swal.fire({
        icon: 'error',
        title: 'Dirección Requerida',
        text: err,
        background: '#0d1b2a',
        color: '#fff',
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    if (!checkTienda && clienteTel.length !== 10) {
      const err = 'El teléfono celular del cliente debe tener 10 dígitos';
      setMsgError(err);
      Swal.fire({
        icon: 'error',
        title: 'Teléfono Inválido',
        text: err,
        background: '#0d1b2a',
        color: '#fff',
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: 'Entendido'
      });
      return;
    }

    const ticketCompleto = `${activeSiglas}${ticketNum.trim().toUpperCase()}`;

    if (!esEdicion && verificarTicketExistente(tiendaSelec, ticketCompleto)) {
      const err = 'Este ID de Ticket ya existe para esta tienda.';
      setMsgError(err);
      Swal.fire({
        icon: 'error',
        title: '¡Ticket Duplicado!',
        text: `El ticket ${ticketCompleto} ya está registrado en esta tienda. Por favor verifique el ID del ticket.`,
        background: '#0d1b2a',
        color: '#fff',
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: 'Corregir ID'
      });
      return;
    }

    const payload = {
      idTicket: ticketCompleto,
      esEdicion,
      tienda: tiendaSelec,
      cliente: clienteNombre,
      tel: clienteTel,
      tipo: tipoCarga,
      entregaEnTienda: checkTienda,
      direccionPegada,
      numInt,
      ref: referencias,
      obs: obsTienda,
      captura: captura
    };

    const res = guardarPedidoTienda(payload);
    if (res.success) {
      setModalOpen(false);
    } else {
      const err = res.error || 'Ocurrió un error inesperado';
      setMsgError(err);
      Swal.fire({
        icon: 'error',
        title: 'Error de Guardado',
        text: err,
        background: '#0d1b2a',
        color: '#fff',
        confirmButtonColor: '#0ea5e9',
        confirmButtonText: 'Entendido'
      });
    }
  };

  const handleVerCrono = (ticket: string) => {
    const res = obtenerProyeccionRutaPorTienda(ticket, tiendaSelec);
    if (res.ok) {
      setCronoData(res);
      setCronoOpen(true);
    } else {
      alert(res.msg || 'Información de ruta no disponible');
    }
  };

  const toggleZoom = (e: React.MouseEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const rect = img.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setZoomPos({ x, y });
    setIsZoomed(!isZoomed);
  };

  return (
    <div className="space-y-6">
      {/* Upper Control Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
        <div className="space-y-1">
          <label className="text-xs uppercase tracking-wider text-teal-400 font-bold">Sucursal Activa</label>
          {lockedStore ? (
            <div className="bg-teal-950/40 text-teal-400 border border-teal-900/60 px-3 py-2 rounded-lg font-bold text-xs select-none">
              🏢 {lockedStore}
            </div>
          ) : (
            <select 
              value={tiendaSelec}
              onChange={(e) => setInternalTiendaSelec(e.target.value)}
              className="block w-full bg-slate-800 border border-slate-700 text-slate-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
            >
              {tiendas.map(t => (
                <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
              ))}
            </select>
          )}
        </div>

        <button 
          onClick={handleOpenNuevo}
          className="flex items-center gap-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition shadow-lg shadow-teal-900/20 w-full md:w-auto justify-center"
        >
          <Plus size={16} />
          REGISTRAR PEDIDO
        </button>
      </div>

      {/* Search Input Filter */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <input 
          type="text" 
          placeholder="Buscar por ticket, cliente, dirección de entrega..."
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        {displayPedidos.length > 0 && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs bg-slate-800 text-slate-400 font-semibold px-2 py-1 rounded">
            {displayPedidos.length} Pedido{displayPedidos.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Orders Grid cards */}
      {displayPedidos.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-dashed border-slate-800 rounded-2xl">
          <p className="text-slate-400 text-sm">No se encontraron pedidos de esta tienda cargados en la base de datos.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayPedidos.map((p) => {
            const isParcial = p.tipo.toUpperCase().includes('PARCIAL');
            const hasFoto = p.fotoUrl && p.fotoUrl.trim() !== '';

            return (
              <div key={p.ticket} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700 transition shadow-inner">
                <div className="space-y-4">
                  {/* Header metadata */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <span className="font-mono text-xs font-bold text-slate-400 bg-slate-800/40 px-2 py-1 rounded">
                        #{p.ticket}
                      </span>
                      <p className="text-slate-400 text-xs mt-1">F. Creación: {formatedDisplayDateTime(p.fecha)}</p>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 rounded-full ${
                      p.estatus === 'CARGADO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900' :
                      p.estatus === 'PROGRAMADO' ? 'bg-amber-950 text-amber-400 border border-amber-900' :
                      p.estatus === 'EN RUTA' ? 'bg-teal-950 text-teal-400 border border-teal-900' :
                      p.estatus === 'FINALIZADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                      'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}>
                      {p.estatus}
                    </span>
                  </div>

                  {/* Customer Body Info */}
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-100 text-base">{p.cliente}</h3>
                    {p.tel && (
                      <p className="text-xs text-slate-400 flex items-center gap-1">
                        <Phone size={12} className="text-slate-500" />
                        {p.tel}
                      </p>
                    )}
                  </div>

                  {/* Delivery Location block */}
                  <div className="text-xs text-slate-300 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800/60 divide-y divide-slate-800">
                    <div className="flex gap-1.5 pb-2">
                      <MapPin size={14} className="text-red-400 shrink-0 mt-0.5" />
                      <div>
                        {p.dir}
                        {p.ref && <p className="text-[11px] text-teal-400 mt-1">Ref: {p.ref}</p>}
                      </div>
                    </div>

                    {p.obs && (
                      <div className="flex gap-1.5 pt-2 text-slate-400 text-[11px]">
                        <MessageSquare size={13} className="text-amber-500 shrink-0 mt-0.5" />
                        <span className="whitespace-pre-wrap break-words">Obs: {p.obs}</span>
                      </div>
                    )}
                  </div>

                  {/* Load characteristics / type */}
                  <div className="flex items-center justify-between text-xs py-2 border-t border-slate-800/80">
                    <span className="text-slate-400 font-semibold flex items-center gap-1">
                      <FileText size={13} className="text-teal-400" />
                      {p.tipo}
                    </span>

                    {/* Camera view icon for delivery proof */}
                    {isParcial && (
                      <div className="flex items-center gap-1.5">
                        {hasFoto ? (
                          <button 
                            onClick={() => {
                              Swal.fire({
                                title: `Foto del Ticket: #${p.ticket}`,
                                imageUrl: p.fotoUrl,
                                imageAlt: `Foto Ticket #${p.ticket}`,
                                background: '#0d1b2a',
                                color: '#fff',
                                confirmButtonColor: '#0ea5e9',
                                confirmButtonText: 'Cerrar'
                              });
                            }}
                            className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-1 rounded inline-flex items-center gap-1 text-[11px] font-bold"
                          >
                            <Eye size={12} />
                            FOTO TICKET
                          </button>
                        ) : (
                          <span className="text-rose-400/80 text-[11px] font-bold bg-rose-950/40 border border-rose-950 px-2 py-1 rounded">
                            SIN FOTO
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Assigned driver and routing dateenv details */}
                  {p.chofer && (
                    <div className="text-[11px] bg-teal-950/20 text-teal-300 p-2 rounded-lg border border-teal-900/30 flex justify-between items-center">
                      <span className="font-semibold flex items-center gap-1">
                        🚚 Chofer: {p.chofer}
                      </span>
                      {p.dateenv && (
                        <span className="bg-teal-950 border border-teal-900 rounded px-1.5 py-0.5">
                          Envío: {formatedDisplayDate(p.dateenv)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800 mt-4">
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => handleOpenEdicion(p)}
                      className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3.5 py-2 rounded-lg font-semibold transition border border-slate-700/60 cursor-pointer"
                    >
                      <Edit2 size={12} />
                      Editar
                    </button>

                    {p.captura && p.captura.trim() !== '' && (
                      <button 
                        onClick={() => {
                          Swal.fire({
                            title: `Captura del Pedido: #${p.ticket}`,
                            imageUrl: p.captura,
                            imageAlt: `Captura #${p.ticket}`,
                            background: '#0d1b2a',
                            color: '#fff',
                            confirmButtonColor: '#0ea5e9',
                            confirmButtonText: 'Cerrar'
                          });
                        }}
                        className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-900 hover:bg-amber-900/40 px-3 py-2 rounded-lg font-semibold transition cursor-pointer"
                      >
                        👁️ Captura
                      </button>
                    )}
                  </div>

                  {(p.estatus === 'PROGRAMADO' || p.estatus === 'EN RUTA' || p.estatus === 'FINALIZADO') && (
                    <button 
                      onClick={() => handleVerCrono(p.ticket)}
                      className="text-xs text-slate-100 bg-teal-600 hover:bg-teal-500 px-3.5 py-2 rounded-lg font-semibold transition cursor-pointer shadow shadow-teal-950"
                    >
                      Seguimiento
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* REGISTER / EDIT MODAL */}
      {modalOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setModalOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl my-8 cursor-default">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-lg font-display">
                {esEdicion ? 'EDITAR REGISTRO DE PEDIDO' : 'NUEVO REGISTRO DE PEDIDO'}
              </h2>
              <button 
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              {msgError && (
                <div className="bg-rose-950/40 text-rose-400 border border-rose-900/60 p-3 rounded-lg text-xs font-semibold">
                  {msgError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ID Ticket</label>
                  <div className="flex">
                    <span className="bg-slate-800 text-slate-300 px-3 py-2 border border-slate-700 rounded-l-lg text-sm font-bold flex items-center">
                      {activeSiglas}
                    </span>
                    <input 
                      type="text" 
                      placeholder="Ej: 1166"
                      value={ticketNum}
                      onChange={(e) => setTicketNum(e.target.value)}
                      disabled={esEdicion}
                      required
                      className="w-full bg-slate-900 border-y border-r border-slate-700 rounded-r-lg text-sm text-slate-100 p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase disabled:bg-slate-800 disabled:text-slate-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Tipo Carga</label>
                  <select 
                    value={tipoCarga}
                    onChange={(e) => setTipoCarga(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500 font-semibold"
                  >
                    <option>Todo el Ticket</option>
                    <option>Entrega Parcial</option>
                  </select>
                </div>
              </div>

              {/* Autocomplete-supportive client selector */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Nombre del Cliente</label>
                <input 
                  type="text" 
                  placeholder="Escribe para buscar o registrar"
                  value={clienteNombre}
                  onChange={(e) => handleClienteChange(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
                
                {sugList.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto z-10">
                    {sugList.map((item, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectSurg(item)}
                        className="p-3 hover:bg-slate-700/60 cursor-pointer divide-y divide-slate-700 text-xs transition first:rounded-t-lg last:rounded-b-lg border-b border-slate-700"
                      >
                        <p className="font-bold text-slate-100">{item.cliente}</p>
                        <p className="text-slate-400 text-[10px] mt-0.5 truncate">{item.dir}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wide">Recoger en Tienda</h4>
                  <p className="text-[11px] text-slate-400">Usará la dirección de {tiendaSelec} para la entrega.</p>
                </div>
                <input 
                  type="checkbox" 
                  id="checkTienda"
                  checked={checkTienda}
                  onChange={(e) => setCheckTienda(e.target.checked)}
                  className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                />
              </div>

              {/* Direccion conditional display */}
              {!checkTienda && (
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-800">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Dirección de Entrega</label>
                      <a 
                        href="https://www.google.com/maps" 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[11px] font-bold text-teal-400 hover:underline flex items-center gap-0.5"
                      >
                        📍 Abrir Google Maps
                      </a>
                    </div>
                    <textarea 
                      placeholder="Pega la dirección de Google Maps aquí..."
                      value={direccionPegada}
                      onChange={(e) => setDireccionPegada(e.target.value)}
                      required={!checkTienda}
                      rows={2}
                      className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">No. Interior / Bodega</label>
                      <input 
                        type="text" 
                        placeholder="Opcional. Ej: Bodega 4"
                        value={numInt}
                        onChange={(e) => setNumInt(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Teléfono Celular (10 dígitos)</label>
                      <input 
                        type="tel" 
                        placeholder="Ej: 5512345678"
                        maxLength={10}
                        value={clienteTel}
                        onChange={(e) => setClienteTel(e.target.value.replace(/\D/g, ''))}
                        required={!checkTienda}
                        className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Referencias de Ubicación</label>
                    <input 
                      type="text" 
                      placeholder="Portón azul, junto al vivero, etc..."
                      value={referencias}
                      onChange={(e) => setReferencias(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 font-sans">Observaciones o Notas de Carga</label>
                <textarea 
                  placeholder="Detalles sobre materiales, horarios de entrega..."
                  value={obsTienda}
                  onChange={(e) => setObsTienda(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex justify-between">
                  Adjuntar Captura de Pantalla
                  {capturaLoading && <span className="text-[10px] text-teal-400 font-bold">Procesando...</span>}
                </label>
                
                <div className="bg-slate-950 border border-slate-850 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {captura ? (
                      <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 leading-normal truncate">
                        ✔ CAPTURA LISTA ({Math.round(captura.length / 1024)} KB)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] leading-normal block">
                        Screenshot opcional del pago, pedido o ticket
                      </span>
                    )}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => document.getElementById('tiendaScreenshotUpload')?.click()}
                    className="bg-teal-950/40 hover:bg-teal-900/40 border border-teal-900/50 hover:border-teal-800 text-teal-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer tracking-wide uppercase transition inline-flex items-center gap-1 shadow"
                  >
                    <Upload size={13} />
                    {captura ? 'Cambiar' : 'Subir'}
                  </button>
                  
                  <input 
                    type="file" 
                    id="tiendaScreenshotUpload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCapturaLoading(true);
                        try {
                          const base64 = await compressBase64Image(file);
                          setCaptura(base64);
                        } catch (err) {
                          console.error(err);
                          Swal.fire({
                            icon: 'error',
                            title: 'Error de Compresión',
                            text: 'No se pudo procesar la imagen elegida.',
                            background: '#0d1b2a',
                            color: '#fff'
                          });
                        } finally {
                          setCapturaLoading(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-sm transition shadow-lg shadow-teal-900/10 cursor-pointer"
                >
                  {esEdicion ? 'ACTUALIZAR CAMBIOS' : 'GUARDAR PEDIDO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRACKING TIMELINE CROCOGRAPH COMPONENT */}
      {cronoOpen && cronoData && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setCronoOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl p-5 my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="font-bold text-slate-100 font-display text-base">Cronograma de Entrega</h3>
              <button onClick={() => setCronoOpen(false)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto flex-grow space-y-4">
              <div className="bg-teal-950/40 border border-teal-900 text-teal-300 p-3 rounded-lg text-xs text-center space-y-1 mb-5">
                <p className="font-bold">🚚 Chofer en Ruta: {cronoData.chofer}</p>
                <p className="opacity-90 text-slate-300">
                  <span className="font-semibold text-slate-100">Salida de Bodega:</span>{' '}
                  <span className={cronoData.inicio?.includes('Pendiente') ? 'text-teal-400 italic font-medium' : 'text-emerald-400 font-bold'}>
                    {cronoData.inicio}
                  </span>
                </p>
                <p className="text-[10px] opacity-70">Fecha programada: {cronoData.fechaConsultada}</p>
              </div>

              <div className="relative border-l border-slate-800 pl-5 ml-2.5 space-y-6">
              {cronoData.ruta.map((p: any, i: number) => (
                <div key={i} className="relative">
                  {/* Point icon indicator */}
                  <span className={`absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-4 ${
                    p.esDeTienda ? 'bg-amber-400 border-amber-900 ring-2 ring-slate-900' : 'bg-slate-700 border-slate-900'
                  }`} />
                  
                  <div className={`p-3 rounded-xl border ${
                    p.esDeTienda 
                      ? 'bg-amber-950/30 border-amber-800/40 text-slate-100' 
                      : 'bg-slate-900/40 border-slate-800/60 text-slate-400 text-xs'
                  }`}>
                    <div className="flex justify-between items-start gap-1">
                      <p className="text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                        {p.tipo} #{p.id}
                      </p>
                      {p.esDeTienda && (
                        <span className="text-[9px] bg-amber-500 text-amber-950 font-black px-1.5 py-0.5 rounded uppercase">
                          TU PEDIDO
                        </span>
                      )}
                    </div>
                    <p className={`font-bold mt-1 text-sm ${p.esDeTienda ? 'text-slate-100' : 'text-slate-400'}`}>
                      {p.destino}
                    </p>
                    <p className="text-[11px] opacity-80 mt-0.5 truncate">{p.direccion}</p>
                    
                    <p className={`text-[11px] font-bold mt-2 flex items-center gap-1 ${
                      p.ventana.includes('FINALIZADO') ? 'text-emerald-400' :
                      p.ventana.includes('ESTIMADO') ? 'text-teal-400' :
                      p.esDeTienda ? 'text-amber-400' : 'text-slate-400'
                    }`}>
                      🕒 {p.ventana}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 mt-5 shrink-0">
              <button 
                onClick={() => setCronoOpen(false)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold py-2.5 rounded-lg text-xs cursor-pointer transition"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZOOMABLE MODAL IMAGE PREVIEW */}
      {zoomFotoUrl && (
        <div 
          onClick={() => { setZoomFotoUrl(null); setIsZoomed(false); }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/95 p-4 cursor-pointer"
        >
          <div className="relative max-w-full max-h-[80vh] overflow-hidden rounded-xl">
            <img 
              src={zoomFotoUrl} 
              alt="Foto boleto de entrega"
              onClick={(e) => { e.stopPropagation(); toggleZoom(e); }}
              style={{
                transform: isZoomed ? 'scale(2.5)' : 'scale(1)',
                transformOrigin: isZoomed ? `${zoomPos.x}% ${zoomPos.y}%` : 'center',
                transition: 'transform 0.25s ease'
              }}
              className={`max-w-full max-h-[80vh] select-none ${isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
            />
          </div>
          <p className="text-slate-400 text-xs mt-3 select-none">
            {isZoomed ? 'Toca la foto para quitar zoom' : 'Toca la foto para ampliar en ese punto'} · Toca fuera para cerrar
          </p>
        </div>
      )}
    </div>
  );
};
