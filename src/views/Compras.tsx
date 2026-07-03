/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLogistika, formatedDisplayDate, formatedDisplayDateTime } from '../context/LogistikaContext';
import { Pedido, Recoleccion } from '../types';
import { Clipboard, Truck, Search, Plus, MapPin, Eye, FileText, CheckCircle2, MessageCircle, MoreVertical, X, Upload, Calendar, Settings, Edit2, Trash2 } from 'lucide-react';
import Swal from 'sweetalert2';
import { compressBase64Image } from '../lib/imageCompressor';

export const Compras: React.FC = () => {
  const {
    pedidos,
    recolecciones,
    proveedores,
    guardarDictamenCompras,
    guardarSolicitudDesdeCompras,
    modificarRecoleccionAdmin,
    choferes,
    tiendas,
    agregarChofer, editarChofer, eliminarChofer,
    agregarProveedor, editarProveedor, eliminarProveedor,
    agregarTienda, editarTienda, eliminarTienda
  } = useLogistika();

  const [activeTab, setActiveTab] = useState<'PEDIDOS' | 'RECOLECCIONES'>('PEDIDOS');
  const [buscarPed, setBuscarPed] = useState('');
  const [buscarRec, setBuscarRec] = useState('');

  // Modals state
  const [dictamenOpen, setDictamenOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [dictamenEst, setDictamenEst] = useState('');
  const [dictamenObs, setDictamenObs] = useState('');
  const [dictamenUbic, setDictamenUbic] = useState('');
  
  // Recolección state
  const [nuevaRecOpen, setNuevaRecOpen] = useState(false);
  const [folioRec, setFolioRec] = useState('');
  const [provNombre, setProvNombre] = useState('');
  const [direccionRec, setDireccionRec] = useState('');
  const [refRec, setRefRec] = useState('');
  const [materialRec, setMaterialRec] = useState('');
  const [fechaRec, setFechaRec] = useState('');
  const [nuevaRecCaptura, setNuevaRecCaptura] = useState('');
  const [nuevaRecCapturaLoading, setNuevaRecCapturaLoading] = useState(false);
  const [sugProvs, setSugProvs] = useState<any[]>([]);
  const [msgError, setMsgError] = useState('');

  // Editing Recolección state
  const [editingRec, setEditingRec] = useState<Recoleccion | null>(null);
  const [editProvNombre, setEditProvNombre] = useState('');
  const [editDireccionRec, setEditDireccionRec] = useState('');
  const [editRefRec, setEditRefRec] = useState('');
  const [editMaterialRec, setEditMaterialRec] = useState('');
  const [editFechaRec, setEditFechaRec] = useState('');
  const [editCaptura, setEditCaptura] = useState('');
  const [editCapturaLoading, setEditCapturaLoading] = useState(false);
  const [editSugProvs, setEditSugProvs] = useState<any[]>([]);

  // Settings dropdown and catalog modal states
  const [showSettings, setShowSettings] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<'CHOFERES' | 'PROVEEDORES' | 'TIENDAS' | null>(null);

  // Catalog CRUD Modal Helper states
  const [catalogsNewName, setCatalogsNewName] = useState('');
  const [catalogsNewAddress, setCatalogsNewAddress] = useState('');
  const [catalogsNewRefOrSiglas, setCatalogsNewRefOrSiglas] = useState('');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // --- CATALOG CRUD OPERATIONS HANDLERS ---
  const handleCatalogAddClick = () => {
    if (!catalogsNewName.trim()) return;

    if (activeCatalog === 'CHOFERES') {
      agregarChofer(catalogsNewName);
    } else if (activeCatalog === 'PROVEEDORES') {
      if (!catalogsNewAddress.trim()) return;
      agregarProveedor({
        nombre: catalogsNewName,
        direccion: catalogsNewAddress,
        referencia: catalogsNewRefOrSiglas
      });
    } else if (activeCatalog === 'TIENDAS') {
      if (!catalogsNewAddress.trim() || !catalogsNewRefOrSiglas.trim()) return;
      agregarTienda({
        nombre: catalogsNewName,
        direccion: catalogsNewAddress,
        siglas: catalogsNewRefOrSiglas
      });
    }

    setCatalogsNewName('');
    setCatalogsNewAddress('');
    setCatalogsNewRefOrSiglas('');
    setEditingItemIdx(null);
  };

  const handleCatalogEditClick = (idx: number, item: any) => {
    setEditingItemIdx(idx);
    setCatalogsNewName(item.nombre || item || '');
    setCatalogsNewAddress(item.direccion || '');
    setCatalogsNewRefOrSiglas(item.referencia || item.siglas || '');
  };

  const handleCatalogUpdateClick = (idx: number) => {
    const fila = idx + 2; 

    if (activeCatalog === 'CHOFERES') {
      editarChofer(fila, catalogsNewName);
    } else if (activeCatalog === 'PROVEEDORES') {
      editarProveedor(fila, {
        nombre: catalogsNewName,
        direccion: catalogsNewAddress,
        referencia: catalogsNewRefOrSiglas
      });
    } else if (activeCatalog === 'TIENDAS') {
      editarTienda(fila, {
        nombre: catalogsNewName,
        direccion: catalogsNewAddress,
        siglas: catalogsNewRefOrSiglas
      });
    }

    setCatalogsNewName('');
    setCatalogsNewAddress('');
    setCatalogsNewRefOrSiglas('');
    setEditingItemIdx(null);
  };

  const handleCatalogDelete = (idx: number) => {
    const confirm = window.confirm('¿Está seguro de eliminar este registro del catálogo de forma permanente?');
    if (!confirm) return;

    const fila = idx + 2;
    if (activeCatalog === 'CHOFERES') {
      eliminarChofer(fila);
    } else if (activeCatalog === 'PROVEEDORES') {
      eliminarProveedor(fila);
    } else if (activeCatalog === 'TIENDAS') {
      eliminarTienda(fila);
    }
  };

  const handleEditProvChange = (val: string) => {
    setEditProvNombre(val);
    if (val.length > 1) {
      const match = proveedores.filter(p => p.nombre.toUpperCase().includes(val.toUpperCase()));
      setEditSugProvs(match);
    } else {
      setEditSugProvs([]);
    }
  };

  const selectEditProvSug = (prov: any) => {
    setEditProvNombre(prov.nombre);
    setEditDireccionRec(prov.direccion);
    setEditRefRec(prov.referencia || '');
    setEditSugProvs([]);
  };

  // Filterning logic corresponding to Modulo_Compras.gs
  const filterPedidos = pedidos.filter(p => {
    // Exclusion criteria
    if (p.ticket.toUpperCase().startsWith('REC-') && p.tienda.toUpperCase() === 'LOGISTICA') return false;
    
    // Inclusion criteria: Allowed statuses inside purchasing
    const permitidos = ["CARGADO", "PENDIENTE", "EN PROCESO / COMPRA", "PARCIAL", "ENTREGA INMEDIATA", "PROGRAMADO", "EN RUTA", "REVISADO"];
    return permitidos.includes(p.estatus.toUpperCase());
  });

  const displayPedidos = filterPedidos.filter(p => {
    const q = buscarPed.toLowerCase();
    return p.ticket.toLowerCase().includes(q) ||
           p.tienda.toLowerCase().includes(q) ||
           p.estatus.toLowerCase().includes(q) ||
           (p.comprasObs || '').toLowerCase().includes(q) ||
           (p.obs || '').toLowerCase().includes(q);
  });

  const filterRecs = recolecciones.filter(r => r.solicitante === 'COMPRAS');
  const displayRecs = filterRecs.filter(r => {
    const q = buscarRec.toLowerCase();
    return r.id.toLowerCase().includes(q) ||
           r.proveedor.toLowerCase().includes(q) ||
           r.material.toLowerCase().includes(q) ||
           r.estatus.toLowerCase().includes(q);
  });

  const handleOpenDictamen = (p: Pedido) => {
    setSelectedPedido(p);
    const validStatuses = ["EN PROCESO / COMPRA", "ENTREGA INMEDIATA"];
    setDictamenEst(validStatuses.includes(p.estatus) ? p.estatus : "EN PROCESO / COMPRA");
    setDictamenObs(p.comprasObs || '');
    setDictamenUbic(p.comprasUbic || '');
    setDictamenOpen(true);
  };

  const handleDictamenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedido) return;

    const res = guardarDictamenCompras({
      ticket: selectedPedido.ticket,
      estatus: dictamenEst,
      comprasObs: dictamenObs,
      comprasUbic: dictamenUbic
    });

    if (res.success) {
      setDictamenOpen(false);
    } else {
      alert(res.error || 'No se pudo guardar el dictamen');
    }
  };

  const handleOpenEditRec = (r: Recoleccion) => {
    setEditingRec(r);
    setEditProvNombre(r.proveedor);
    setEditDireccionRec(r.direccion);
    setEditRefRec(r.referencias || '');
    setEditMaterialRec(r.material);
    setEditFechaRec(r.fechaDisponible);
    setEditCaptura(r.captura || '');
    setEditSugProvs([]);
  };

  const handleOpenNuevaRec = () => {
    setFolioRec('');
    setProvNombre('');
    setDireccionRec('');
    setRefRec('');
    setMaterialRec('');
    setFechaRec('');
    setNuevaRecCaptura('');
    setMsgError('');
    setNuevaRecOpen(true);
  };

  const handleProvChange = (val: string) => {
    setProvNombre(val);
    if (val.length > 1) {
      const match = proveedores.filter(p => p.nombre.toUpperCase().includes(val.toUpperCase()));
      setSugProvs(match);
    } else {
      setSugProvs([]);
    }
  };

  const selectProvSug = (prov: any) => {
    setProvNombre(prov.nombre);
    setDireccionRec(prov.direccion);
    setRefRec(prov.referencia);
    setSugProvs([]);
  };

  const handleNuevaRecSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsgError('');

    if (!folioRec.trim()) {
      setMsgError('Folio es obligatorio');
      return;
    }

    const recId = `REC-${folioRec.trim().toUpperCase()}`;

    const res = guardarSolicitudDesdeCompras({
      idRec: recId,
      proveedor: provNombre,
      direccion: direccionRec,
      referencias: refRec,
      material: materialRec,
      fechaDisponible: fechaRec,
      captura: nuevaRecCaptura
    });

    if (res.success) {
      setNuevaRecOpen(false);
    } else {
      setMsgError(res.error || 'Ocurrió un error al guardar');
    }
  };

  return (
    <div className="space-y-6">
      {/* Tab Selectors & Main Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/40 p-3 rounded-xl border border-slate-800">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 w-full sm:w-auto">
          <button 
            onClick={() => setActiveTab('PEDIDOS')}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto ${
              activeTab === 'PEDIDOS' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Clipboard size={14} />
            Pedidos de Tiendas
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
              activeTab === 'PEDIDOS' ? 'bg-amber-950/20 text-slate-900' : 'bg-slate-900 text-slate-500'
            }`}>
              {pedidos.length}
            </span>
          </button>
          <button 
            onClick={() => setActiveTab('RECOLECCIONES')}
            className={`flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full sm:w-auto ${
              activeTab === 'RECOLECCIONES' ? 'bg-amber-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Truck size={14} />
            Recolecciones
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full transition-all ${
              activeTab === 'RECOLECCIONES' ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-900 text-slate-500'
            }`}>
              {recolecciones.length}
            </span>
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto text-right">
          <button 
            onClick={handleOpenNuevaRec}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-lg text-xs tracking-wide uppercase transition inline-flex items-center gap-1.5 w-full sm:w-auto justify-center cursor-pointer shadow-lg shadow-amber-950/20"
          >
            <Plus size={14} />
            Nueva Recolección
          </button>

          <div className="relative w-full sm:w-auto">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="bg-slate-850 hover:bg-slate-805 border border-slate-700 hover:text-amber-400 text-slate-300 font-bold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs uppercase w-full sm:w-auto cursor-pointer"
            >
              <Settings size={15} />
              🔧 Catálogos
            </button>

            {/* Dropdown Menu */}
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-800 text-left">
                <span className="block px-4 py-2 text-[10px] text-amber-500 font-black tracking-widest uppercase">
                  ADMINISTRAR
                </span>
                <button 
                  onClick={() => { setActiveCatalog('CHOFERES'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-805 flex items-center gap-2"
                >
                  🚚 Choferes
                </button>
                <button 
                  onClick={() => { setActiveCatalog('PROVEEDORES'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-855 flex items-center gap-2"
                >
                  🏢 Proveedores
                </button>
                <button 
                  onClick={() => { setActiveCatalog('TIENDAS'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-855 flex items-center gap-2"
                >
                  🏪 Tiendas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SEARCH AND GRID - VIEW CONDITIONAL RENDERS */}
      {activeTab === 'PEDIDOS' ? (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input 
              type="text" 
              placeholder="Buscar por ticket, tienda, origen..."
              value={buscarPed}
              onChange={(e) => setBuscarPed(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {displayPedidos.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-1 rounded">
                {displayPedidos.length} REGISTROS
              </span>
            )}
          </div>

          {displayPedidos.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/10 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs">
              No hay pedidos que requiren dictamen o atención de compras.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayPedidos.map((p) => {
                const isParcial = p.tipo.toUpperCase().includes('PARCIAL');
                const hasFoto = p.fotoUrl && p.fotoUrl.trim() !== '';

                return (
                  <div key={p.ticket} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700/60 transition shadow">
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded">
                            {p.ticket}
                          </span>
                          <p className="text-[10px] text-slate-450 mt-1">F. Creación: {formatedDisplayDateTime(p.fecha)}</p>
                        </div>
                        
                        {/* Status Badge */}
                        <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                          p.estatus === 'CARGADO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/60' :
                          p.estatus === 'PENDIENTE' ? 'bg-amber-950 text-amber-400 border border-amber-905' :
                          p.estatus === 'PROGRAMADO' ? 'bg-amber-950 text-amber-450 border border-amber-900' :
                          p.estatus === 'REVISADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          {p.estatus}
                        </span>
                      </div>

                      <div>
                        <span className="text-[10px] bg-slate-800 text-amber-400 font-extrabold px-2 py-0.5 rounded uppercase">
                          🏦 ORIGEN: {p.tienda}
                        </span>
                        <h4 className="font-bold text-slate-100 text-base mt-2">{p.cliente}</h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                          <MapPin size={11} className="text-rose-400 shrink-0" />
                          {p.dir}
                        </p>
                      </div>

                      {p.obs && (
                        <div className="bg-slate-900/60 p-2.5 rounded text-xs text-slate-300 border border-slate-800/40">
                          <p className="font-bold text-[10px] text-amber-500 uppercase">Obs Tienda:</p>
                          <p className="mt-0.5 whitespace-pre-wrap break-words">{p.obs}</p>
                        </div>
                      )}

                      {/* Dictamen purchases current values */}
                      {(p.comprasObs || p.comprasUbic) && (
                        <div className="bg-amber-950/10 p-2.5 rounded-lg border border-amber-900/20 text-xs text-slate-300 space-y-1">
                          {p.comprasObs && (
                            <p><span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">Nota Compras:</span> <span className="whitespace-pre-wrap break-words block">{p.comprasObs}</span></p>
                          )}
                          {p.comprasUbic && (
                            <p><span className="text-[10px] uppercase font-bold text-amber-400 block mb-0.5">Ubi. material:</span> <span className="whitespace-pre-wrap break-words block">{p.comprasUbic}</span></p>
                          )}
                        </div>
                      )}

                      <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80">
                        <span className="text-slate-400 flex items-center gap-1">
                          <FileText size={12} className="text-slate-500" />
                          {p.tipo}
                        </span>

                        {isParcial && hasFoto && (
                          <button 
                            type="button"
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
                            className="text-emerald-400 text-[10px] font-bold bg-emerald-950/50 border border-emerald-900 px-2 py-1 rounded inline-flex items-center gap-0.5 cursor-pointer hover:bg-emerald-900/60 transition"
                          >
                            👁️ VER TICKET
                          </button>
                        )}
                      </div>
                    </div>

                    <button 
                      onClick={() => handleOpenDictamen(p)}
                      className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:text-white text-slate-200 font-bold py-2 px-3 rounded-lg text-xs mt-4 transition cursor-pointer"
                    >
                      EDITAR DICTAMEN / NOTAS 🛒
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
            <input 
              type="text" 
              placeholder="Buscar por ID, proveedor, material..."
              value={buscarRec}
              onChange={(e) => setBuscarRec(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
            {displayRecs.length > 0 && (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] bg-slate-800 text-slate-400 font-bold px-2 py-1 rounded">
                {displayRecs.length} REGISTROS
              </span>
            )}
          </div>

          {displayRecs.length === 0 ? (
            <div className="text-center py-16 bg-slate-800/10 border border-dashed border-slate-800 rounded-xl text-slate-400 text-xs text-slate-400">
              No hay solicitudes de recolección creadas por Compras.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {displayRecs.map((r) => (
                <div key={r.id} className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 hover:border-slate-700/65 transition shadow flex flex-col justify-between">
                  <div className="space-y-3.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-400">
                          {r.id}
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1">F. Creación: {formatedDisplayDateTime(r.fechaAlta)}</p>
                      </div>

                      {/* Recollection Tracker Status Badge */}
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full ${
                        r.estatus === 'SOLICITADO' ? 'bg-amber-950/40 text-amber-400 border border-amber-900' :
                        r.estatus === 'PENDIENTE' ? 'bg-yellow-950 text-yellow-500 border border-yellow-900' :
                        r.estatus === 'REVISADO' ? 'bg-slate-800 text-slate-300 border border-slate-700' :
                        r.estatus === 'PROGRAMADO' ? 'bg-sky-950 text-sky-400 border border-sky-900' :
                        r.estatus === 'EN RUTA' ? 'bg-teal-950 text-teal-400 border border-teal-900' :
                        r.estatus === 'FINALIZADO' || r.estatus === 'RECOLECTADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {r.estatus}
                      </span>
                    </div>

                    <div>
                      <h4 className="font-bold text-slate-100 text-base">{r.proveedor}</h4>
                      <p className="text-xs text-slate-400 mt-1 flex items-start gap-1">
                        <MapPin size={11} className="text-rose-450 shrink-0 mt-0.5" />
                        <span>{r.direccion}</span>
                      </p>
                      {r.referencias && (
                        <p className="text-[11px] text-teal-400 mt-1.5 ml-4">Ref: {r.referencias}</p>
                      )}
                    </div>

                    <div className="bg-slate-900/60 p-3 rounded text-xs border border-slate-800/40 text-slate-300">
                      <p className="font-bold text-[10px] text-slate-500 uppercase">Material Solicitado:</p>
                      <p className="mt-0.5 leading-relaxed">{r.material}</p>
                    </div>

                    <div className="flex gap-2 text-[10px] text-teal-300 bg-teal-950/20 p-2.5 rounded-lg border border-teal-900/30">
                      <span className="font-bold shrink-0">📅 DISPONIBLE DESDE:</span>
                      <span className="bg-teal-950 rounded px-1.5 text-slate-100 border border-teal-900">{formatedDisplayDate(r.fechaDisponible)}</span>
                    </div>

                    {r.chofer && (
                      <div className="text-[11px] bg-amber-950/10 text-amber-300 p-2 rounded-lg border border-amber-900/20 flex justify-between items-center">
                        <span className="font-bold">🚚 Chofer: {r.chofer}</span>
                        {r.fechaReal && (
                          <span className="bg-amber-950 border border-amber-900 rounded px-1.5 py-0.5 text-slate-100">
                            Recol.: {formatedDisplayDate(r.fechaReal)}
                          </span>
                        )}
                      </div>
                    )}

                    {r.captura && r.captura.trim() !== '' && (
                      <button 
                        type="button"
                        onClick={() => {
                          Swal.fire({
                            title: `Captura de Pantalla: ${r.id}`,
                            imageUrl: r.captura,
                            imageAlt: `Captura ${r.id}`,
                            background: '#0d1b2a',
                            color: '#fff',
                            confirmButtonColor: '#0ea5e9',
                            confirmButtonText: 'Cerrar'
                          });
                        }}
                        className="w-full text-amber-400 text-[10px] font-bold bg-amber-950/50 border border-amber-900 px-2 py-2 rounded inline-flex items-center justify-center gap-1 cursor-pointer hover:bg-amber-900/60 transition"
                      >
                        👁️ VER CAPTURA DE PANTALLA
                      </button>
                    )}
                  </div>

                  <button 
                    onClick={() => handleOpenEditRec(r)}
                    className="w-full bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white font-bold py-2 px-3 rounded-lg text-xs mt-4 transition cursor-pointer"
                  >
                    EDITAR RECOLECCIÓN 🛒
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

       {/* DICTAMEN PURCHASES EDIT MODAL */}
      {dictamenOpen && selectedPedido && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setDictamenOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-lg font-display uppercase tracking-wide">
                Dictamen Compras
              </h2>
              <button onClick={() => setDictamenOpen(false)} className="text-slate-400 hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleDictamenSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div className="bg-amber-950/20 p-3.5 border border-amber-900/40 rounded-xl text-center shrink-0">
                <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Ticket Seleccionado</label>
                <p className="font-mono text-lg font-bold text-slate-100">{selectedPedido.ticket}</p>
                <p className="text-[11px] text-slate-400 mt-1">Cliente: {selectedPedido.cliente}</p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Estatus Dictamen</label>
                <select 
                  value={dictamenEst}
                  onChange={(e) => setDictamenEst(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="EN PROCESO / COMPRA">EN PROCESO / COMPRA</option>
                  <option value="ENTREGA INMEDIATA">ENTREGA INMEDIATA</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Notas Compras</label>
                <textarea 
                  placeholder="Detalles sobre compras del material, fecha estimada de recibimiento, etc..."
                  value={dictamenObs}
                  onChange={(e) => setDictamenObs(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Ubicación de Material</label>
                <input 
                  type="text" 
                  placeholder="Bodega A, Pasillo 4, etc."
                  value={dictamenUbic}
                  onChange={(e) => setDictamenUbic(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-2 pb-1 shrink-0">
                <button 
                  type="submit"
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition shadow-lg shadow-amber-950/20 cursor-pointer"
                >
                  ACTUALIZAR REGISTRO 🛒
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* NUEVA RECOLECCION BUILDER MODAL */}
      {nuevaRecOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setNuevaRecOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-sm tracking-widest font-display uppercase text-amber-500">
                Solicitud de Recolección
              </h2>
              <button onClick={() => setNuevaRecOpen(false)} className="text-slate-400 hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleNuevaRecSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              {msgError && (
                <div className="bg-rose-950/40 text-rose-400 border border-rose-900 p-3 rounded-lg text-xs font-semibold">
                  {msgError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Folio de Recolección</label>
                <div className="flex">
                  <span className="bg-slate-800 text-slate-300 px-3 py-2 border border-slate-700 rounded-l-lg text-sm font-bold flex items-center font-mono">
                    REC-
                  </span>
                  <input 
                    type="text" 
                    placeholder="Ej: H23R"
                    value={folioRec}
                    onChange={(e) => setFolioRec(e.target.value)}
                    required
                    className="w-full bg-slate-900 border-y border-r border-slate-700 rounded-r-lg text-sm text-slate-100 p-2 focus:outline-none focus:ring-1 focus:ring-amber-500 uppercase font-bold"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">El prefijo "REC-" se añade automáticamente.</p>
              </div>

              {/* Supplier Search Auto-Match Autocomplete input */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Proveedor</label>
                <input 
                  type="text" 
                  placeholder="ACEROS DE SANTA CLARA"
                  value={provNombre}
                  onChange={(e) => handleProvChange(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                {sugProvs.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-750 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-800">
                    {sugProvs.map((pr, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectProvSug(pr)}
                        className="p-2.5 hover:bg-slate-700/60 cursor-pointer text-xs transition first:rounded-t-lg last:rounded-b-lg"
                      >
                        <p className="font-bold text-slate-100">{pr.nombre}</p>
                        <p className="text-slate-400 text-[10px] truncate">{pr.direccion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-amber-950/10 p-3.5 rounded-xl border border-amber-900/20 space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Dirección de Recolección</label>
                    <a 
                      href="https://www.google.com/maps" 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-[11px] font-bold text-amber-400 hover:underline flex items-center gap-0.5"
                    >
                      🗺️ Google Maps
                    </a>
                  </div>
                  <textarea 
                    placeholder="Pega la dirección de recolección..."
                    value={direccionRec}
                    onChange={(e) => setDireccionRec(e.target.value)}
                    required
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Referencias</label>
                  <input 
                    type="text" 
                    placeholder="Portón amarillo, junto a refaccionaria, etc..."
                    value={refRec}
                    onChange={(e) => setRefRec(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Material a Traer</label>
                <textarea 
                  placeholder="Detalla barras, toneladas, cajas de herramientas..."
                  value={materialRec}
                  onChange={(e) => setMaterialRec(e.target.value)}
                  required
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Fecha Disponible</label>
                <input 
                  type="date" 
                  value={fechaRec}
                  onChange={(e) => setFechaRec(e.target.value)}
                  required
                  onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                  onFocus={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex justify-between">
                  Captura de Pantalla
                  {nuevaRecCapturaLoading && <span className="text-[10px] text-amber-400 font-bold">Procesando...</span>}
                </label>
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {nuevaRecCaptura ? (
                      <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 leading-normal truncate">
                        ✔ CAPTURA LISTA ({Math.round(nuevaRecCaptura.length / 1024)} KB)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] leading-normal block">
                        Sube un screenshot del material, factura, etc.
                      </span>
                    )}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => document.getElementById('comprasScreenshotUpload')?.click()}
                    className="bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/50 hover:border-amber-800 text-amber-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer tracking-wide uppercase transition inline-flex items-center gap-1 shadow"
                  >
                    <Upload size={13} />
                    {nuevaRecCaptura ? 'Cambiar' : 'Subir'}
                  </button>
                  
                  <input 
                    type="file" 
                    id="comprasScreenshotUpload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNuevaRecCapturaLoading(true);
                        try {
                          const base64 = await compressBase64Image(file);
                          setNuevaRecCaptura(base64);
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
                          setNuevaRecCapturaLoading(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={nuevaRecCapturaLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition shadow-lg shadow-amber-950/20 cursor-pointer"
                >
                  ENVIAR A LOGÍSTICA 🚚
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDITAR RECOLECCIÓN MODAL */}
      {editingRec && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEditingRec(null); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-8 cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-sm tracking-widest font-display uppercase text-amber-500 flex items-center gap-1.5">
                Editar Solicitud - {editingRec.id}
              </h2>
              <button onClick={() => setEditingRec(null)} className="text-slate-400 hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <form 
              onSubmit={(e) => {
                e.preventDefault();
                const res = modificarRecoleccionAdmin({
                  id: editingRec.id,
                  proveedor: editProvNombre,
                  direccion: editDireccionRec,
                  referencias: editRefRec,
                  material: editMaterialRec,
                  fechaDisp: editFechaRec,
                  captura: editCaptura
                });
                if (res.success) {
                  setEditingRec(null);
                  Swal.fire({
                    icon: 'success',
                    title: 'Recolección Modificada',
                    text: 'Los cambios fueron aplicados y guardados de forma segura.',
                    background: '#0d1b2a',
                    color: '#fff',
                    timer: 2000,
                    showConfirmButton: false
                  });
                } else {
                  Swal.fire({
                    icon: 'error',
                    title: 'Error al Guardar',
                    text: res.error || 'No se pudo guardar la recolección.',
                    background: '#0d1b2a',
                    color: '#fff'
                  });
                }
              }} 
              className="p-6 space-y-4 overflow-y-auto flex-grow"
            >
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Proveedor</label>
                <input 
                  type="text" 
                  value={editProvNombre}
                  onChange={(e) => handleEditProvChange(e.target.value)}
                  required
                  placeholder="Escribe el nombre del proveedor..."
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                {editSugProvs.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-750 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-800">
                    {editSugProvs.map((pr, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectEditProvSug(pr)}
                        className="p-2.5 hover:bg-slate-700/60 cursor-pointer text-xs transition first:rounded-t-lg last:rounded-b-lg text-left"
                      >
                        <p className="font-bold text-slate-100">{pr.nombre}</p>
                        <p className="text-slate-400 text-[10px] truncate">{pr.direccion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-amber-950/10 p-3.5 rounded-xl border border-amber-900/20 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Dirección de Recolección</label>
                  <textarea 
                    value={editDireccionRec}
                    onChange={(e) => setEditDireccionRec(e.target.value)}
                    required
                    rows={2}
                    className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Referencias</label>
                  <input 
                    type="text" 
                    value={editRefRec}
                    onChange={(e) => setEditRefRec(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Material a Traer</label>
                <textarea 
                  value={editMaterialRec}
                  onChange={(e) => setEditMaterialRec(e.target.value)}
                  required
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Fecha Disponible</label>
                <input 
                  type="date" 
                  value={editFechaRec}
                  onChange={(e) => setEditFechaRec(e.target.value)}
                  required
                  onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                  onFocus={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                  style={{ colorScheme: 'dark' }}
                  className="w-full bg-slate-900 border border-slate-750 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 flex justify-between">
                  Modificar Captura de Pantalla
                  {editCapturaLoading && <span className="text-[10px] text-amber-400 font-bold">Procesando...</span>}
                </label>
                
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    {editCaptura ? (
                      <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 leading-normal truncate">
                        ✔ CAPTURA LISTA ({Math.round(editCaptura.length / 1024)} KB)
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[11px] leading-normal block">
                        Sube un nuevo screenshot si deseas cambiarlo.
                      </span>
                    )}
                  </div>
                  
                  <button 
                    type="button"
                    onClick={() => document.getElementById('comprasScreenshotUploadEdit')?.click()}
                    className="bg-amber-950/40 hover:bg-amber-900/40 border border-amber-900/50 hover:border-amber-800 text-amber-300 font-bold px-3 py-2 rounded-lg text-xs cursor-pointer tracking-wide uppercase transition inline-flex items-center gap-1 shadow"
                  >
                    <Upload size={13} />
                    {editCaptura ? 'Cambiar' : 'Subir'}
                  </button>
                  
                  <input 
                    type="file" 
                    id="comprasScreenshotUploadEdit" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setEditCapturaLoading(true);
                        try {
                          const base64 = await compressBase64Image(file);
                          setEditCaptura(base64);
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
                          setEditCapturaLoading(false);
                        }
                      }
                    }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit"
                  disabled={editCapturaLoading}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition shadow-lg shadow-amber-950/20 cursor-pointer"
                >
                  GUARDAR CAMBIOS 🚚
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CATALOG DIRECTORY CRUD INNER DRAWER / INTERACTIVE POPUP */}
      {activeCatalog && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setActiveCatalog(null); setEditingItemIdx(null); } }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] my-8 cursor-default">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="font-bold text-slate-100 text-lg uppercase tracking-wide flex items-center gap-1.5">
                ⚙️ Catálogos: {activeCatalog}
              </h3>
              <button 
                onClick={() => { setActiveCatalog(null); setEditingItemIdx(null); }} 
                className="text-slate-400 hover:text-slate-100 cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Catalog inline Builder forms */}
            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/80 mb-4 space-y-3 shrink-0">
              <h4 className="text-xs uppercase font-extrabold text-amber-500 tracking-wider">
                {editingItemIdx !== null ? 'Modificar Registro Seleccionado' : 'Añadir Nuevo Registro al Catálogo'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  placeholder={activeCatalog === 'CHOFERES' ? 'Nombre del Chofer' : activeCatalog === 'PROVEEDORES' ? 'Nombre del Proveedor' : 'Nombre de la Tienda'}
                  value={catalogsNewName}
                  onChange={(e) => setCatalogsNewName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />

                {activeCatalog !== 'CHOFERES' && (
                  <input 
                    type="text" 
                    placeholder="Dirección Física Completa"
                    value={catalogsNewAddress}
                    onChange={(e) => setCatalogsNewAddress(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}

                {activeCatalog !== 'CHOFERES' && (
                  <input 
                    type="text" 
                    placeholder={activeCatalog === 'PROVEEDORES' ? 'Referencias de ubicación' : 'Siglas (Ej: TIV)'}
                    value={catalogsNewRefOrSiglas}
                    onChange={(e) => setCatalogsNewRefOrSiglas(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                )}
              </div>

              <div className="flex gap-2 justify-end pt-1">
                {editingItemIdx !== null ? (
                  <>
                    <button 
                      onClick={() => handleCatalogUpdateClick(editingItemIdx)}
                      className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shadow"
                    >
                      Actualizar
                    </button>
                    <button 
                      onClick={() => { setEditingItemIdx(null); setCatalogsNewName(''); setCatalogsNewAddress(''); setCatalogsNewRefOrSiglas(''); }}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={handleCatalogAddClick}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shadow flex items-center gap-1.5"
                  >
                    <Plus size={13} />
                    Guardar Registro
                  </button>
                )}
              </div>
            </div>

            {/* Catalog inline Table directories list */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                    {activeCatalog === 'CHOFERES' ? (
                      <th className="py-2.5 px-3">Nombre del Chofer</th>
                    ) : activeCatalog === 'PROVEEDORES' ? (
                      <>
                        <th className="py-2.5 px-3">Proveedor</th>
                        <th className="py-2.5 px-3">Dirección Completa</th>
                        <th className="py-2.5 px-3">Referencias</th>
                      </>
                    ) : (
                      <>
                        <th className="py-2.5 px-3">Tienda</th>
                        <th className="py-2.5 px-3">Dirección</th>
                        <th className="py-2.5 px-3">Siglas</th>
                      </>
                    )}
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs text-slate-300">
                  {activeCatalog === 'CHOFERES' ? (
                    choferes.map((ch, i) => (
                      <tr key={ch.id || i} className="hover:bg-slate-850/20">
                        <td className="py-3 px-3 font-semibold text-slate-100">{ch.nombre}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleCatalogEditClick(i, ch.nombre)} className="text-amber-400 hover:bg-amber-950/40 p-1.5 rounded cursor-pointer"><Edit2 size={13} /></button>
                            <button onClick={() => handleCatalogDelete(i)} className="text-rose-400 hover:bg-rose-950/45 p-1.5 rounded cursor-pointer"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : activeCatalog === 'PROVEEDORES' ? (
                    proveedores.map((pv, i) => (
                      <tr key={i} className="hover:bg-slate-850/20">
                        <td className="py-3 px-3 font-semibold text-slate-100">{pv.nombre}</td>
                        <td className="py-3 px-3 max-w-xs truncate">{pv.direccion}</td>
                        <td className="py-3 px-3 max-w-[150px] truncate">{pv.referencia}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleCatalogEditClick(i, pv)} className="text-amber-400 hover:bg-amber-950/40 p-1.5 rounded cursor-pointer"><Edit2 size={13} /></button>
                            <button onClick={() => handleCatalogDelete(i)} className="text-rose-400 hover:bg-rose-950/45 p-1.5 rounded cursor-pointer"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    tiendas.map((t, i) => (
                      <tr key={t.nombre || i} className="hover:bg-slate-850/20">
                        <td className="py-3 px-3 font-semibold text-slate-100">{t.nombre}</td>
                        <td className="py-3 px-3 max-w-xs truncate">{t.direccion}</td>
                        <td className="py-3 px-3 font-mono text-amber-500 font-bold">{t.siglas}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleCatalogEditClick(i, t)} className="text-amber-400 hover:bg-amber-950/40 p-1.5 rounded cursor-pointer"><Edit2 size={13} /></button>
                            <button onClick={() => handleCatalogDelete(i)} className="text-rose-400 hover:bg-rose-950/45 p-1.5 rounded cursor-pointer"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
