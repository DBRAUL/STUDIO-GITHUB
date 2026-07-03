/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { useLogistika, formatedDisplayDate, formatedDisplayDateTime, getMexicoCityDateStr } from '../context/LogistikaContext';
import { Pedido, Recoleccion, UnidadConfig, KilometrajeRegistro } from '../types';
import { Shield, Search, Trash2, Edit2, Archive, AlertTriangle, X, CheckSquare, Plus, Activity, RotateCcw, MapPin, Calendar, Database, FileJson, Save, FileUp, FileDown, Eye, Camera, FileText, CheckCircle2, DollarSign, Fuel, ArrowRight, Truck } from 'lucide-react';
import Swal from 'sweetalert2';
import { createPortal } from 'react-dom';

export const Admin: React.FC = () => {
  const {
    pedidos,
    recolecciones,
    choferes,
    proveedores,
    tiendas,
    historialEntregas,
    historialRecolecciones,
    unidades,
    kilometrajes,
    modificarPedidoAdmin,
    modificarRecoleccionAdmin,
    eliminarPedidoAdmin,
    eliminarRecoleccionAdmin,
    archivarFinalizados,
    reemplazarTablaDirecta
  } = useLogistika();

  const [activeTab, setActiveTab] = useState<'PEDIDOS' | 'RECOLECCIONES' | 'HISTORIAL' | 'BASE_DATOS' | 'AUDITORIA_UNIDADES'>('PEDIDOS');
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
      case 'DB_UNIDADES': return unidades;
      default: return [];
    }
  };

  // Keep rawJsonText synced with database updates when catalog selection changes or the context data changes
  useEffect(() => {
    setRawJsonText(JSON.stringify(getCatalogData(selectedCatalog), null, 2));
    setDbError(null);
  }, [selectedCatalog, pedidos, recolecciones, choferes, proveedores, tiendas, historialEntregas, historialRecolecciones, unidades]);

  // Edit Pedido Modal
  const [pedModalOpen, setPedModalOpen] = useState(false);
  const [editingPedido, setEditingPedido] = useState<Pedido | null>(null);
  const [cliNombre, setCliNombre] = useState('');
  
  // Historial eye/detail select modal
  const [selectedHistItem, setSelectedHistItem] = useState<{ item: any; type: 'Entrega' | 'Recoleccion' } | null>(null);
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
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 ${
              activeTab === 'PEDIDOS' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Pedidos
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
              activeTab === 'PEDIDOS' ? 'bg-teal-950/50 text-teal-400' : 'bg-slate-900 text-slate-500'
            }`}>
              {pedidos.length}
            </span>
          </button>
          <button 
            onClick={() => { setActiveTab('RECOLECCIONES'); setFiltroEstatus(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 ${
              activeTab === 'RECOLECCIONES' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Recolecciones
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
              activeTab === 'RECOLECCIONES' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}>
              {recolecciones.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('HISTORIAL')}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 ${
              activeTab === 'HISTORIAL' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            Historial de Archivados
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
              activeTab === 'HISTORIAL' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}>
              {historialEntregas.length + historialRecolecciones.length}
            </span>
          </button>
          <button 
            onClick={() => { setActiveTab('AUDITORIA_UNIDADES'); setFiltroEstatus(null); }}
            className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto flex items-center justify-center gap-1.5 ${
              activeTab === 'AUDITORIA_UNIDADES' ? 'bg-slate-800 text-teal-400 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Activity size={13} />
            Auditoría de Unidades
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
                      <p className="text-[11px] text-slate-400 bg-slate-900 p-2 rounded border-l border-amber-500 font-medium whitespace-pre-wrap break-words">
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
                    <div 
                      key={h.ticket} 
                      onClick={() => setSelectedHistItem({ item: h, type: 'Entrega' })}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">📦 ENTREGA #{h.ticket}</span>
                          <span className="bg-indigo-950 text-indigo-400 border border-indigo-900 px-2 py-0.5 rounded text-[9px] uppercase font-bold">{h.tienda}</span>
                        </div>
                        <p className="font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                          Cliente: {h.cliente}
                          <span className="text-[10px] text-teal-400 bg-teal-950/40 border border-teal-900 px-1 py-0.2 rounded font-mono font-medium">Ver detalles 👁️</span>
                        </p>
                        <p className="text-slate-400 opacity-90 text-[10px] truncate max-w-sm">Dir: {h.dir}</p>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-mono space-y-1">
                        <p className="bg-slate-850 px-2 py-1 rounded inline-block text-slate-300 border border-slate-800">
                          Entregado: {formatedDisplayDateTime(h.fechaFinalizado) || h.fechaFinalizado || '—'}
                        </p>
                        <p className="block">Chofer finalizador: {h.chofer} · Receptor: {h.receptor || '—'}</p>
                      </div>
                    </div>
                  ))}

                  {historialRecolecciones.filter(h => h.id.toLowerCase().includes(buscarHist.toLowerCase()) || h.proveedor.toLowerCase().includes(buscarHist.toLowerCase())).map(h => (
                    <div 
                      key={h.id} 
                      onClick={() => setSelectedHistItem({ item: h, type: 'Recoleccion' })}
                      className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-xs hover:bg-slate-800/40 cursor-pointer transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-500">🏭 RECOLECCION #{h.id}</span>
                          <span className="bg-teal-950 text-teal-400 border border-teal-900 px-2.5 py-0.5 rounded text-[9px] uppercase font-bold">{h.solicitante}</span>
                        </div>
                        <p className="font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                          Proveedor: {h.proveedor}
                          <span className="text-[10px] text-teal-400 bg-teal-950/40 border border-teal-900 px-1 py-0.2 rounded font-mono font-medium">Ver detalles 👁️</span>
                        </p>
                        <p className="text-slate-400 opacity-90 text-[10px] truncate max-w-sm">Dir: {h.direccion}</p>
                      </div>

                      <div className="text-right text-[10px] text-slate-500 font-mono space-y-1">
                        <p className="bg-slate-850 px-2 py-1 rounded inline-block text-slate-300 border border-slate-800">
                          Recolectado: {formatedDisplayDateTime(h.fechaFinalizado) || h.fechaFinalizado || '—'}
                        </p>
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
                { id: 'DB_UNIDADES', label: '🚚 Catálogo Unidades', count: unidades.length },
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

      {activeTab === 'AUDITORIA_UNIDADES' && (() => {
        const calculateLogsStats = () => {
          let totalKms = 0;
          let totalLiters = 0;
          let totalCost = 0;

          // Group kilometrajes by unit
          const unitGroups: { [unitId: string]: KilometrajeRegistro[] } = {};
          kilometrajes.forEach(k => {
            if (!k.unidadId) return;
            if (!unitGroups[k.unidadId]) {
              unitGroups[k.unidadId] = [];
            }
            unitGroups[k.unidadId].push(k);
          });

          // For each unit, sort logs chronologically and calculate distance differences
          Object.keys(unitGroups).forEach(unitId => {
            const sorted = unitGroups[unitId]
              .filter(k => k.kmValue !== undefined && k.kmValue !== null)
              .sort((a, b) => (a.fechaAlta || a.fecha).localeCompare(b.fechaAlta || b.fecha));
            
            const unit = unidades.find(u => u.id === unitId);
            const rendimiento = unit?.rendimiento || 10.0;
            const precio = unit?.combustiblePrecio || 24.50;

            for (let i = 0; i < sorted.length - 1; i++) {
              const currentLog = sorted[i];
              const nextLog = sorted[i + 1];
              const diff = nextLog.kmValue - currentLog.kmValue;
              if (diff > 0) {
                totalKms += diff;
                const liters = diff / rendimiento;
                totalLiters += liters;
                totalCost += liters * precio;
              }
            }
          });

          return { totalKms, totalLiters, totalCost };
        };

        const stats = calculateLogsStats();

        const getLogDistanceDetails = (log: KilometrajeRegistro) => {
          if (!log.unidadId || log.kmValue === undefined || log.kmValue === null) {
            return { distance: null, liters: null, cost: null };
          }
          const unitLogs = kilometrajes
            .filter(k => k.unidadId === log.unidadId && k.kmValue !== undefined && k.kmValue !== null)
            .sort((a, b) => (a.fechaAlta || a.fecha).localeCompare(b.fechaAlta || b.fecha));
          
          // Find index in sorted list
          const index = unitLogs.findIndex(k => k.id === log.id);
          if (index === -1 || index === unitLogs.length - 1) {
            // No next reading exists yet (it's the latest, current route)
            return { distance: null, liters: null, cost: null };
          }
          const nextLog = unitLogs[index + 1];
          const distance = nextLog.kmValue - log.kmValue;
          if (distance < 0) {
            return { distance: 0, liters: 0, cost: 0, error: 'Reversa' };
          }
          
          const unit = unidades.find(u => u.id === log.unidadId);
          const rendimiento = unit?.rendimiento || 10.0;
          const precio = unit?.combustiblePrecio || 24.50;
          const liters = distance / rendimiento;
          const cost = liters * precio;
          
          return { distance, liters, cost };
        };

        return (
          <div className="space-y-6 animate-fade-in text-slate-100">
            {/* Top Banner */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-teal-400 font-extrabold text-lg uppercase tracking-wider flex items-center gap-2 font-display">
                  <Activity size={20} className="text-teal-400 animate-pulse" /> Auditoría de Unidades y Rendimiento
                </h3>
                <p className="text-slate-400 text-xs max-w-3xl leading-relaxed">
                  Supervise y analice el kilometraje real de cada unidad ingresado directamente por los choferes. 
                  Compare los recorridos interdiarios, estime el gasto exacto de combustible y gestione la configuración de rendimiento de la flota en tiempo real.
                </p>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-2 shrink-0">
                <button 
                  onClick={() => {
                    Swal.fire({
                      title: 'Añadir Nueva Unidad Camioneta',
                      html: `
                        <div class="text-left space-y-3 font-sans p-2">
                          <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase">ID de Unidad / Nombre</label>
                            <input id="swal-unit-id" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" placeholder="ej. Camioneta 5" value="Camioneta ${unidades.length + 1}">
                          </div>
                          <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase">Número de Placa</label>
                            <input id="swal-unit-placa" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" placeholder="ej. JAL-8822" />
                          </div>
                          <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase">Rendimiento Estimado (km/Lt)</label>
                            <input id="swal-unit-rendimiento" type="number" step="0.1" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" placeholder="ej. 10.5" />
                          </div>
                          <div>
                            <label class="block text-xs font-bold text-slate-400 uppercase">Precio Combustible Promedio ($/Lt)</label>
                            <input id="swal-unit-precio" type="number" step="0.1" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" placeholder="ej. 24.50" value="24.50" />
                          </div>
                        </div>
                      `,
                      background: '#0d1b2a',
                      color: '#fff',
                      showCancelButton: true,
                      confirmButtonText: 'Guardar Unidad',
                      confirmButtonColor: '#0f766e',
                      cancelButtonText: 'Cancelar',
                      preConfirm: () => {
                        const idVal = (document.getElementById('swal-unit-id') as HTMLInputElement).value.trim();
                        const placaVal = (document.getElementById('swal-unit-placa') as HTMLInputElement).value.trim();
                        const rendVal = Number((document.getElementById('swal-unit-rendimiento') as HTMLInputElement).value);
                        const precioVal = Number((document.getElementById('swal-unit-precio') as HTMLInputElement).value);
                        
                        if (!idVal || !placaVal) {
                          Swal.showValidationMessage('ID de Unidad y Placa son obligatorios');
                          return false;
                        }
                        if (isNaN(rendVal) || rendVal <= 0) {
                          Swal.showValidationMessage('Rendimiento debe ser un número positivo');
                          return false;
                        }
                        return { id: idVal, placa: placaVal, rendimiento: rendVal, combustiblePrecio: precioVal };
                      }
                    }).then((result) => {
                      if (result.isConfirmed && result.value) {
                        const newUnit = result.value;
                        // check duplicate
                        if (unidades.some(u => u.id === newUnit.id)) {
                          Swal.fire('Error', 'Ya existe una unidad con ese ID/Nombre', 'error');
                          return;
                        }
                        const nuevas = [...unidades, newUnit];
                        const res = reemplazarTablaDirecta('DB_UNIDADES', nuevas);
                        if (res.success) {
                          Swal.fire({ icon: 'success', title: 'Unidad Creada', text: 'Se ha añadido la nueva camioneta al catálogo.', background: '#0d1b2a', color: '#fff', timer: 1500 });
                        } else {
                          Swal.fire('Error', res.error, 'error');
                        }
                      }
                    });
                  }}
                  className="bg-teal-755 hover:bg-teal-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition shadow"
                >
                  <Plus size={14} /> Añadir Camioneta
                </button>
              </div>
            </div>

            {/* Stats Cards Dashboard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Camionetas Activas</span>
                  <span className="block text-2xl font-black font-display text-slate-100">{unidades.length} u.</span>
                </div>
                <div className="bg-teal-950/40 border border-teal-900/60 p-3 rounded-lg text-teal-400 animate-fade-in">
                  <Truck size={20} />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Lecturas Odo Totales</span>
                  <span className="block text-2xl font-black font-display text-slate-100">{kilometrajes.length} reg.</span>
                </div>
                <div className="bg-indigo-950/40 border border-indigo-900/60 p-3 rounded-lg text-indigo-400 animate-fade-in">
                  <Camera size={20} />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Kms Recorridos Totales</span>
                  <span className="block text-2xl font-black font-display text-slate-100">{stats.totalKms.toLocaleString()} km</span>
                </div>
                <div className="bg-emerald-950/40 border border-emerald-900/60 p-3 rounded-lg text-emerald-400 animate-fade-in">
                  <ArrowRight size={20} />
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Costo de Combustible</span>
                  <span className="block text-2xl font-black font-display text-emerald-400">${stats.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-emerald-500 animate-fade-in">
                  <DollarSign size={20} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Units list panel (Left) */}
              <div className="lg:col-span-1 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5 font-display text-amber-500">
                      <Truck size={14} /> Catálogo de Flotilla y Rendimientos
                    </h4>
                    <p className="text-slate-400 text-[10px] mt-0.5">Gestione y edite las especificaciones de cada camioneta de reparto.</p>
                  </div>

                  <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
                    {unidades.map(unit => {
                      return (
                        <div key={unit.id} className="bg-slate-950 border border-slate-850 rounded-xl p-4 space-y-3 relative overflow-hidden group hover:border-slate-700 transition duration-150">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="block font-black text-slate-100 text-sm tracking-tight">{unit.id}</span>
                              <span className="font-mono text-[10px] bg-indigo-950/70 border border-indigo-900/40 text-indigo-400 px-2 py-0.5 rounded font-extrabold uppercase mt-1 inline-block">Placa: {unit.placa}</span>
                            </div>
                            
                            <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition">
                              <button
                                onClick={() => {
                                  Swal.fire({
                                    title: `Editar ${unit.id}`,
                                    html: `
                                      <div class="text-left space-y-3 font-sans p-2">
                                        <div>
                                          <label class="block text-xs font-bold text-slate-400 uppercase">Número de Placa</label>
                                          <input id="swal-edit-placa" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" value="${unit.placa || ''}" />
                                        </div>
                                        <div>
                                          <label class="block text-xs font-bold text-slate-400 uppercase">Rendimiento (km/Lt)</label>
                                          <input id="swal-edit-rendimiento" type="number" step="0.1" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" value="${unit.rendimiento || 10.0}" />
                                        </div>
                                        <div>
                                          <label class="block text-xs font-bold text-slate-400 uppercase">Precio Combustible ($/Lt)</label>
                                          <input id="swal-edit-precio" type="number" step="0.1" class="w-full bg-slate-950 border border-slate-800 text-slate-200 text-sm rounded px-3 py-2 mt-1 focus:outline-none" value="${unit.combustiblePrecio || 24.50}" />
                                        </div>
                                      </div>
                                    `,
                                    background: '#0d1b2a',
                                    color: '#fff',
                                    showCancelButton: true,
                                    confirmButtonText: 'Aplicar Cambios',
                                    confirmButtonColor: '#0f766e',
                                    cancelButtonText: 'Cancelar',
                                    preConfirm: () => {
                                      const placaVal = (document.getElementById('swal-edit-placa') as HTMLInputElement).value.trim();
                                      const rendVal = Number((document.getElementById('swal-edit-rendimiento') as HTMLInputElement).value);
                                      const precioVal = Number((document.getElementById('swal-edit-precio') as HTMLInputElement).value);
                                      
                                      if (!placaVal) {
                                        Swal.showValidationMessage('La placa es obligatoria');
                                        return false;
                                      }
                                      if (isNaN(rendVal) || rendVal <= 0) {
                                        Swal.showValidationMessage('Rendimiento debe ser mayor a 0');
                                        return false;
                                      }
                                      return { placa: placaVal, rendimiento: rendVal, combustiblePrecio: precioVal };
                                    }
                                  }).then((result) => {
                                    if (result.isConfirmed && result.value) {
                                      const updated = {
                                        ...unit,
                                        ...result.value
                                      };
                                      const nuevas = unidades.map(u => u.id === unit.id ? updated : u);
                                      const res = reemplazarTablaDirecta('DB_UNIDADES', nuevas);
                                      if (res.success) {
                                        Swal.fire({ icon: 'success', title: 'Unidad Actualizada', background: '#0d1b2a', color: '#fff', timer: 1500 });
                                      } else {
                                        Swal.fire('Error', res.error, 'error');
                                      }
                                    }
                                  });
                                }}
                                className="p-1 px-2 border border-slate-850 hover:border-slate-700 bg-slate-900 rounded-lg text-slate-400 hover:text-teal-400 text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1 cursor-pointer transition hover:bg-slate-900/80"
                                title="Editar especificaciones"
                              >
                                <Edit2 size={10} /> Editar
                              </button>

                              <button
                                onClick={() => {
                                  Swal.fire({
                                    title: '¿Eliminar Camioneta?',
                                    text: `Esta acción removerá a ${unit.id} (${unit.placa}) del catálogo de unidades activas.`,
                                    icon: 'warning',
                                    showCancelButton: true,
                                    confirmButtonText: 'Sí, eliminar',
                                    cancelButtonText: 'No, cancelar',
                                    background: '#0d1b2a',
                                    color: '#fff',
                                    confirmButtonColor: '#e11d48'
                                  }).then((result) => {
                                    if (result.isConfirmed) {
                                      const nuevas = unidades.filter(u => u.id !== unit.id);
                                      const res = reemplazarTablaDirecta('DB_UNIDADES', nuevas);
                                      if (res.success) {
                                        Swal.fire({ icon: 'success', title: 'Unidad Eliminada', text: 'Se actualizó el catálogo de camionetas.', background: '#0d1b2a', color: '#fff', timer: 1500 });
                                      } else {
                                        Swal.fire('Error', res.error, 'error');
                                      }
                                    }
                                  });
                                }}
                                className="p-1 border border-slate-850 hover:border-rose-900 bg-slate-900 rounded-lg text-slate-500 hover:text-rose-400 cursor-pointer transition hover:bg-rose-955/25"
                                title="Eliminar camioneta"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-slate-900 pt-3">
                            <div className="space-y-0.5">
                              <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Rendimiento</span>
                              <span className="font-extrabold text-slate-300 font-mono flex items-center gap-1">
                                <Fuel size={11} className="text-slate-400" /> {unit.rendimiento} km/Lt
                              </span>
                            </div>
                            
                            <div className="space-y-0.5">
                              <span className="text-slate-500 block uppercase font-bold text-[9px] tracking-wider">Combustible Promedio</span>
                              <span className="font-extrabold text-slate-300 font-mono text-emerald-400">
                                ${unit.combustiblePrecio} / Lt
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    
                    {unidades.length === 0 && (
                      <div className="text-center py-8 text-slate-500 text-xs italic">
                        No hay camionetas registradas. Añada una para comenzar.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Odometer logs timeline (Right) */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="font-extrabold text-slate-200 text-xs uppercase tracking-wider flex items-center gap-1.5 font-display text-indigo-400">
                      <Truck size={14} /> Bitácora de Lecturas de Odómetro y Kilometraje
                    </h4>
                    <p className="text-slate-400 text-[10px] mt-0.5">Lista cronológica de kilometrajes registrados interdiarios por unidad.</p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-950/60 font-mono">
                          <th className="py-3 px-3">Unidad e Info.</th>
                          <th className="py-3 px-3">Operador / Fecha</th>
                          <th className="py-3 px-3">Lectura Odo</th>
                          <th className="py-3 px-3 text-center">Foto</th>
                          <th className="py-3 px-3 text-right">Recorrido & Gasto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850 text-xs text-slate-300">
                        {kilometrajes
                          .slice()
                          .sort((a,b) => (b.fechaAlta || b.fecha).localeCompare(a.fechaAlta || a.fecha))
                          .map(log => {
                            const unit = unidades.find(u => u.id === log.unidadId);
                            const statsDetails = getLogDistanceDetails(log);
                            
                            return (
                              <tr key={log.id} className="hover:bg-slate-950/50 transition border-b border-slate-850/40">
                                <td className="py-3.5 px-3 pr-2">
                                  <div className="space-y-1">
                                    <span className="font-black text-slate-100 block text-xs">{log.unidadId || '—'}</span>
                                    {unit ? (
                                      <span className="text-[9px] text-slate-400 font-extrabold font-mono uppercase bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded">
                                        Placa: {unit.placa}
                                      </span>
                                    ) : (
                                      <span className="text-[9px] text-slate-500 font-mono italic">Sin configurar</span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3.5 px-3">
                                  <div className="space-y-0.5">
                                    <span className="font-bold text-slate-300 block">{log.chofer || 'Desconocido'}</span>
                                    <span className="text-[10px] text-slate-400 font-mono">{log.fecha ? formatedDisplayDate(log.fecha) : '—'}</span>
                                  </div>
                                </td>

                                <td className="py-3.5 px-3">
                                  <span className="font-black text-slate-100 font-mono text-[13px]">
                                    {log.kmValue !== undefined ? `${log.kmValue.toLocaleString()} km` : 'Sin OCR'}
                                  </span>
                                </td>

                                <td className="py-3.5 px-3 text-center">
                                  {log.foto ? (
                                    <button
                                      onClick={() => {
                                        Swal.fire({
                                          title: `Evidencia de Odómetro: ${log.unidadId || 'Sin ID'}`,
                                          html: `
                                            <div class="space-y-2 text-left p-1 font-sans">
                                              <div class="grid grid-cols-2 gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2 mb-2 font-mono">
                                                <div><strong>Chofer:</strong> ${log.chofer}</div>
                                                <div><strong>Fecha:</strong> ${log.fecha}</div>
                                                <div><strong>Kilometraje:</strong> ${log.kmValue ? log.kmValue.toLocaleString() : '—'} km</div>
                                                <div><strong>Unidad:</strong> ${log.unidadId || '—'}</div>
                                              </div>
                                              <div class="flex justify-center bg-slate-900 border border-slate-800 p-2 rounded">
                                                <img src="${log.foto}" class="max-w-full max-h-[480px] object-contain rounded" alt="Odometer visual proof" />
                                              </div>
                                            </div>
                                          `,
                                          background: '#0d1b2a',
                                          color: '#fff',
                                          confirmButtonText: 'Cerrar Vista',
                                          confirmButtonColor: '#0f766e',
                                          width: 580
                                        });
                                      }}
                                      className="p-1 px-2 bg-slate-950 border border-slate-850 hover:border-slate-700 rounded-lg text-slate-400 hover:text-amber-400 transition cursor-pointer inline-flex items-center gap-1"
                                    >
                                      <Eye size={12} />
                                      <span className="text-[10px] font-black uppercase tracking-wider">Ver Foto</span>
                                    </button>
                                  ) : (
                                    <span className="text-slate-600 text-[10px] italic">Sin foto</span>
                                  )}
                                </td>

                                <td className="py-3.5 px-3 text-right">
                                  {statsDetails.distance === null ? (
                                    <span className="text-[8.5px] font-black uppercase tracking-widest bg-yellow-955/30 border border-yellow-905/40 text-yellow-500 px-2.5 py-0.5 rounded-full inline-block animate-pulse">
                                      En curso 🚙
                                    </span>
                                  ) : statsDetails.error ? (
                                    <span className="text-[10px] font-bold text-rose-450 block">{statsDetails.error}</span>
                                  ) : (
                                    <div className="space-y-0.5">
                                      <span className="font-extrabold font-mono text-slate-100 text-xs block">
                                        +{statsDetails.distance} km
                                      </span>
                                      <span className="text-[9.5px] text-emerald-400 font-extrabold block font-mono">
                                        ⛽ {statsDetails.liters?.toFixed(1)} Lts (${statsDetails.cost?.toFixed(2)})
                                      </span>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        
                        {kilometrajes.length === 0 && (
                          <tr>
                            <td colSpan={5} className="text-center py-10 text-slate-500 text-xs italic">
                              No se han registrado auditorías de kilometraje hoy.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* EDIT MODAL PEDIDOS */}
      {pedModalOpen && editingPedido && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setPedModalOpen(false); }}
          className="fixed inset-0 z-[100] flex justify-center items-start bg-black/65 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
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
        </div>,
        document.body
      )}

      {/* EDIT MODAL RECOLECCION */}
      {recModalOpen && editingRec && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setRecModalOpen(false); }}
          className="fixed inset-0 z-[100] flex justify-center items-start bg-black/65 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
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
        </div>,
        document.body
      )}

      {/* HISTORIAL DETAIL EYE MODAL */}
      {selectedHistItem && createPortal(
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedHistItem(null); }}
          className="fixed inset-0 z-[100] flex justify-center items-start bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`text-[11px] font-black tracking-widest px-2.5 py-0.5 rounded-full uppercase ${selectedHistItem.type === 'Entrega' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900' : 'bg-teal-950 text-teal-400 border border-teal-900'}`}>
                  {selectedHistItem.type === 'Entrega' ? 'Entrega Archivada' : 'Recolección Archivada'}
                </span>
                <h2 className="text-slate-100 font-bold text-base">
                  {selectedHistItem.type === 'Entrega' ? `#${selectedHistItem.item.ticket}` : `#${selectedHistItem.item.id}`}
                </h2>
              </div>
              <button onClick={() => setSelectedHistItem(null)} className="text-slate-400 hover:text-slate-100"><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-grow text-xs text-slate-350">
              {/* General Metadata Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950/40 border border-slate-850 p-4 rounded-xl">
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Fecha Alta</span>
                  <span className="text-xs text-slate-350 font-mono">{selectedHistItem.type === 'Entrega' ? (selectedHistItem.item.fecha || '—') : (selectedHistItem.item.fechaAlta || '—')}</span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">
                    {selectedHistItem.type === 'Entrega' ? 'Fecha Entregado' : 'Fecha Recolectado'}
                  </span>
                  <span className="text-xs text-slate-350 font-mono">
                    {formatedDisplayDateTime(selectedHistItem.item.fechaFinalizado) || selectedHistItem.item.fechaFinalizado || '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[9px] uppercase font-bold text-slate-500 tracking-wider">Chofer Finalizador</span>
                  <span className="text-xs text-slate-200 font-bold">{selectedHistItem.item.chofer || '—'}</span>
                </div>
              </div>

              {/* Specific Content */}
              {selectedHistItem.type === 'Entrega' ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Cliente</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 font-medium">{selectedHistItem.item.cliente}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Teléfono</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 font-mono">{selectedHistItem.item.tel || '—'}</p>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Tienda / Sucursal</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100">{selectedHistItem.item.tienda}</p>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Dirección de Entrega</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">{selectedHistItem.item.dir}</p>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Referencias</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 leading-relaxed">{selectedHistItem.item.ref || '—'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Tipo de Carga</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100">{selectedHistItem.item.tipo || '—'}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Persona que Recibió</span>
                      <p className="bg-slate-950/80 border border-slate-800/80 p-3 rounded-lg text-xs text-emerald-400 font-bold font-mono">
                        👤 {selectedHistItem.item.receptor || 'No especificado (Se marcó como Concluido)'}
                      </p>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Observaciones Ventas</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-350 italic whitespace-pre-wrap break-words">{selectedHistItem.item.obs || '—'}</p>
                  </div>

                  {(selectedHistItem.item.comprasObs || selectedHistItem.item.comprasUbic) && (
                    <div className="bg-slate-950/30 border border-slate-850 p-4 rounded-xl space-y-3">
                      <span className="block text-[10px] uppercase font-bold text-amber-500 tracking-wider">Información de Compras</span>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[9px] uppercase font-semibold text-slate-400 mb-0.5">Ubicación Compra</span>
                          <p className="text-xs text-slate-200 whitespace-pre-wrap break-words">{selectedHistItem.item.comprasUbic || '—'}</p>
                        </div>
                        <div>
                          <span className="block text-[9px] uppercase font-semibold text-slate-400 mb-0.5">Observaciones Compra</span>
                          <p className="text-xs text-slate-200 italic whitespace-pre-wrap break-words">{selectedHistItem.item.comprasObs || '—'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedHistItem.item.obsLogistica && (
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Observaciones Logística</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 whitespace-pre-wrap break-words">{selectedHistItem.item.obsLogistica}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Proveedor</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 font-medium">{selectedHistItem.item.proveedor}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Solicitante</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 font-mono">{selectedHistItem.item.solicitante || '—'}</p>
                    </div>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Material Recolectado</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 font-semibold">{selectedHistItem.item.material}</p>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Dirección de Recolección</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">{selectedHistItem.item.direccion}</p>
                  </div>

                  <div>
                    <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Referencias de Ubicación</span>
                    <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 leading-relaxed">{selectedHistItem.item.referencias || '—'}</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Fecha Disponible</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-slate-100 font-mono">{selectedHistItem.item.fechaDisponible || '—'}</p>
                    </div>
                    <div>
                      <span className="block text-[10px] uppercase font-semibold text-slate-400 tracking-wide mb-1">Fecha Recolección Real</span>
                      <p className="bg-slate-950 border border-slate-850 p-3 rounded-lg text-xs text-emerald-400 font-bold font-mono">📅 {selectedHistItem.item.fechaReal || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Photos Gallery */}
              {(((selectedHistItem.item.fotos && selectedHistItem.item.fotos.length > 0) || selectedHistItem.item.fotoUrl)) ? (
                <div className="space-y-3 pt-2">
                  <span className="block text-[11px] uppercase font-black text-rose-450 tracking-wider flex items-center gap-1.5">
                    <Camera size={14} /> Evidencias Fotográficas
                  </span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-950/20 border border-slate-850 p-4 rounded-xl">
                    {/* Single legacy photo */}
                    {selectedHistItem.item.fotoUrl && (
                      <div className="flex flex-col items-center bg-slate-950 rounded-lg p-2 border border-slate-800">
                        <img 
                          src={selectedHistItem.item.fotoUrl} 
                          alt="Evidencia principal" 
                          referrerPolicy="no-referrer"
                          className="rounded object-cover h-32 w-full hover:scale-105 transition cursor-pointer"
                          onClick={() => {
                            Swal.fire({
                              imageUrl: selectedHistItem.item.fotoUrl,
                              imageAlt: 'Evidencia',
                              background: '#0d1b2a',
                              confirmButtonColor: '#14b8a6',
                              confirmButtonText: 'Cerrar'
                            });
                          }}
                        />
                        <span className="text-[8px] text-slate-500 mt-1 font-mono uppercase">Ticket Foto</span>
                      </div>
                    )}

                    {/* Array of photos */}
                    {selectedHistItem.item.fotos && selectedHistItem.item.fotos.map((img: string, idx: number) => (
                      <div key={idx} className="flex flex-col items-center bg-slate-950 rounded-lg p-2 border border-slate-800">
                        <img 
                          src={img} 
                          alt={`Evidencia ${idx + 1}`} 
                          referrerPolicy="no-referrer"
                          className="rounded object-cover h-32 w-full hover:scale-105 transition cursor-pointer"
                          onClick={() => {
                            Swal.fire({
                              imageUrl: img,
                              imageAlt: `Evidencia ${idx + 1}`,
                              background: '#0d1b2a',
                              confirmButtonColor: '#14b8a6',
                              confirmButtonText: 'Cerrar'
                            });
                          }}
                        />
                        <span className="text-[8px] text-slate-500 mt-1 font-mono uppercase">Evidencia {idx + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-950/20 border border-slate-850 rounded-xl text-xs text-slate-500">
                  📷 No hay fotos de evidencia asociadas a este registro en el historial.
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-950/80 border-t border-slate-850 flex justify-end shrink-0">
              <button 
                onClick={() => setSelectedHistItem(null)} 
                className="bg-slate-850 hover:bg-slate-800 text-slate-200 border border-slate-755 font-bold px-4 py-2 rounded-xl text-xs uppercase tracking-wider transition cursor-pointer"
              >
                Cerrar Consulta
              </button>
            </div>
          </div>
        </div>,
        document.body
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
