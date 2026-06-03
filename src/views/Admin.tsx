/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLogistika, formatedDisplayDate, formatedDisplayDateTime, getMexicoCityDateStr } from '../context/LogistikaContext';
import { Pedido, Recoleccion } from '../types';
import { Shield, Search, Trash2, Edit2, Archive, AlertTriangle, X, CheckSquare, Plus, Activity, RotateCcw, MapPin, Calendar, Database, FileJson, Save, FileUp, FileDown, Eye, Camera, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

export const Admin: React.FC = () => {
  const {
    pedidos,
    recolecciones,
    choferes,
    proveedores,
    tiendas,
    historialEntregas,
    historialRecolecciones,
    modificarPedidoAdmin,
    modificarRecoleccionAdmin,
    eliminarPedidoAdmin,
    eliminarRecoleccionAdmin,
    archivarFinalizados,
    reemplazarTablaDirecta
  } = useLogistika();

  const [activeTab, setActiveTab] = useState<'PEDIDOS' | 'RECOLECCIONES' | 'HISTORIAL' | 'BASE_DATOS'>('PEDIDOS');
  const [buscarPed, setBuscarPed] = useState('');
  const [buscarRec, setBuscarRec] = useState('');
  const [buscarHist, setBuscarHist] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState<string | null>(null);

  // States for database raw console
  const [selectedCatalog, setSelectedCatalog] = useState<string>('DB_PEDIDOS');
  const [rawJsonText, setRawJsonText] = useState('');
  const [dbError, setDbError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper dictionary for database catalogs
  const getCatalogData = (cat: string) => {
    switch (cat) {
      case 'DB_PEDIDOS': return pedidos;
      case 'DB_RECOLECCIONES': return recolecciones;
      case 'DB_CHOFERES': return choferes;
      case 'DB_PROVEEDORES': return proveedores;
      case 'DB_TIENDAS': return tiendas;
      case 'DB_HIST_ENTREGAS': return historialEntregas;
      case 'DB_HIST_RECOLECCIONES': return historialRecolecciones;
      default: return [];
    }
  };

  // Keep rawJsonText synced with database updates when catalog selection changes or the context data changes
  useEffect(() => {
    setRawJsonText(JSON.stringify(getCatalogData(selectedCatalog), null, 2));
    setDbError(null);
  }, [selectedCatalog, pedidos, recolecciones, choferes, proveedores, tiendas, historialEntregas, historialRecolecciones]);

  // Edit Pedido Modal
  const [pedModalOpen, setPedModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [cliNombre, setCliNombre] = useState('');
  const [cliTel, setCliTel] = useState('');
  const [pTipoCarga, setPTipoCarga] = useState('Todo el Ticket');
  const [pCheckTienda, setPCheckTienda] = useState(false);
  const [pDireccion, setPDireccion] = useState('');
  const [pNumInt, setPNumInt] = useState('');
  const [pReferencias, setPReferencias] = useState('');
  const [pObservaciones, setPObservaciones] = useState('');

  // Edit Recoleccion Modal
  const [recModalOpen, setRecModalOpen] = useState(false);
  const [editingRec, setEditingRec] = useState<Recoleccion | null>(null);
  const [rProveedor, setRProveedor] = useState('');
  const [rDireccion, setRDireccion] = useState('');
  const [rReferencias, setRReferencias] = useState('');
  const [rMaterial, setRMaterial] = useState('');
  const [rFechaDisp, setRFechaDisp] = useState('');

  // Count formulas corresponding to obtenerDashboardAdmin
  const cargadoCount = pedidos.filter(p => p.estatus === 'CARGADO').length;
  const enComprasCount = pedidos.filter(p => ["PENDIENTE", "EN PROCESO / COMPRA", "PARCIAL", "ENTREGA INMEDIATA"].includes(p.estatus.toUpperCase())).length;
  const revisadoCount = pedidos.filter(p => p.estatus === 'REVISADO').length;
  const programadoCount = pedidos.filter(p => p.estatus === 'PROGRAMADO').length;
  const enRutaCount = pedidos.filter(p => p.estatus === 'EN RUTA').length;
  const finalizadoCount = pedidos.filter(p => p.estatus === 'FINALIZADO').length;

  const todayStr = getMexicoCityDateStr();
  const activeChoferesCount = new Set(
    pedidos.filter(p => p.chofer && p.dateenv === todayStr).map(p => p.chofer)
  ).size;

  const pendingRecsCount = recolecciones.filter(r => 
    ["SOLICITADO", "PROGRAMADO", "REVISADO", "EN RUTA", "PENDIENTE"].includes(r.estatus.toUpperCase())
  ).length;

  const filterPedidos = filtroEstatus 
    ? (filtroEstatus === 'EN_COMPRAS' 
        ? pedidos.filter(p => ["PENDIENTE", "EN PROCESO / COMPRA", "PARCIAL", "ENTREGA INMEDIATA"].includes(p.estatus.toUpperCase()))
        : pedidos.filter(p => p.estatus.toUpperCase() === filtroEstatus))
    : pedidos;

  const displayPedidos = filterPedidos.filter(p => {
    const q = buscarPed.toLowerCase();
    return p.ticket.toLowerCase().includes(q) ||
           p.tienda.toLowerCase().includes(q) ||
           p.cliente.toLowerCase().includes(q) ||
           p.estatus.toLowerCase().includes(q);
  });

  const displayRecs = recolecciones.filter(r => {
    const q = buscarRec.toLowerCase();
    return r.id.toLowerCase().includes(q) ||
           r.proveedor.toLowerCase().includes(q) ||
           r.material.toLowerCase().includes(q) ||
           r.estatus.toLowerCase().includes(q);
  });

  // Toggle Filters from Stats Header cards
  const handleToggleFiltro = (estStatus: string) => {
    if (filtroEstatus === estStatus) {
      setFiltroEstatus(null);
    } else {
      setFiltroEstatus(estStatus);
      setActiveTab('PEDIDOS'); // force focus switch to visual list
    }
  };

  // Pedidos CRUD Modificators
  const handleOpenEditPedido = (p: Pedido) => {
    setEditingPedido(p);
    setCliNombre(p.cliente);
    setCliTel(p.tel);
    setPTipoCarga(p.tipo);
    setPObservaciones(p.obs);
    setPReferencias(p.ref);

    const isTiendaPickup = p.dir.includes('(ENTREGA EN TIENDA:)');
    setPCheckTienda(isTiendaPickup);

    if (isTiendaPickup) {
      setPDireccion('');
      setPNumInt('');
    } else {
      let cleanDir = p.dir;
      if (cleanDir.toUpperCase().includes('(INT.')) {
        const m = cleanDir.match(/\(INT\.\s?(.*?)\)/i);
        if (m) {
          setPNumInt(m[1]);
          cleanDir = cleanDir.replace(/\(INT\.\s?.*?\)\s?/i, '').trim();
        }
      }
      setPDireccion(cleanDir);
    }
    setPedModalOpen(true);
  };

  const handleSavePedido = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPedido) return;

    if (!pCheckTienda && cliTel.length !== 10) {
      alert('Teléfono celular debe tener 10 dígitos');
      return;
    }

    const res = modificarPedidoAdmin({
      ticket: editingPedido.ticket,
      tienda: editingPedido.tienda,
      cliente: cliNombre,
      tel: cliTel,
      dir: pDireccion,
      numInt: pNumInt,
      ref: pReferencias,
      tipo: pTipoCarga,
      obs: pObservaciones,
      entregaEnTienda: pCheckTienda
    });

    if (res.success) {
      setPedModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: 'Pedido Modificado',
        text: `Ticket #${editingPedido.ticket} corregido con éxito.`,
        timer: 1500,
        showConfirmButton: false,
        background: '#0d1b2a',
        color: '#fff'
      });
    } else {
      alert(res.error || 'Ocurrió un error');
    }
  };

  const handleDeletePedido = (ticket: string) => {
    Swal.fire({
      title: '¿Eliminar Pedido?',
      html: `¿Está seguro de eliminar permanentemente el ticket <strong>${ticket}</strong>?<br>Esta acción alterará el historial.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '🗑️ Sí, eliminar',
      cancelButtonText: 'Cancelar',
      background: '#0d1b2a',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        const res = eliminarPedidoAdmin(ticket);
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Ticket eliminado', timer: 1000, showConfirmButton: false, background: '#0d1b2a', color: '#fff' });
        } else {
          Swal.fire('Error', res.error || 'No se pudo eliminar', 'error');
        }
      }
    });
  };

  // Recolección CRUD modifiers
  const handleOpenEditRec = (r: Recoleccion) => {
    setEditingRec(r);
    setRProveedor(r.proveedor);
    setRDireccion(r.direccion);
    setRReferencias(r.referencias);
    setRMaterial(r.material);
    setRFechaDisp(r.fechaDisponible);
    setRecModalOpen(true);
  };

  const handleSaveRec = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRec) return;

    const res = modificarRecoleccionAdmin({
      id: editingRec.id,
      proveedor: rProveedor,
      direccion: rDireccion,
      referencias: rReferencias,
      material: rMaterial,
      disp: rFechaDisp
    });

    if (res.success) {
      setRecModalOpen(false);
      Swal.fire({ icon: 'success', title: 'Recolección modificada', timer: 1500, showConfirmButton: false, background: '#0d1b2a', color: '#fff' });
    } else {
      alert(res.error || 'No se pudo guardar');
    }
  };

  const handleDeleteRec = (id: string) => {
    Swal.fire({
      title: '¿Eliminar Recolección?',
      html: `Se removerá la orden de recolección <strong>${id}</strong> del sistema.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '🗑️ Sí, remover',
      background: '#0d1b2a',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        const res = eliminarRecoleccionAdmin(id);
        if (res.success) {
          Swal.fire({ icon: 'success', title: 'Eliminado', timer: 1000, showConfirmButton: false, background: '#0d1b2a', color: '#fff' });
        } else {
          Swal.fire('Error', res.error || 'No se pudo borrar', 'error');
        }
      }
    });
  };

  // Trigger archivate (Historial.gs)
  const handleArchivar = () => {
    Swal.fire({
      title: '¿Archivar registros?',
      text: 'Mueve todos los pedidos y recolecciones finalizados hace más de 12 horas del panel activo hacia el historial de almacenamiento.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#198754',
      cancelButtonColor: '#6c757d',
      confirmButtonText: '📦 Archivar ahora',
      background: '#0d1b2a',
      color: '#fff'
    }).then((result) => {
      if (result.isConfirmed) {
        const msg = archivarFinalizados();
        Swal.fire({
          icon: 'success',
          title: 'Historial Sincronizado',
          text: msg,
          background: '#0d1b2a',
          color: '#fff'
        });
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Statistics Dashboard (obtenerDashboardAdmin) */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div 
          onClick={() => handleToggleFiltro('CARGADO')}
          className={`bg-slate-900 border ${filtroEstatus === 'CARGADO' ? 'border-indigo-400 bg-indigo-950/20' : 'border-slate-800'} p-4 rounded-xl cursor-pointer hover:border-slate-700 transition flex items-center justify-between`}
        >
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Cargados</span>
            <span className="text-2xl font-black font-display text-indigo-400 mt-1 block">{cargadoCount}</span>
          </div>
          <Activity size={20} className="text-indigo-400/40" />
        </div>

        <div 
          onClick={() => handleToggleFiltro('EN_COMPRAS')}
          className={`bg-slate-900 border ${filtroEstatus === 'EN_COMPRAS' ? 'border-amber-400 bg-amber-950/20' : 'border-slate-800'} p-4 rounded-xl cursor-pointer hover:border-slate-700 transition flex items-center justify-between`}
        >
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">En Compras</span>
            <span className="text-2xl font-black font-display text-amber-400 mt-1 block">{enComprasCount}</span>
          </div>
          <Activity size={20} className="text-amber-400/40" />
        </div>

        <div 
          onClick={() => handleToggleFiltro('REVISADO')}
          className={`bg-slate-900 border ${filtroEstatus === 'REVISADO' ? 'border-slate-400 bg-slate-850/40' : 'border-slate-800'} p-4 rounded-xl cursor-pointer hover:border-slate-700 transition flex items-center justify-between`}
        >
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Revisados</span>
            <span className="text-2xl font-black font-display text-slate-300 mt-1 block">{revisadoCount}</span>
          </div>
          <Activity size={20} className="text-slate-400/40" />
        </div>

        <div 
          onClick={() => handleToggleFiltro('PROGRAMADO')}
          className={`bg-slate-900 border ${filtroEstatus === 'PROGRAMADO' ? 'border-orange-400 bg-orange-950/20' : 'border-slate-800'} p-4 rounded-xl cursor-pointer hover:border-slate-700 transition flex items-center justify-between`}
        >
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Programados</span>
            <span className="text-2xl font-black font-display text-orange-400 mt-1 block">{programadoCount}</span>
          </div>
          <Activity size={20} className="text-orange-400/40" />
        </div>

        <div 
          onClick={() => handleToggleFiltro('EN RUTA')}
          className={`bg-slate-900 border ${filtroEstatus === 'EN RUTA' ? 'border-teal-400 bg-teal-950/20' : 'border-slate-800'} p-4 rounded-xl cursor-pointer hover:border-slate-700 transition flex items-center justify-between`}
        >
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">En Ruta</span>
            <span className="text-2xl font-black font-display text-teal-400 mt-1 block">{enRutaCount}</span>
          </div>
          <Activity size={20} className="text-teal-400/40" />
        </div>

        <div 
          onClick={() => handleToggleFiltro('FINALIZADO')}
          className={`bg-slate-900 border ${filtroEstatus === 'FINALIZADO' ? 'border-emerald-400 bg-emerald-950/20' : 'border-slate-800'} p-4 rounded-xl cursor-pointer hover:border-slate-700 transition flex items-center justify-between`}
        >
          <div>
            <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Finalizados</span>
            <span className="text-2xl font-black font-display text-emerald-400 mt-1 block">{finalizadoCount}</span>
          </div>
          <Activity size={20} className="text-emerald-400/40" />
        </div>
      </div>

      {/* Sub general active indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-900/20 p-4 rounded-xl border border-slate-800">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🚚</span>
          <div>
            <h4 className="font-bold text-slate-100 text-sm">{activeChoferesCount} Choferes activos hoy</h4>
            <p className="text-slate-400 text-xs">Con rutas y cronogramas asignados para la fecha actual.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
          <span className="text-3xl">🏢</span>
          <div className="flex-1 flex justify-between items-center">
            <div>
              <h4 className="font-bold text-slate-100 text-sm">{pendingRecsCount} Recolecciones Pendientes</h4>
              <p className="text-slate-400 text-xs">De proveedores en espera de recolección física.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Admin general tab controller */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80 w-full sm:w-auto">
          <button 
            onClick={() => { setActiveTab('PEDIDOS'); setFiltroEstatus(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto ${
              activeTab === 'PEDIDOS' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Pedidos
          </button>
          <button 
            onClick={() => { setActiveTab('RECOLECCIONES'); setFiltroEstatus(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto ${
              activeTab === 'RECOLECCIONES' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Recolecciones
          </button>
          <button 
            onClick={() => setActiveTab('HISTORIAL')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto ${
              activeTab === 'HISTORIAL' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Historial de Archivados
          </button>
          <button 
            onClick={() => { setActiveTab('BASE_DATOS'); setFiltroEstatus(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 ${
              activeTab === 'BASE_DATOS' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Database size={13} />
            Editor Base de Datos
          </button>
        </div>

        {/* Archivate trigger */}
        <button 
          onClick={handleArchivar}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs uppercase tracking-wider transition inline-flex items-center gap-1.5 shrink-0 w-full sm:w-auto justify-center cursor-pointer shadow-md shadow-emerald-950/25"
        >
          <Archive size={14} />
          Archivar Finalizados (Sheets Sync)
        </button>
      </div>

      {filtroEstatus && (
        <div className="flex items-center justify-between text-xs bg-teal-950/20 text-teal-400 p-2 rounded border border-teal-900/30">
          <span className="font-bold">✨ FILTRO ACTIVO EN PEDIDOS: {filtroEstatus.replace('_', ' ')}</span>
          <button onClick={() => setFiltroEstatus(null)} className="hover:text-white font-black underline shrink-0">
            Limpiar Filtro
          </button>
        </div>
      )}

      {/* DYNAMIC LISTS VIEW RECT HANDLERS */}
      {activeTab === 'PEDIDOS' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input 
              type="text" 
              placeholder="Buscar por ticket, tienda, cliente..."
              value={buscarPed}
              onChange={(e) => setBuscarPed(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayPedidos.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                No hay pedidos cargados que coincidan con los filtros administrados.
              </div>
            ) : (
              displayPedidos.map((p) => (
                <div key={p.ticket} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition shadow">
                  <div className="space-y-3">
                    <div className="flex justify-between items-center gap-1">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded">
                          {p.ticket}
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1">F. Creación: {formatedDisplayDateTime(p.fecha)}</p>
                      </div>
                      {badgePedido(p.estatus)}
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] font-bold text-slate-400 border-b border-slate-800 pb-1 mt-2.5">
                        <span className="text-teal-400 uppercase">{p.tienda}</span>
                        <span>{p.tipo}</span>
                      </div>
                      <h4 className="font-bold text-slate-100 text-base mt-2">{p.cliente}</h4>
                      {p.tel && <p className="text-xs text-slate-400">📲 Tel: {p.tel}</p>}
                      <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                        <MapPin size={11} className="text-rose-455 shrink-0 mt-0.5" />
                        <span>{p.dir}</span>
                      </p>
                      {p.ref && <p className="text-[11px] text-teal-400 mt-1 ml-4">Ref: {p.ref}</p>}
                    </div>

                    {p.obs && (
                      <p className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border-l border-amber-500 font-medium">
                        Obs: {p.obs}
                      </p>
                    )}

                    <div className="pills-row">
                      {p.chofer && (
                        <span className="pill orange text-[10px]"><Plus size={10} /> {p.chofer}</span>
                      )}
                      {p.dateenv && (
                        <span className="pill orange text-[10px]"><Calendar size={10} /> {formatedDisplayDate(p.dateenv)}</span>
                      )}
                      {p.orden && (
                        <span className="pill orange text-[10px] font-bold"><Plus size={10} /> Parada #{p.orden}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-800/85 mt-4">
                    <button 
                      onClick={() => handleOpenEditPedido(p)}
                      className="text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-750 px-3.5 py-2 rounded-lg cursor-pointer transition border border-slate-700/60 flex items-center gap-1.5"
                    >
                      <Edit2 size={12} />
                      Modificar
                    </button>
                    <div className="flex gap-1 items-center">
                      {p.fotoUrl && (
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
                          title="Ver Foto Ticket (Tienda)"
                          className="p-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-900/60 text-amber-500 rounded-lg transition cursor-pointer"
                        >
                          <FileText size={14} />
                        </button>
                      )}
                      
                      {p.fotos && p.fotos.length > 0 && (
                        <button 
                          onClick={() => {
                            const pics = p.fotos || [];
                            Swal.fire({
                              title: `Evidencias de la Entrega: #${p.ticket}`,
                              html: `
                                <div class="space-y-3">
                                  <p class="text-xs text-slate-400">El chofer capturó <strong>${pics.length}</strong> fotografías como evidencia de entrega.</p>
                                  <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-1">
                                    ${pics.map((f, i) => `
                                      <div class="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950 aspect-[4/3] group">
                                        <img src="${f}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-200" onclick="window.customShowFullPhoto('${f}')" />
                                        <span class="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] px-1.5 py-0.5 rounded text-slate-300 font-mono">#${i + 1}</span>
                                      </div>
                                    `).join('')}
                                  </div>
                                </div>
                              `,
                              background: '#0d1b2a',
                              color: '#fff',
                              confirmButtonColor: '#0ea5e9',
                              confirmButtonText: 'Cerrar',
                              didOpen: () => {
                                (window as any).customShowFullPhoto = (src: string) => {
                                  Swal.fire({
                                    title: 'Evidencia Ampliada',
                                    imageUrl: src,
                                    imageAlt: 'Evidencia de Entrega',
                                    background: '#0d1b2a',
                                    color: '#fff',
                                    confirmButtonColor: '#0ea5e9',
                                    confirmButtonText: 'Atrás'
                                  });
                                };
                              }
                            });
                          }}
                          title="Ver Evidencias de Entrega (Chofer)"
                          className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 rounded-lg transition cursor-pointer"
                        >
                          <Camera size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeletePedido(p.ticket)}
                        className="text-rose-400 hover:text-white bg-rose-950/20 hover:bg-rose-900 border border-slate-800 hover:border-rose-900 p-2 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'RECOLECCIONES' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input 
              type="text" 
              placeholder="Buscar por ID, proveedor, material..."
              value={buscarRec}
              onChange={(e) => setBuscarRec(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayRecs.length === 0 ? (
              <div className="col-span-full py-16 text-center text-slate-400 text-sm bg-slate-900/10 border border-dashed border-slate-850 rounded-xl">
                No hay recolecciones creadas en este momento.
              </div>
            ) : (
              displayRecs.map((r) => (
                <div key={r.id} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition shadow">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center gap-1">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-500">
                          {r.id}
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1">F. Creación: {formatedDisplayDateTime(r.fechaAlta)}</p>
                      </div>
                      {badgeRec(r.estatus)}
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{r.proveedor}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-start gap-1 text-slate-400">
                        <MapPin size={11} className="text-rose-455 shrink-0 mt-0.5" />
                        <span>{r.direccion}</span>
                      </p>
                      {r.referencias && <p className="text-[11px] text-teal-400 ml-4 mt-1.5">Ref: {r.referencias}</p>}
                    </div>

                    <div className="bg-slate-900/60 p-2.5 border border-slate-800/40 text-xs text-slate-300 rounded font-medium">
                      <span className="block text-[10px] text-slate-500 uppercase font-black tracking-wide">Material:</span>
                      {r.material}
                    </div>

                    <div className="flex justify-between items-center text-[10px] bg-slate-950/20 text-slate-500 border border-slate-800/40 p-2 rounded">
                      <span className="font-bold">Módulo solicitación: {r.solicitante}</span>
                      <span className="bg-slate-850 px-1.5 py-0.5 rounded text-slate-300 font-mono">F. Alta: {r.fechaAlta?.split(' ')[0]}</span>
                    </div>

                    <div className="pills-row">
                      {r.chofer && (
                        <span className="pill orange text-[10px]"><Plus size={10} /> {r.chofer}</span>
                      )}
                      {r.fechaReal && (
                        <span className="pill orange text-[10px]"><Calendar size={10} /> F. Real: {formatedDisplayDate(r.fechaReal)}</span>
                      )}
                      {r.orden && (
                        <span className="pill orange text-[10px] font-bold"><Plus size={10} /> Parada #{r.orden}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-800/85 mt-4">
                    <button 
                      onClick={() => handleOpenEditRec(r)}
                      className="text-xs font-bold text-slate-200 bg-slate-800 hover:bg-slate-755 px-3.5 py-2 rounded-lg cursor-pointer transition border border-slate-700/60 flex items-center gap-1.5"
                    >
                      <Edit2 size={12} />
                      Modificar
                    </button>
                    <div className="flex gap-1 items-center">
                      {r.fotoUrl && (
                        <button 
                          onClick={() => {
                            Swal.fire({
                              title: `Foto del Ticket: ${r.id}`,
                              imageUrl: r.fotoUrl,
                              imageAlt: `Foto Ticket ${r.id}`,
                              background: '#0d1b2a',
                              color: '#fff',
                              confirmButtonColor: '#0ea5e9',
                              confirmButtonText: 'Cerrar'
                            });
                          }}
                          title="Ver Foto Ticket (Tienda)"
                          className="p-2 bg-amber-950/60 hover:bg-amber-900 border border-amber-900/60 text-amber-500 rounded-lg transition cursor-pointer"
                        >
                          <FileText size={14} />
                        </button>
                      )}
                      
                      {r.fotos && r.fotos.length > 0 && (
                        <button 
                          onClick={() => {
                            const pics = r.fotos || [];
                            Swal.fire({
                              title: `Evidencias de Recolección: ${r.id}`,
                              html: `
                                <div class="space-y-3">
                                  <p class="text-xs text-slate-400">El chofer capturó <strong>${pics.length}</strong> fotografías de evidencia para la recolección.</p>
                                  <div class="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto p-1">
                                    ${pics.map((f, i) => `
                                      <div class="relative border border-slate-800 rounded-lg overflow-hidden bg-slate-950 aspect-[4/3] group">
                                        <img src="${f}" class="w-full h-full object-cover cursor-pointer hover:scale-105 transition duration-200" onclick="window.customShowFullPhoto('${f}')" />
                                        <span class="absolute bottom-1 left-1 bg-slate-950/80 text-[9px] px-1.5 py-0.5 rounded text-slate-300 font-mono">#${i + 1}</span>
                                      </div>
                                    `).join('')}
                                  </div>
                                </div>
                              `,
                              background: '#0d1b2a',
                              color: '#fff',
                              confirmButtonColor: '#0ea5e9',
                              confirmButtonText: 'Cerrar',
                              didOpen: () => {
                                (window as any).customShowFullPhoto = (src: string) => {
                                  Swal.fire({
                                    title: 'Evidencia Ampliada',
                                    imageUrl: src,
                                    imageAlt: 'Evidencia de Recolección',
                                    background: '#0d1b2a',
                                    color: '#fff',
                                    confirmButtonColor: '#0ea5e9',
                                    confirmButtonText: 'Atrás'
                                  });
                                };
                              }
                            });
                          }}
                          title="Ver Evidencias de Recolección (Chofer)"
                          className="p-2 bg-emerald-950 hover:bg-emerald-900 border border-emerald-900/60 text-emerald-400 rounded-lg transition cursor-pointer"
                        >
                          <Camera size={14} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDeleteRec(r.id)}
                        className="text-rose-455 hover:text-white bg-rose-950/20 hover:bg-rose-900 border border-slate-800 hover:border-rose-900 p-2 rounded-lg transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'HISTORIAL' && (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input 
              type="text" 
              placeholder="Buscar por ticket, cliente, proveedor en historial..."
              value={buscarHist}
              onChange={(e) => setBuscarHist(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-indigo-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none"
            />
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl overflow-hidden shadow duration-300">
            <div className="p-4 bg-slate-950 border-b border-slate-800 font-extrabold uppercase text-[10px] text-teal-400 font-display tracking-widest">
              Registros Almacenados en Historial
            </div>

            <div className="divide-y divide-slate-800">
              {historialEntregas.length === 0 && historialRecolecciones.length === 0 ? (
                <p className="text-xs p-6 text-slate-500 text-center">No hay registros archivados en las hojas de historial de almacenamiento.</p>
              ) : (
                <>
                  {historialEntregas.filter(h => h.ticket.toLowerCase().includes(buscarHist.toLowerCase()) || h.cliente.toLowerCase().includes(buscarHist.toLowerCase())).map(h => (
                    <div key={h.ticket} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">📦 ENTREGA #{h.ticket}</span>
                          <span className="bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded text-[9px] uppercase font-bold">{h.tienda}</span>
                        </div>
                        <p className="font-semibold text-slate-300 mt-1">Cliente: {h.cliente}</p>
                        <p className="text-slate-400 opacity-90 text-[10px] truncate max-w-sm">Dir: {h.dir}</p>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-mono space-y-1">
                        <p className="bg-slate-850 px-2 py-1 rounded inline-block text-slate-300 border border-slate-800">Archivado: {h.fechaArchivado}</p>
                        <p className="block">Chofer finalizador: {h.chofer} · Receptor: {h.receptor || '—'}</p>
                      </div>
                    </div>
                  ))}

                  {historialRecolecciones.filter(h => h.id.toLowerCase().includes(buscarHist.toLowerCase()) || h.proveedor.toLowerCase().includes(buscarHist.toLowerCase())).map(h => (
                    <div key={h.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-500">🏭 RECOLECCION #{h.id}</span>
                          <span className="bg-teal-950 text-teal-400 border border-teal-900 px-2.5 py-0.5 rounded text-[9px] uppercase font-bold">{h.solicitante}</span>
                        </div>
                        <p className="font-semibold text-slate-300 mt-1">Proveedor: {h.proveedor}</p>
                        <p className="text-slate-400 opacity-90 text-[10px] truncate max-w-sm">Dir: {h.direccion}</p>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-mono space-y-1">
                        <p className="bg-slate-850 px-2 py-1 rounded inline-block text-slate-300 border border-slate-800">Archivado: {h.fechaArchivado}</p>
                        <p className="block">Chofer finalizador: {h.chofer}</p>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'BASE_DATOS' && (
        <div className="space-y-6">
          <div className="bg-indigo-950/20 border border-indigo-900/60 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-fade-in">
            <div className="space-y-1">
              <h4 className="text-teal-400 font-extrabold text-sm uppercase tracking-wider flex items-center gap-1.5 font-display">
                <Database size={16} className="text-teal-400" /> Consola de Acceso Directo de Datos (Simulator BD/Sheets)
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed max-w-3xl font-medium">
                Esta consola le da control absoluto sobre la base de datos empresarial de Logistika (persistida localmente en el dispositivo emulando las hojas de cálculo de Google Sheets conectadas por backend). Puede editar elementos directamente, importar copias de seguridad de auditoría o exportar datos en formato JSON para mantenimiento.
              </p>
            </div>
            
            <div className="flex flex-wrap gap-2 shrink-0">
              <button
                onClick={() => {
                  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
                    pedidos,
                    recolecciones,
                    choferes,
                    proveedores,
                    tiendas,
                    historialEntregas,
                    historialRecolecciones
                  }, null, 2));
                  const downloadAnchor = document.createElement('a');
                  downloadAnchor.setAttribute("href", dataStr);
                  downloadAnchor.setAttribute("download", `logistika_complete_backup_${new Date().toISOString().split('T')[0]}.json`);
                  document.body.appendChild(downloadAnchor);
                  downloadAnchor.click();
                  downloadAnchor.remove();
                  Swal.fire({
                    icon: 'success',
                    title: 'Respaldo Generado',
                    text: 'Respaldo general (todas las tablas) descargado correctamente como JSON.',
                    background: '#0d1b2a',
                    color: '#fff',
                    timer: 1500,
                    showConfirmButton: false
                  });
                }}
                className="bg-indigo-650 hover:bg-indigo-600 border border-indigo-500/30 text-white font-bold px-3.5 py-2.5 rounded-xl text-xs uppercase tracking-wider transition inline-flex items-center gap-1.5 cursor-pointer shadow-md shadow-indigo-950/40"
              >
                <FileDown size={14} /> Respaldar BD Completa
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Catalog list selection sidebar */}
            <div className="lg:col-span-1 space-y-2">
              <span className="block text-[10px] uppercase font-bold tracking-widest text-slate-400 mb-2">
                Tablas del Sistema
              </span>
              {[
                { id: 'DB_PEDIDOS', label: '🏪 Pedidos Activos', count: pedidos.length },
                { id: 'DB_RECOLECCIONES', label: '🏭 Recolecciones Activas', count: recolecciones.length },
                { id: 'DB_CHOFERES', label: '👤 Choferes / Operadores', count: choferes.length },
                { id: 'DB_PROVEEDORES', label: '🛒 Catálogo Proveedores', count: proveedores.length },
                { id: 'DB_TIENDAS', label: '🏢 Catálogo Sucursales', count: tiendas.length },
                { id: 'DB_HIST_ENTREGAS', label: '📦 Historial Entregas', count: historialEntregas.length },
                { id: 'DB_HIST_RECOLECCIONES', label: '🚚 Historial Recolecciones', count: historialRecolecciones.length }
              ].map(catalog => {
                const active = selectedCatalog === catalog.id;
                return (
                  <button
                    key={catalog.id}
                    onClick={() => setSelectedCatalog(catalog.id)}
                    className={`w-full flex items-center justify-between text-left px-4 py-3.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                      active
                        ? 'border-teal-500 bg-teal-950/20 text-teal-400 shadow-sm font-black'
                        : 'border-slate-800 bg-slate-900/30 text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                    }`}
                  >
                    <span>{catalog.label}</span>
                    <span className="bg-slate-950 px-2.5 py-0.5 rounded-full font-mono text-[10.5px] text-slate-300">
                      {catalog.count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Direct JSON editor area */}
            <div className="lg:col-span-3 space-y-4">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-5 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div>
                    <h5 className="font-extrabold text-slate-200 text-sm flex items-center gap-2 uppercase tracking-wide">
                      <FileJson size={15} className="text-teal-400 animate-pulse" /> Editor de Texto JSON: {selectedCatalog.replace('DB_', '')}
                    </h5>
                    <p className="text-slate-400 text-[11px] mt-0.5 font-medium">Modifique los atributos crudos de sucursal. El editor verificará constantemente la sintaxis.</p>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* Hidden Backup restore file uploader */}
                    <input 
                      type="file"
                      ref={fileInputRef}
                      className="hidden"
                      accept=".json"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          try {
                            const raw = evt.target?.result as string;
                            const parsed = JSON.parse(raw);
                            
                            // If user imported a complete DB backup instead of a single catalog backup
                            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && (parsed.pedidos || parsed.recolecciones)) {
                              Swal.fire({
                                title: 'Cargar Respaldo Completo',
                                text: 'Detectamos que es un archivo de respaldo COMPLETO multitablas. ¿Desea reestablecer TODAS las tablas del sistema con este archivo?',
                                icon: 'info',
                                showCancelButton: true,
                                confirmButtonText: '🔄 Sí, reestablecer todo',
                                cancelButtonText: 'No, cancelar',
                                background: '#0d1b2a',
                                color: '#fff'
                              }).then((resAlert) => {
                                if (resAlert.isConfirmed) {
                                  if (Array.isArray(parsed.pedidos)) reemplazarTablaDirecta('DB_PEDIDOS', parsed.pedidos);
                                  if (Array.isArray(parsed.recolecciones)) reemplazarTablaDirecta('DB_RECOLECCIONES', parsed.recolecciones);
                                  if (Array.isArray(parsed.choferes)) reemplazarTablaDirecta('DB_CHOFERES', parsed.choferes);
                                  if (Array.isArray(parsed.proveedores)) reemplazarTablaDirecta('DB_PROVEEDORES', parsed.proveedores);
                                  if (Array.isArray(parsed.tiendas)) reemplazarTablaDirecta('DB_TIENDAS', parsed.tiendas);
                                  if (Array.isArray(parsed.historialEntregas)) reemplazarTablaDirecta('DB_HIST_ENTREGAS', parsed.historialEntregas);
                                  if (Array.isArray(parsed.historialRecolecciones)) reemplazarTablaDirecta('DB_HIST_RECOLECCIONES', parsed.historialRecolecciones);
                                  
                                  Swal.fire({ icon: 'success', title: 'Restauración Completa', text: 'Se reestablecieron todas las bases de datos corporativas con éxito.', background: '#0d1b2a', color: '#fff' });
                                }
                              });
                              return;
                            }

                            if (!Array.isArray(parsed)) {
                              Swal.fire('Error', 'Para restaurar un catálogo individual, el archivo JSON debe ser un arreglo [ ... ] válido.', 'error');
                              return;
                            }
                            // Let's replace single catalog
                            const res = reemplazarTablaDirecta(selectedCatalog, parsed);
                            if (res.success) {
                              Swal.fire({ icon: 'success', title: 'Catálogo Restaurado', text: `Se reescribió la tabla ${selectedCatalog} desde el archivo cargado.`, timer: 1500, background: '#0d1b2a', color: '#fff' });
                            } else {
                              Swal.fire('Error de Escritura', res.error, 'error');
                            }
                          } catch (err: any) {
                            Swal.fire('Error de Lectura', 'El archivo no contiene un JSON válido. ' + err.message, 'error');
                          }
                        };
                        reader.readAsText(file);
                        // Reset file input target
                        e.target.value = '';
                      }}
                    />

                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1 cursor-pointer transition w-full sm:w-auto justify-center"
                      title="Importar un archivo JSON desde su computadora para reescribir esta tabla"
                    >
                      <FileUp size={13} /> Importar JSON
                    </button>

                    <button
                      onClick={() => {
                        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(rawJsonText);
                        const downloadAnchor = document.createElement('a');
                        downloadAnchor.setAttribute("href", dataStr);
                        downloadAnchor.setAttribute("download", `logistika_${selectedCatalog.toLowerCase()}_${new Date().toISOString().split('T')[0]}.json`);
                        document.body.appendChild(downloadAnchor);
                        downloadAnchor.click();
                        downloadAnchor.remove();
                      }}
                      className="bg-slate-800 hover:bg-slate-755 border border-slate-700 text-slate-300 font-bold px-3 py-1.5 rounded-lg text-xs uppercase flex items-center gap-1 cursor-pointer transition w-full sm:w-auto justify-center"
                      title="Descargar este catálogo individual como archivo JSON"
                    >
                      <FileDown size={13} /> Exportar JSON
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <textarea
                    value={rawJsonText}
                    onChange={(e) => {
                      setRawJsonText(e.target.value);
                      try {
                        JSON.parse(e.target.value);
                        setDbError(null);
                      } catch (err: any) {
                        setDbError(err?.message || 'JSON inválido');
                      }
                    }}
                    rows={16}
                    className="w-full bg-slate-950 text-emerald-400 font-mono text-xs p-4 rounded-xl border border-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 overflow-y-auto shadow-inner leading-relaxed select-text cursor-text"
                  />
                  
                  {dbError ? (
                    <div className="bg-rose-950/20 text-rose-450 border border-rose-900/40 p-2.5 rounded-xl text-[11px] font-mono leading-tight">
                      ⚠️ Error de Sintaxis JSON: {dbError}
                    </div>
                  ) : (
                    <div className="text-teal-400 text-[10px] font-mono text-right font-semibold">
                      ✓ Sintaxis de JSON Correcta. Listo para escribir.
                    </div>
                  )}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    onClick={() => {
                      try {
                        const parsed = JSON.parse(rawJsonText);
                        if (!Array.isArray(parsed)) {
                          Swal.fire({
                            icon: 'error',
                            title: 'Estructura No Permitida',
                            text: 'El documento JSON obligatorio debe inicializar un arreglo de elementos [ { ... } ].',
                            background: '#0d1b2a',
                            color: '#fff'
                          });
                          return;
                        }
                        
                        Swal.fire({
                          title: '¿Confirmar Modificación Cruda?',
                          html: `¿Está seguro de reescribir permanentemente toda la tabla <strong>${selectedCatalog.replace('DB_', '')}</strong> con la información editada?<br/>Cualquier error de formato en ids alterará la visualización general.`,
                          icon: 'warning',
                          showCancelButton: true,
                          confirmButtonText: '💾 Sí, aplicar cambios',
                          cancelButtonText: 'Cancelar',
                          background: '#0d1b2a',
                          color: '#fff'
                        }).then((result) => {
                          if (result.isConfirmed) {
                            const res = reemplazarTablaDirecta(selectedCatalog, parsed);
                            if (res.success) {
                              Swal.fire({
                                icon: 'success',
                                title: 'Base de Datos Actualizada',
                                text: 'Se aplicaron los cambios directos a la tabla.',
                                background: '#0d1b2a',
                                color: '#fff',
                                timer: 1500,
                                showConfirmButton: false
                              });
                            } else {
                              Swal.fire('Error', res.error, 'error');
                            }
                          }
                        });
                      } catch (err: any) {
                        Swal.fire('Error de parsing', 'Corrija los errores de sintaxis JSON antes de guardar.', 'error');
                      }
                    }}
                    disabled={!!dbError}
                    className="w-full sm:w-auto bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-extrabold px-6 py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-150 inline-flex items-center justify-center gap-1.5 cursor-pointer shadow"
                  >
                    <Save size={14} /> Aplicar Cambios Directos a la Tabla
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODAL PEDIDOS */}
      {pedModalOpen && editingPedido && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPedModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl my-auto cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-850 shrink-0">
              <h2 className="text-slate-100 font-bold text-[13px] tracking-widest uppercase">
                ADMIN: EDITAR PEDIDO #{editingPedido.ticket}
              </h2>
              <button onClick={() => setPedModalOpen(false)} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
            </div>

            <form onSubmit={handleSavePedido} className="p-6 space-y-4 overflow-y-auto flex-grow">
              {/* Warnings Block conditional on state */}
              {(editingPedido.estatus === 'EN RUTA' || editingPedido.estatus === 'FINALIZADO') && (
                <div className="bg-amber-950/20 text-amber-400 border border-amber-900 p-4 rounded-xl flex gap-2 text-xs">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
                  <div>
                    <h5 className="font-bold">¡Atención de Seguridad!</h5>
                    <p className="mt-1 opacity-90">Este pedido está actualmente <strong>{editingPedido.estatus}</strong>. Los cambios realizados se reflejarán instantáneamente en la pantalla del chofer.</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nombre Cliente</label>
                  <input type="text" value={cliNombre} onChange={(e) => setCliNombre(e.target.value)} required className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Celular Cliente (10 dígitos)</label>
                  <input type="tel" maxLength={10} value={cliTel} onChange={(e) => setCliTel(e.target.value.replace(/\D/g, ''))} required className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
                </div>
              </div>

              <div className="bg-slate-850/40 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-slate-200 text-xs font-bold uppercase tracking-wide">Recoger en Tienda</h4>
                  <p className="text-[11px] text-slate-450">Usará la dirección asociada de la sucursal origen.</p>
                </div>
                <input 
                  type="checkbox" 
                  checked={pCheckTienda}
                  onChange={(e) => setPCheckTienda(e.target.checked)}
                  className="w-5 h-5 accent-teal-500 rounded cursor-pointer"
                />
              </div>

              {!pCheckTienda && (
                <div className="space-y-4 bg-slate-950/20 p-4 rounded-xl border border-slate-800">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Dirección Física de Entrega</label>
                    <textarea value={pDireccion} onChange={(e) => setPDireccion(e.target.value)} requiredrows={2} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">No. Interior</label>
                      <input type="text" value={pNumInt} onChange={(e) => setPNumInt(e.target.value)} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referencias</label>
                      <input type="text" value={pReferencias} onChange={(e) => setPReferencias(e.target.value)} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carga</label>
                  <select value={pTipoCarga} onChange={(e) => setPTipoCarga(e.target.value)} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none">
                    <option>Todo el Ticket</option>
                    <option>Entrega Parcial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Observaciones</label>
                  <textarea value={pObservaciones} onChange={(e) => setPObservaciones(e.target.value)} rows={2} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
                </div>
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-555 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition shadow cursor-pointer">
                  Guardar Cambios Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL RECOLECCION */}
      {recModalOpen && editingRec && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setRecModalOpen(false); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-auto cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-850 shrink-0">
              <h2 className="text-slate-100 font-bold text-[13px] tracking-widest uppercase">
                ADMIN: EDITAR REC {editingRec.id}
              </h2>
              <button onClick={() => setRecModalOpen(false)} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
            </div>

            <form onSubmit={handleSaveRec} className="p-6 space-y-4 overflow-y-auto flex-grow">
              {editingRec.estatus === 'EN RUTA' && (
                <div className="bg-amber-950/20 text-amber-400 border border-amber-900 p-3.5 rounded-xl flex gap-2 text-xs">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  <p><strong>Atención:</strong> Esta orden de recolección está en ruta con el transportista.</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Proveedor</label>
                <input type="text" value={rProveedor} onChange={(e) => setRProveedor(e.target.value)} required className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dirección de Recolección</label>
                <textarea value={rDireccion} onChange={(e) => setRDireccion(e.target.value)} required rows={2} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Referencias</label>
                <input type="text" value={rReferencias} onChange={(e) => setRReferencias(e.target.value)} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Material</label>
                <textarea value={rMaterial} onChange={(e) => setRMaterial(e.target.value)} required rows={2} className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none" />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Fecha Disponible</label>
                <input 
                  type="date" 
                  value={rFechaDisp} 
                  onChange={(e) => setRFechaDisp(e.target.value)} 
                  required 
                  onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                  onFocus={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                  className="w-full bg-slate-900 border border-slate-755 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none cursor-pointer" 
                />
              </div>

              <div className="pt-2">
                <button type="submit" className="w-full bg-teal-600 hover:bg-teal-555 text-white font-bold py-3 rounded-xl text-xs uppercase tracking-widest transition shadow cursor-pointer">
                  Guardar Cambios Administrador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal status tag format badges
const badgePedido = (est: string) => {
  const e = est.toUpperCase();
  const base = "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border shadow-inner shrink-0";
  if (e === 'CARGADO') return <span className={`${base} bg-indigo-950 text-indigo-400 border-indigo-900`}>{est}</span>;
  if (["PENDIENTE", "EN PROCESO / COMPRA", "PARCIAL", "ENTREGA INMEDIATA"].includes(e)) return <span className={`${base} bg-amber-950 text-amber-500 border-amber-900`}>{est}</span>;
  if (e === 'REVISADO') return <span className={`${base} bg-slate-800 text-slate-400 border-slate-700`}>{est}</span>;
  if (e === 'PROGRAMADO') return <span className={`${base} bg-orange-950 text-orange-400 border-orange-900`}>{est}</span>;
  if (e === 'EN RUTA') return <span className={`${base} bg-teal-950 text-teal-400 border-teal-900`}>{est}</span>;
  if (e === 'FINALIZADO') return <span className={`${base} bg-emerald-950 text-emerald-400 border-emerald-900`}>{est}</span>;
  return <span className={`${base} bg-slate-850 text-slate-450 border-slate-750`}>{est}</span>;
};

const badgeRec = (est: string) => {
  const e = est.toUpperCase();
  const base = "text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase border shadow-inner shrink-0";
  if (e === 'SOLICITADO') return <span className={`${base} bg-amber-955 text-amber-400 border-amber-900`}>{est}</span>;
  if (e === 'PROGRAMADO') return <span className={`${base} bg-sky-950 text-sky-400 border-sky-900`}>{est}</span>;
  if (e === 'RECOLECTADO' || e === 'FINALIZADO') return <span className={`${base} bg-emerald-950 text-emerald-400 border-emerald-900`}>{est}</span>;
  if (e === 'EN RUTA') return <span className={`${base} bg-teal-950 text-teal-400 border-teal-900`}>{est}</span>;
  return <span className={`${base} bg-slate-850 text-slate-400 border-slate-750`}>{est}</span>;
};
