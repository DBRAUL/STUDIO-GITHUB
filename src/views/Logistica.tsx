/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { useLogistika, formatedDisplayDate, formatedDisplayDateTime, normalizarFecha } from '../context/LogistikaContext';
import { Pedido, Recoleccion, ChoferConfig, ProveedorConfig, TiendaConfig } from '../types';
import { Truck, MapPin, Search, Plus, Settings, Eye, Clock, Calendar, CheckCircle2, ChevronRight, X, Edit2, Trash2, Camera, FileText } from 'lucide-react';
import Swal from 'sweetalert2';

export const Logistica: React.FC = () => {
  const {
    pedidos,
    recolecciones,
    choferes,
    proveedores,
    tiendas,
    guardarServicioConOrden,
    obtenerSiguienteOrdenGlobal,
    crearNuevaRecoleccion,
    obtenerProyeccionRuta,
    // CRUD wrappers
    agregarChofer, editarChofer, eliminarChofer,
    agregarProveedor, editarProveedor, eliminarProveedor,
    agregarTienda, editarTienda, eliminarTienda
  } = useLogistika();

  const [activeTab, setActiveTab] = useState<'ENTREGAS' | 'RECOLECCIONES'>('ENTREGAS');
  const [buscar, setBuscar] = useState('');

  // Settings dropdown
  const [showSettings, setShowSettings] = useState(false);
  const [activeCatalog, setActiveCatalog] = useState<'CHOFERES' | 'PROVEEDORES' | 'TIENDAS' | null>(null);

  // Assignment Modal States
  const [entregasModalOpen, setEntregasModalOpen] = useState(false);
  const [selectedPedido, setSelectedPedido] = useState<Pedido | null>(null);
  const [editFechaEnvio, setEditFechaEnvio] = useState('');
  const [editChofer, setEditChofer] = useState('');
  const [editEstatusLog, setEditEstatusLog] = useState('REVISADO');
  const [editOrden, setEditOrden] = useState<number | ''>('');
  const [editObsLog, setEditObsLog] = useState('');

  // Assignment Recoleccion Modal States
  const [recsModalOpen, setRecsModalOpen] = useState(false);
  const [selectedRec, setSelectedRec] = useState<Recoleccion | null>(null);
  const [editChoferRec, setEditChoferRec] = useState('');
  const [editFechaRec, setEditFechaRec] = useState('');
  const [editEstatusRec, setEditEstatusRec] = useState('REVISADO');
  const [editOrdenRec, setEditOrdenRec] = useState<number | ''>('');

  // Nueva Recolección Modal
  const [nuevaRecOpen, setNuevaRecOpen] = useState(false);
  const [newFolio, setNewFolio] = useState('');
  const [newProveedor, setNewProveedor] = useState('');
  const [newDireccion, setNewDireccion] = useState('');
  const [newReferencias, setNewReferencias] = useState('');
  const [newMaterial, setNewMaterial] = useState('');
  const [sugProvs, setSugProvs] = useState<any[]>([]);

  // Proy / Cronograma modal
  const [cronoOpen, setCronoOpen] = useState(false);
  const [cronoChofer, setCronoChofer] = useState('');
  const [cronoData, setCronoData] = useState<any>(null);

  // Catalog CRUD Modal Helper states
  const [catalogsNewName, setCatalogsNewName] = useState('');
  const [catalogsNewAddress, setCatalogsNewAddress] = useState('');
  const [catalogsNewRefOrSiglas, setCatalogsNewRefOrSiglas] = useState('');
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);

  // Filtering list based on sheet logic
  const displayPedidos = pedidos.filter(p => {
    // Only matching pending logistics statuses
    const estatusPermitidos = ["CARGADO", "ENTREGA INMEDIATA", "REVISADO", "PROGRAMADO", "EN RUTA", "FINALIZADO", "EN PROCESO / COMPRA", "PARCIAL", "PENDIENTE"];
    return estatusPermitidos.includes(p.estatus.toUpperCase());
  }).filter(p => {
    const q = buscar.toLowerCase();
    return p.ticket.toLowerCase().includes(q) ||
           p.tienda.toLowerCase().includes(q) ||
           p.cliente.toLowerCase().includes(q) ||
           p.estatus.toLowerCase().includes(q) ||
           (p.chofer || '').toLowerCase().includes(q);
  });

  const displayRecs = recolecciones.filter(r => {
    const q = buscar.toLowerCase();
    return r.id.toLowerCase().includes(q) ||
           r.proveedor.toLowerCase().includes(q) ||
           r.material.toLowerCase().includes(q) ||
           r.estatus.toLowerCase().includes(q) ||
           (r.chofer || '').toLowerCase().includes(q);
  });

  // OPEN EDIT FOR DELIVERY SERVICES
  const handleOpenEntrega = (p: Pedido) => {
    setSelectedPedido(p);
    setEditFechaEnvio(p.dateenv || '');
    setEditChofer(p.chofer || '');
    setEditEstatusLog(p.estatus);
    setEditOrden(p.orden || '');
    setEditObsLog(p.obsLogistica || '');
    setEntregasModalOpen(true);
  };

  const handleEntregaChangeDriver = (chofer: string, fecha?: string) => {
    setEditChofer(chofer);
    if (fecha !== undefined) {
      setEditFechaEnvio(fecha);
    }
    const targetFecha = fecha !== undefined ? fecha : editFechaEnvio;
    if (chofer && targetFecha) {
      const sig = obtenerSiguienteOrdenGlobal(chofer, targetFecha);
      setEditOrden(sig <= 10 ? sig : '');
    }
  };

  const handleEntregaSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPedido) return;

    if (editEstatusLog !== 'REVISADO' && (!editChofer || !editFechaEnvio)) {
      alert('Chofer y Fecha de Envío son obligatorios para programar la entrega');
      return;
    }

    const res = guardarServicioConOrden({
      id: selectedPedido.ticket,
      hoja: 'ENTREGAS',
      chofer: editChofer,
      fecha: editFechaEnvio,
      estatus: editEstatusLog,
      orden: editOrden,
      obs: editObsLog
    });

    if (res.ok) {
      setEntregasModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: '¡Ruta Guardada!',
        text: `Secuencia de servicio: ${res.ordenFinal || 'Sin orden'}`,
        timer: 1500,
        showConfirmButton: false,
        background: '#0d1b2a',
        color: '#f8fafc'
      });
    } else {
      alert(res.msg || 'No se pudo programar el envío');
    }
  };

  // OPEN EDIT FOR RECOLLECTIONS SERVICES
  const handleOpenRec = (r: Recoleccion) => {
    setSelectedRec(r);
    setEditChoferRec(r.chofer || '');
    // Translate date display safely
    setEditFechaRec(r.fechaReal || r.fechaDisponible || '');
    setEditEstatusRec(r.estatus);
    setEditOrdenRec(r.orden || '');
    setRecsModalOpen(true);
  };

  const handleRecChangeDriver = (chofer: string, fecha?: string) => {
    setEditChoferRec(chofer);
    if (fecha !== undefined) {
      setEditFechaRec(fecha);
    }
    const targetFecha = fecha !== undefined ? fecha : editFechaRec;
    if (chofer && targetFecha) {
      const sig = obtenerSiguienteOrdenGlobal(chofer, targetFecha);
      setEditOrdenRec(sig);
    }
  };

  const handleRecSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRec) return;

    if (editEstatusRec !== 'REVISADO' && (!editChoferRec || !editFechaRec)) {
      alert('Chofer y Fecha para recolección son obligatorios para programar');
      return;
    }

    const res = guardarServicioConOrden({
      id: selectedRec.id,
      hoja: 'RECOLECCIONES',
      chofer: editChoferRec,
      fecha: editFechaRec,
      estatus: editEstatusRec,
      orden: editOrdenRec
    });

    if (res.ok) {
      setRecsModalOpen(false);
      Swal.fire({
        icon: 'success',
        title: '¡Recolección Programada!',
        text: `Asignado a chofer: ${editChoferRec}`,
        timer: 1500,
        showConfirmButton: false,
        background: '#0d1b2a',
        color: '#f8fafc'
      });
    } else {
      alert(res.msg || 'No se pudo guardar la recolección');
    }
  };

  // NEW RECOLLECTION BY LOGISTICS
  const handleOpenNuevaRecLog = () => {
    setNewFolio('');
    setNewProveedor('');
    setNewDireccion('');
    setNewReferencias('');
    setNewMaterial('');
    setNuevaRecOpen(true);
  };

  const handleProvLogChange = (val: string) => {
    setNewProveedor(val);
    if (val.length > 1) {
      const match = proveedores.filter(p => p.nombre.toUpperCase().includes(val.toUpperCase()));
      setSugProvs(match);
    } else {
      setSugProvs([]);
    }
  };

  const selectProvLogSug = (p: any) => {
    setNewProveedor(p.nombre);
    setNewDireccion(p.direccion);
    setNewReferencias(p.referencia);
    setSugProvs([]);
  };

  const handleNuevaRecLogSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolio.trim()) return;

    const res = crearNuevaRecoleccion({
      id: `REC-${newFolio.trim().toUpperCase()}`,
      proveedor: newProveedor,
      direccion: newDireccion,
      referencias: newReferencias,
      material: newMaterial,
      solicitante: 'LOGISTICA'
    });

    if (res) {
      setNuevaRecOpen(false);
      Swal.fire({
        icon: 'success',
        title: '¡Recolección Creada!',
        text: 'Agendada en base de datos.',
        timer: 1500,
        showConfirmButton: false,
        background: '#0d1b2a',
        color: '#f8fafc'
      });
    } else {
      alert('Error al guardar recolección');
    }
  };

  // TIMETRUCK PROJECTION TRIGGER
  const handleLaunchSimulation = (chofer: string, targetDate: string) => {
    const res = obtenerProyeccionRuta(chofer, targetDate);
    setCronoChofer(chofer);
    setCronoData(res);
    setCronoOpen(true);
  };

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
    // translate index to 1-indexed Sheet matching row
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

  return (
    <div className="space-y-6">
      {/* Tab Control with Tools */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-3.5 rounded-xl border border-slate-800">
        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800/80 w-full md:w-auto">
          <button 
            onClick={() => { setActiveTab('ENTREGAS'); setBuscar(''); }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full md:w-auto ${
              activeTab === 'ENTREGAS' ? 'bg-teal-600 text-white shadow shadow-teal-900/20' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Truck size={14} />
            Entregas
          </button>
          <button 
            onClick={() => { setActiveTab('RECOLECCIONES'); setBuscar(''); }}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition-all w-full md:w-auto ${
              activeTab === 'RECOLECCIONES' ? 'bg-teal-600 text-white shadow shadow-teal-900/20' : 'text-slate-400 hover:text-slate-100'
            }`}
          >
            <Clock size={14} />
            Recolecciones
          </button>
        </div>

        {/* Adjustments floating toggle bar */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {activeTab === 'RECOLECCIONES' && (
            <button 
              onClick={handleOpenNuevaRecLog}
              className="bg-emerald-600 hover:bg-emerald-555 text-white font-bold py-2.5 px-4 rounded-lg text-xs uppercase tracking-wide transition inline-flex items-center gap-1.5 shrink-0 justify-center cursor-pointer shadow-md"
            >
              <Plus size={14} />
              Nueva Recolección
            </button>
          )}

          <div className="relative w-full md:w-auto">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="bg-slate-850 hover:bg-slate-800 border border-slate-700 hover:text-teal-400 text-slate-300 font-bold p-2.5 rounded-lg flex items-center justify-center gap-1.5 transition text-xs uppercase w-full md:w-auto cursor-pointer"
            >
              <Settings size={15} />
              🔧 Catálogos
            </button>

            {/* Dropdown Menu */}
            {showSettings && (
              <div className="absolute right-0 mt-2 w-48 bg-slate-900 border border-slate-750 rounded-xl shadow-2xl z-40 overflow-hidden divide-y divide-slate-800">
                <span className="block px-4 py-2 text-[10px] text-teal-400 font-black tracking-widest uppercase">
                  ADMINISTRAR
                </span>
                <button 
                  onClick={() => { setActiveCatalog('CHOFERES'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  🚚 Choferes
                </button>
                <button 
                  onClick={() => { setActiveCatalog('PROVEEDORES'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  🏢 Proveedores
                </button>
                <button 
                  onClick={() => { setActiveCatalog('TIENDAS'); setShowSettings(false); }}
                  className="w-full text-left px-4 py-2.5 text-xs text-slate-300 hover:bg-slate-800 flex items-center gap-2"
                >
                  🏪 Tiendas
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FILTER SEARCH INPUT */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={17} />
        <input 
          type="text" 
          placeholder={`Buscar en ${activeTab.toLowerCase()}...`}
          value={buscar}
          onChange={(e) => setBuscar(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 focus:border-teal-500 text-slate-100 rounded-xl py-3 pl-11 pr-4 text-xs focus:outline-none"
        />
      </div>

      {/* RENDER DYNAMIC LIST VIEW FOR ACTIVE TAB */}
      {activeTab === 'ENTREGAS' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayPedidos.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-slate-900/10 border border-dashed border-slate-800 rounded-xl">
              No se encontraron entregas pendientes disponibles para planificación.
            </div>
          ) : (
            displayPedidos.map((p, idx) => {
              const matchesMaps = p.dir.replace(/\(.*?\)/g, '').trim();
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchesMaps)}`;

              return (
                <div key={p.ticket} className="bg-slate-900/40 border border-slate-880/60 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700/80 transition shadow">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-300 bg-slate-800/60 px-2 py-0.5 rounded">
                          {p.ticket}
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1">F. Creación: {formatedDisplayDateTime(p.fecha)}</p>
                      </div>
                      
                      {/* Active Logistics status indicator badge */}
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                        p.estatus === 'CARGADO' ? 'bg-indigo-950 text-indigo-400 border border-indigo-900/60' :
                        p.estatus === 'REVISADO' ? 'bg-slate-850 text-slate-400 border border-slate-750' :
                        p.estatus === 'PROGRAMADO' ? 'bg-amber-950 text-amber-500 border border-amber-900/60' :
                        p.estatus === 'EN RUTA' ? 'bg-teal-950 text-teal-400 border border-teal-900' :
                        p.estatus === 'FINALIZADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {p.estatus}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-start gap-1 pb-1.5 border-b border-slate-800/40">
                        <span className="text-[10px] text-teal-400 font-bold uppercase">{p.tienda}</span>
                        {p.tipo && <span className="text-[10px] text-slate-500 font-semibold">{p.tipo}</span>}
                      </div>

                      <h4 className="font-bold text-slate-100 text-base mt-2">{p.cliente}</h4>
                      <p className="text-xs text-slate-400 mt-1 lines-clamp flex items-start gap-1">
                        <MapPin size={11} className="text-rose-450 shrink-0 mt-0.5" />
                        <span>{p.dir}</span>
                      </p>
                    </div>

                    {/* Meta info fields: Observaciones de Tienda, Notas de Compras, Ubicación Material */}
                    <div className="bg-slate-950/30 border border-slate-850/40 rounded-lg p-2.5 space-y-1.5 text-[11px]">
                      <div className="flex items-start gap-1">
                        <span className="font-bold text-slate-400 shrink-0 w-[110px] uppercase tracking-wider text-[9px]">Obs. Tienda:</span>
                        <span className="text-slate-300 font-medium break-all">{p.obs || <span className="text-slate-600 italic">Sin observaciones</span>}</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="font-bold text-slate-400 shrink-0 w-[110px] uppercase tracking-wider text-[9px]">Notas Compras:</span>
                        <span className="text-amber-400/90 font-medium break-all">{p.comprasObs || <span className="text-slate-600 italic">Sin notas</span>}</span>
                      </div>
                      <div className="flex items-start gap-1">
                        <span className="font-bold text-slate-400 shrink-0 w-[110px] uppercase tracking-wider text-[9px]">Ubic. Material:</span>
                        <span className="text-teal-400 font-mono font-semibold break-all">{p.comprasUbic || <span className="text-slate-600 italic font-normal">Sin ubicación</span>}</span>
                      </div>
                    </div>

                    {/* Logistics planning sequence indicators */}
                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/40 grid grid-cols-3 gap-2 text-center">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Chofer</span>
                        <span className="text-[11px] font-semibold text-slate-200 mt-0.5 block truncate">{p.chofer || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Fecha</span>
                        <span className="text-[11px] font-semibold text-slate-200 mt-0.5 block truncate">{p.dateenv ? formatedDisplayDate(p.dateenv) : '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Orden</span>
                        <span className="text-[11px] font-bold text-amber-500 mt-0.5 block">{p.orden ? `#${p.orden}` : '—'}</span>
                      </div>
                    </div>

                    {p.obsLogistica && (
                      <p className="text-[11px] italic text-slate-400 bg-slate-950/20 p-2 border-l-2 border-slate-705">
                        💡 {p.obsLogistica}
                      </p>
                    )}
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-800 mt-4">
                    <button 
                      onClick={() => handleOpenEntrega(p)}
                      className="bg-slate-800 hover:bg-slate-755 hover:text-white border border-slate-700 text-slate-200 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition shadow"
                    >
                      <Settings size={12} />
                      Asignar Chofer
                    </button>

                    <div className="flex gap-1 shrink-0">
                      {p.chofer && (
                        <button 
                          onClick={() => handleLaunchSimulation(p.chofer || '', p.dateenv || '')}
                          title="Ver Cronograma del Chofer"
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded-lg transition"
                        >
                          <Clock size={14} />
                        </button>
                      )}
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
                      <a 
                        href={mapsUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        title="Ver en Google Maps"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-450 border border-slate-700 rounded-lg transition"
                      >
                        <MapPin size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {displayRecs.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs bg-slate-900/10 border border-dashed border-slate-800 rounded-xl">
              No se encontraron recolecciones activas disponibles para planificación.
            </div>
          ) : (
            displayRecs.map((r, idx) => {
              const matchesMaps = r.direccion.replace(/\(.*?\)/g, '').trim();
              const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(matchesMaps)}`;

              return (
                <div key={r.id} className="bg-slate-900/40 border border-slate-880/60 rounded-xl p-5 flex flex-col justify-between hover:border-slate-700/85 transition shadow">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-500">
                          {r.id}
                        </span>
                        <p className="text-[10px] text-slate-450 mt-1">F. Creación: {formatedDisplayDateTime(r.fechaAlta)}</p>
                      </div>

                      {/* Rec Tracker Badge */}
                      <span className={`text-[9px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full ${
                        r.estatus === 'SOLICITADO' ? 'bg-amber-950/40 text-amber-400 border border-amber-900' :
                        r.estatus === 'PENDIENTE' ? 'bg-yellow-950 text-yellow-500 border border-yellow-900' :
                        r.estatus === 'REVISADO' ? 'bg-slate-850 text-slate-300 border border-slate-750' :
                        r.estatus === 'PROGRAMADO' ? 'bg-sky-950 text-sky-400 border border-sky-900' :
                        r.estatus === 'EN RUTA' ? 'bg-teal-950 text-teal-400 border border-teal-900 font-extrabold' :
                        r.estatus === 'FINALIZADO' || r.estatus === 'RECOLECTADO' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                        'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}>
                        {r.estatus}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center gap-1.5 pb-2 border-b border-slate-800/40 mb-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">📂 Solicitó: {r.solicitante}</span>
                      </div>

                      <h4 className="font-bold text-slate-100 text-base">{r.proveedor}</h4>
                      <p className="text-xs text-slate-400 mt-1 lines-clamp flex items-start gap-1">
                        <MapPin size={11} className="text-rose-455 shrink-0 mt-0.5" />
                        <span>{r.direccion}</span>
                      </p>
                      {r.fechaDisponible && (
                        <div className="mt-2 text-amber-450 bg-amber-950/25 border border-amber-900/40 rounded px-2 py-0.5 w-fit text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                          📅 DISPONIBLE DESDE: {formatedDisplayDate(r.fechaDisponible)}
                        </div>
                      )}
                    </div>

                    <div className="bg-slate-900/50 p-2.5 rounded-lg border border-slate-800/40 text-xs text-slate-300">
                      <span className="block text-[10px] font-bold text-slate-500 uppercase mb-0.5">Material:</span>
                      {r.material}
                    </div>

                    <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/40 grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Chofer</span>
                        <span className="text-[11px] font-semibold text-slate-300 truncate block mt-0.5">{r.chofer || '—'}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">F. Real / Disp</span>
                        <span className="text-[11px] font-semibold text-slate-300 truncate block mt-0.5">{r.fechaReal ? formatedDisplayDate(r.fechaReal) : formatedDisplayDate(r.fechaDisponible)}</span>
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-slate-500 uppercase">Secuencia</span>
                        <span className="text-[11px] font-bold text-amber-500 mt-0.5 block">{r.orden ? `#${r.orden}` : '—'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center gap-2 pt-4 border-t border-slate-800 mt-4">
                    <button 
                      onClick={() => handleOpenRec(r)}
                      className="bg-slate-800 hover:bg-slate-755 hover:text-white border border-slate-700 text-slate-200 font-bold px-4 py-2 rounded-lg text-xs flex items-center gap-1 cursor-pointer transition shadow"
                    >
                      <Settings size={12} />
                      Asignar Chofer
                    </button>

                    <div className="flex gap-1 shrink-0">
                      {r.chofer && (
                        <button 
                          onClick={() => handleLaunchSimulation(r.chofer || '', r.fechaReal || r.fechaDisponible)}
                          title="Ver Cronograma del Chofer"
                          className="p-2 bg-slate-800 hover:bg-slate-700 text-teal-400 border border-slate-700 rounded-lg transition"
                        >
                          <Clock size={14} />
                        </button>
                      )}
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
                      <a 
                        href={mapsUrl} 
                        target="_blank" 
                        rel="noreferrer"
                        title="Ver en Google Maps"
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-rose-450 border border-slate-700 rounded-lg transition"
                      >
                        <MapPin size={14} />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ASSIGNMENT DELIVERIES POPUP MODAL */}
      {entregasModalOpen && selectedPedido && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setEntregasModalOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-auto cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-base uppercase tracking-wider">
                Planificar Envío: <span className="text-teal-400">#{selectedPedido.ticket}</span>
              </h2>
              <button onClick={() => setEntregasModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleEntregaSave} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 font-bold">Fecha Envío</label>
                  <input 
                    type="date" 
                    value={editFechaEnvio}
                    onChange={(e) => handleEntregaChangeDriver(editChofer, e.target.value)}
                    required
                    onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                    onFocus={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Chofer</label>
                  <select 
                    value={editChofer}
                    onChange={(e) => handleEntregaChangeDriver(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none"
                  >
                    <option value="">Seleccione...</option>
                    {choferes.map(ch => (
                      <option key={ch.id} value={ch.nombre}>{ch.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Estatus</label>
                  <select 
                    value={editEstatusLog}
                    onChange={(e) => setEditEstatusLog(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none font-bold"
                  >
                    <option value="REVISADO">REVISADO</option>
                    <option value="PROGRAMADO">PROGRAMADO</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Secuencia Ruta</label>
                  <select 
                    value={editOrden}
                    onChange={(e) => setEditOrden(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-700 text-amber-400 rounded-lg text-xs p-2.5 focus:outline-none font-bold"
                  >
                    <option value="">Definir Orden...</option>
                    {Array.from({ length: 15 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>Parada #{n}</option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500 mt-1">Se recalcula aut. al cambiar chofer/fecha</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Observaciones de Logística</label>
                <textarea 
                  placeholder="Instrucciones al operador sobre maniobras, horarios de recepción..."
                  value={editObsLog}
                  onChange={(e) => setEditObsLog(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none"
                />
              </div>

              <div className="pt-2 pb-1 shrink-0">
                <button 
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition shadow-lg shadow-teal-950 cursor-pointer"
                >
                  Confirmar Planificación 🚚
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ASSIGNMENT RECOLECCION POPUP MODAL */}
      {recsModalOpen && selectedRec && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setRecsModalOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-auto cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-base uppercase tracking-wider">
                Planificar Recolección: <span className="text-teal-400">{selectedRec.id}</span>
              </h2>
              <button onClick={() => setRecsModalOpen(false)} className="text-slate-400 hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleRecSave} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5 font-bold">Chofer Asignado</label>
                <select 
                  value={editChoferRec}
                  onChange={(e) => handleRecChangeDriver(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none"
                >
                  <option value="">Seleccione...</option>
                  {choferes.map(ch => (
                    <option key={ch.id} value={ch.nombre}>{ch.nombre}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Fecha Ejecución</label>
                  <input 
                    type="date" 
                    value={editFechaRec}
                    onChange={(e) => handleRecChangeDriver(editChoferRec, e.target.value)}
                    required
                    onClick={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                    onFocus={(e) => { try { (e.currentTarget as any).showPicker?.(); } catch (err) {} }}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Estatus</label>
                  <select 
                    value={editEstatusRec}
                    onChange={(e) => setEditEstatusRec(e.target.value)}
                    required
                    className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-xs p-2.5 focus:outline-none font-bold"
                  >
                    <option value="REVISADO">REVISADO</option>
                    <option value="PROGRAMADO">PROGRAMADO</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Secuencia Ruta Global</label>
                <select 
                  value={editOrdenRec}
                  onChange={(e) => setEditOrdenRec(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 text-amber-400 rounded-lg text-xs p-2.5 focus:outline-none font-bold"
                >
                  <option value="">Definir Orden...</option>
                  {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
                    <option key={n} value={n}>Parada #{n}</option>
                  ))}
                </select>
              </div>

              <div className="pt-2 pb-1 shrink-0">
                <button 
                  type="submit"
                  className="w-full bg-teal-600 hover:bg-teal-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition shadow-lg shadow-teal-950 cursor-pointer"
                >
                  Confirmar Planificación Recolección 🚚
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {/* NEW RECOLLECTION BY LOGISTICS BUILDER MODAL */}
      {nuevaRecOpen && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setNuevaRecOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl my-auto cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h2 className="text-slate-100 font-bold text-sm tracking-widest uppercase">
                Nueva Recolección Directa
              </h2>
              <button onClick={() => setNuevaRecOpen(false)} className="text-slate-400 hover:text-slate-200 transition">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleNuevaRecLogSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">ID Folio</label>
                <div className="flex">
                  <span className="bg-slate-850 text-slate-300 px-3 py-2 border border-slate-700 rounded-l-lg text-sm font-bold flex items-center font-mono">
                    REC-
                  </span>
                  <input 
                    type="text" 
                    placeholder="Ej: L99B"
                    value={newFolio}
                    onChange={(e) => setNewFolio(e.target.value)}
                    required
                    className="w-full bg-slate-900 border-y border-r border-slate-700 rounded-r-lg text-sm text-slate-100 p-2 focus:outline-none focus:ring-1 focus:ring-teal-500 uppercase font-bold"
                  />
                </div>
              </div>

              {/* Autocomplete suppliers inputs */}
              <div className="relative">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Proveedor</label>
                <input 
                  type="text" 
                  placeholder="Buscar o registrar proveedor..."
                  value={newProveedor}
                  onChange={(e) => handleProvLogChange(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none"
                />

                {sugProvs.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-40 overflow-y-auto z-50 divide-y divide-slate-800">
                    {sugProvs.map((pr, i) => (
                      <div 
                        key={i} 
                        onClick={() => selectProvLogSug(pr)}
                        className="p-2.5 hover:bg-slate-700/60 cursor-pointer text-xs transition"
                      >
                        <p className="font-bold text-slate-100">{pr.nombre}</p>
                        <p className="text-slate-400 text-[10px] truncate">{pr.direccion}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Dirección de Recolección</label>
                <textarea 
                  placeholder="Dirección física completa..."
                  value={newDireccion}
                  onChange={(e) => setNewDireccion(e.target.value)}
                  required
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Referencias</label>
                <input 
                  type="text" 
                  placeholder="Detalles del local, portón..."
                  value={newReferencias}
                  onChange={(e) => setNewReferencias(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Materiales a Traer</label>
                <textarea 
                  placeholder="Detalle de bultos o herrajes..."
                  value={newMaterial}
                  onChange={(e) => setNewMaterial(e.target.value)}
                  required
                  rows={2}
                  className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-lg text-sm p-2.5 focus:outline-none"
                />
              </div>

              <div className="pt-2 pb-1 shrink-0">
                <button 
                  type="submit"
                  className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wide transition shadow-lg shadow-emerald-950 cursor-pointer"
                >
                  ENVIAR A RUTA 🚚
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TIMETRUCK CHRONOGRAM MODAL WINDOW */}
      {cronoOpen && cronoData && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) setCronoOpen(false); }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/60 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm shadow-2xl my-auto cursor-default overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-5 border-b border-slate-800 shrink-0">
              <h3 className="font-bold text-slate-100 text-base">Cronograma: {cronoChofer}</h3>
              <button onClick={() => setCronoOpen(false)} className="text-slate-400 hover:text-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto flex-grow space-y-4">
              <div className="bg-teal-950/40 border border-teal-900 text-teal-300 p-3 rounded-lg text-xs text-center space-y-1 mb-4 shrink-0">
                <p className="font-bold">📅 RUTA: {cronoData.fechaConsultada}</p>
                <p className="opacity-95 text-slate-300 text-center">
                  <span className="font-semibold text-slate-100">Salida de Bodega:</span>{' '}
                  <span className={cronoData.inicio.includes('Pendiente') ? 'text-teal-400 italic font-medium' : 'text-emerald-400 font-bold'}>
                    {cronoData.inicio}
                  </span>
                </p>
              </div>

              <div className="relative border-l border-slate-800 pl-4 ml-2.5 space-y-4">
                {cronoData.ruta.map((p: any, i: number) => (
                  <div key={i} className="relative">
                    <span className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 ${
                      p.realizado ? 'bg-rose-500 border-slate-900' :
                      p.enRuta ? 'bg-emerald-500 border-slate-900' :
                      'bg-amber-500 border-slate-900'
                    }`} />
                    
                    <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs text-left">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-bold">{p.tipo} #{p.id}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                          p.realizado ? 'bg-rose-950/40 text-rose-400 border border-rose-950' :
                          p.enRuta ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' :
                          'bg-amber-950 text-amber-400 border border-amber-900'
                        }`}>
                          {p.realizado ? 'FINALIZADO' : p.enRuta ? 'EN RUTA' : 'PROGRAMADO'}
                        </span>
                      </div>

                      <p className="font-bold mt-1 text-slate-200">{p.destino}</p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{p.direccion}</p>
                      
                      <p className={`text-[11px] font-extrabold mt-2 flex items-center gap-1 ${
                        p.realizado ? 'text-rose-400' : p.enRuta ? 'text-emerald-400' : 'text-amber-405'
                      }`}>
                        🕒 {p.ventana}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATALOG DIRECTORY CRUD INNER DRAWER / INTERACTIVE POPUP */}
      {activeCatalog && (
        <div 
          onClick={(e) => { if (e.target === e.currentTarget) { setActiveCatalog(null); setEditingItemIdx(null); } }}
          className="fixed inset-0 z-50 flex justify-center items-start bg-black/70 backdrop-blur-sm p-4 overflow-y-auto cursor-pointer"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl p-6 overflow-hidden flex flex-col max-h-[85vh] my-auto cursor-default">
            <div className="flex justify-between items-center pb-4 border-b border-slate-800 mb-4 shrink-0">
              <h3 className="font-bold text-slate-100 text-lg uppercase tracking-wide flex items-center gap-1.5">
                ⚙️ Catálogos: {activeCatalog}
              </h3>
              <button 
                onClick={() => { setActiveCatalog(null); setEditingItemIdx(null); }} 
                className="text-slate-400 hover:text-slate-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Catalog inline Builder forms */}
            <div className="bg-slate-950/30 p-4 rounded-xl border border-slate-800/80 mb-4 space-y-3 shrink-0">
              <h4 className="text-xs uppercase font-extrabold text-teal-400 tracking-wider">
                {editingItemIdx !== null ? 'Modificar Registro Seleccionado' : 'Añadir Nuevo Registro al Catálogo'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  placeholder={activeCatalog === 'CHOFERES' ? 'Nombre del Chofer' : activeCatalog === 'PROVEEDORES' ? 'Nombre del Proveedor' : 'Nombre de la Tienda'}
                  value={catalogsNewName}
                  onChange={(e) => setCatalogsNewName(e.target.value)}
                  className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none"
                />

                {activeCatalog !== 'CHOFERES' && (
                  <input 
                    type="text" 
                    placeholder="Dirección Física Completa"
                    value={catalogsNewAddress}
                    onChange={(e) => setCatalogsNewAddress(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none"
                  />
                )}

                {activeCatalog !== 'CHOFERES' && (
                  <input 
                    type="text" 
                    placeholder={activeCatalog === 'PROVEEDORES' ? 'Referencias de ubicación' : 'Siglas (Ej: TIV)'}
                    value={catalogsNewRefOrSiglas}
                    onChange={(e) => setCatalogsNewRefOrSiglas(e.target.value)}
                    className="bg-slate-900 border border-slate-800 rounded-lg text-xs p-2.5 text-slate-100 focus:outline-none"
                  />
                )}
              </div>

              <div className="flex gap-2 justify-end pt-1">
                {editingItemIdx !== null ? (
                  <>
                    <button 
                      onClick={() => handleCatalogUpdateClick(editingItemIdx)}
                      className="bg-teal-650 hover:bg-teal-600 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shadow"
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
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer transition shadow flex items-center gap-1.5"
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
                      <tr key={ch.id} className="hover:bg-slate-850/20">
                        <td className="py-3 px-3 font-semibold text-slate-100">{ch.nombre}</td>
                        <td className="py-3 px-3 text-center flex items-center justify-center gap-1.5">
                          <button onClick={() => handleCatalogEditClick(i, ch.nombre)} className="text-teal-400 hover:bg-teal-950/40 p-1.5 rounded"><Edit2 size={13} /></button>
                          <button onClick={() => handleCatalogDelete(i)} className="text-rose-400 hover:bg-rose-950/45 p-1.5 rounded"><Trash2 size={13} /></button>
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
                            <button onClick={() => handleCatalogEditClick(i, pv)} className="text-teal-400 hover:bg-teal-950/40 p-1.5 rounded"><Edit2 size={13} /></button>
                            <button onClick={() => handleCatalogDelete(i)} className="text-rose-400 hover:bg-rose-950/45 p-1.5 rounded"><Trash2 size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    tiendas.map((t, i) => (
                      <tr key={t.nombre} className="hover:bg-slate-850/20">
                        <td className="py-3 px-3 font-semibold text-slate-100">{t.nombre}</td>
                        <td className="py-3 px-3 max-w-xs truncate">{t.direccion}</td>
                        <td className="py-3 px-3 font-mono text-amber-500 font-bold">{t.siglas}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button onClick={() => handleCatalogEditClick(i, t)} className="text-teal-400 hover:bg-teal-950/40 p-1.5 rounded"><Edit2 size={13} /></button>
                            <button onClick={() => handleCatalogDelete(i)} className="text-rose-400 hover:bg-rose-950/45 p-1.5 rounded"><Trash2 size={13} /></button>
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
