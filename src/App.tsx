/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { LogistikaProvider, useLogistika } from './context/LogistikaContext';
import { Tienda } from './views/Tienda';
import { Compras } from './views/Compras';
import { Logistica } from './views/Logistica';
import { Admin } from './views/Admin';
import { Chofer } from './views/Chofer';
import { FotoTicket } from './views/FotoTicket';
import { Shield, ShoppingBag, Truck, AppWindow, UserCheck, Camera, MonitorDot, Lock, Unlock, LogOut, Check, LayoutGrid } from 'lucide-react';
import Swal from 'sweetalert2';

function MainAppContent() {
  const { tiendas, choferes } = useLogistika();

  // Session state saved in localstorage: null means they haven't selected an area
  // If role is locked, they can only view that area.
  // If role is 'SANDBOX', they can view all tabs.
  const [session, setSession] = useState<{
    role: 'TIENDA' | 'COMPRAS' | 'LOGISTICA' | 'ADMIN' | 'CHOFER' | 'FOTO_TICKET' | 'SANDBOX' | null;
    name?: string;
  }>(() => {
    const saved = localStorage.getItem('logistika_session');
    return saved ? JSON.parse(saved) : { role: null };
  });

  const [currentView, setCurrentView] = useState<'TIENDA' | 'COMPRAS' | 'LOGISTICA' | 'ADMIN' | 'CHOFER' | 'FOTO_TICKET'>('LOGISTICA');

  // If role changes, lock view
  useEffect(() => {
    if (session.role && session.role !== 'SANDBOX') {
      setCurrentView(session.role);
    }
  }, [session.role]);

  // Form selections inside portal login
  const [selectedRole, setSelectedRole] = useState<'TIENDA' | 'COMPRAS' | 'LOGISTICA' | 'ADMIN' | 'CHOFER' | 'FOTO_TICKET' | 'SANDBOX'>('TIENDA');
  const [selectedStore, setSelectedStore] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');
  const [adminPin, setAdminPin] = useState('');

  // Auto populate defaults
  useEffect(() => {
    if (tiendas && tiendas.length > 0 && !selectedStore) {
      setSelectedStore(tiendas[0].nombre);
    }
  }, [tiendas, selectedStore]);

  useEffect(() => {
    if (choferes && choferes.length > 0 && !selectedDriver) {
      setSelectedDriver(choferes[0].nombre);
    }
  }, [choferes, selectedDriver]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedRole === 'ADMIN') {
      if (adminPin !== '1234') {
        Swal.fire({
          icon: 'error',
          title: 'Código Supervisor Inválido',
          text: 'El PIN de Supervisor es obligatorio e incorrecto (Pruebe con "1234").',
          background: '#0d1b2a',
          color: '#fff'
        });
        return;
      }
    }

    const newSession = {
      role: selectedRole,
      name: selectedRole === 'TIENDA' || selectedRole === 'FOTO_TICKET'
        ? selectedStore 
        : (selectedRole === 'CHOFER' ? selectedDriver : undefined)
    };

    localStorage.setItem('logistika_session', JSON.stringify(newSession));
    setSession(newSession);

    Swal.fire({
      icon: 'success',
      title: 'Dispositivo Vinculado',
      text: selectedRole === 'SANDBOX' 
        ? 'Acceso en modo Sandbox de desarrollo. Todas las pestañas habilitadas.'
        : `Terminal configurada correctamente para: ${selectedRole} ${newSession.name ? '(' + newSession.name + ')' : ''}`,
      timer: 2000,
      showConfirmButton: false,
      background: '#0d1b2a',
      color: '#fff'
    });
  };

  const handleLogout = () => {
    Swal.fire({
      title: 'Desasociar Terminal',
      text: 'Se requiere el PIN de Supervisor (1234) para desbloquear este dispositivo.',
      input: 'password',
      inputPlaceholder: 'Ingrese PIN de Supervisor',
      inputAttributes: {
        maxlength: '6',
        autocapitalize: 'off',
        autocorrect: 'off'
      },
      showCancelButton: true,
      confirmButtonText: '🔓 Desbloquear',
      cancelButtonText: 'Cancelar',
      background: '#0d1b2a',
      color: '#fff',
      preConfirm: (pin) => {
        if (pin === '1234') {
          return true;
        } else {
          Swal.showValidationMessage('PIN incorrecto. Pruebe con "1234"');
          return false;
        }
      }
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.removeItem('logistika_session');
        setSession({ role: null });
        setAdminPin('');
        Swal.fire({
          icon: 'success',
          title: 'Terminal Liberada',
          text: 'Dispositivo devuelto al portal general.',
          timer: 1500,
          showConfirmButton: false,
          background: '#0d1b2a',
          color: '#fff'
        });
      }
    });
  };

  // If the user has not logged into an area/sandbox, display Portal Login screen
  if (session.role === null) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
        <header className="bg-slate-900 border-b border-slate-800 shrink-0 shadow-md">
          <div className="max-w-7xl mx-auto px-4 py-3.5 flex justify-between items-center">
            <h1 className="text-base font-black tracking-wider text-white font-mono flex items-center gap-1.5">
              ⚡ LOGISTIKA
              <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-800 px-1.5 py-0.5 rounded font-sans tracking-normal">
                CONSOLE v2.5
              </span>
            </h1>

            <div className="flex items-center gap-2 text-[10px] bg-slate-950 px-2.5 py-1 rounded-full border border-slate-800">
              <MonitorDot className="text-emerald-500 animate-pulse animate-duration-1000" size={11} />
              <span className="text-slate-400">Terminal Ingress Sincronizada</span>
            </div>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 animate-fade-in">
            {/* Title Block */}
            <div className="text-center space-y-2">
              <div className="inline-flex bg-teal-950/40 text-teal-400 border border-teal-850 p-2.5 rounded-2xl">
                <Lock size={22} />
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">Portal de Acceso General</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Asocie este dispositivo de forma persistente a su área de trabajo correspondiente en Logistika Enterprise.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Grid of Areas cards */}
              <div className="space-y-2">
                <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">
                  Seleccione su Área de Operación
                </label>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'TIENDA', label: '🏪 Ventas / Sucursales', color: 'hover:border-indigo-500/50 hover:bg-indigo-950/10' },
                    { id: 'COMPRAS', label: '🛒 Compras / Dictámenes', color: 'hover:border-amber-500/50 hover:bg-amber-950/10' },
                    { id: 'LOGISTICA', label: '🚚 Logística de Rutas', color: 'hover:border-sky-500/50 hover:bg-sky-950/10' },
                    { id: 'CHOFER', label: '👤 Choferes / Ruta', color: 'hover:border-emerald-500/50 hover:bg-emerald-950/10' },
                    { id: 'FOTO_TICKET', label: '📷 Foto Ticket P.', color: 'hover:border-rose-500/50 hover:bg-rose-950/10' },
                    { id: 'ADMIN', label: '🛡️ Admin / Supervisión', color: 'hover:border-red-500/50 hover:bg-red-950/10' }
                  ].map(card => {
                    const active = selectedRole === card.id;
                    return (
                      <div
                        key={card.id}
                        onClick={() => setSelectedRole(card.id as any)}
                        className={`border rounded-2xl p-3.5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 h-20 ${
                          active 
                            ? 'border-teal-500 bg-teal-950/20 text-teal-450' 
                            : 'border-slate-800 bg-slate-950/40 text-slate-400 ' + card.color
                        }`}
                      >
                        <span className="text-xs font-bold leading-tight uppercase tracking-wider">{card.label}</span>
                        {active && <Check size={11} className="bg-teal-500 text-white rounded-full p-0.5" />}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic input configuration */}
              <div className="bg-slate-950/60 p-5 rounded-2xl border border-slate-800/80 animate-fade-in">
                {selectedRole === 'TIENDA' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Asociar Sucursal Activa</label>
                    <p className="text-[10px] text-slate-500 mb-2">Este dispositivo se bloqueará temporalmente para procesar y consultar únicamente los pedidos de la sucursal seleccionada.</p>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      {tiendas.map(t => (
                        <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'FOTO_TICKET' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Asociar Sucursal / Foto Sucursal</label>
                    <p className="text-[10px] text-slate-500 mb-2">Buzón móvil de evidencias fotográficas para entregas parciales asociadas a una tienda específica.</p>
                    <select
                      value={selectedStore}
                      onChange={(e) => setSelectedStore(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                    >
                      {tiendas.map(t => (
                        <option key={t.nombre} value={t.nombre}>{t.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'CHOFER' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">Identificación de Transportista</label>
                    <p className="text-[10px] text-slate-500 mb-2">Asigne el nombre del operador que utiliza este equipo móvil. Verá únicamente su cronograma de secuencia de ruta para el día de hoy.</p>
                    <select
                      value={selectedDriver}
                      onChange={(e) => setSelectedDriver(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs font-semibold focus:outline-none"
                    >
                      {choferes.map(ch => (
                        <option key={ch.id} value={ch.nombre}>{ch.nombre}</option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedRole === 'ADMIN' && (
                  <div className="space-y-2">
                    <label className="block text-[10px] uppercase font-bold tracking-widest text-slate-400">PIN de Autorización del Supervisor</label>
                    <p className="text-[10px] text-slate-500 mb-2">Se requiere autenticar un PIN de seguridad vigente para usar el módulo de supervisor / catálogos.</p>
                    <input
                      type="password"
                      placeholder="Ingrese PIN de Seguridad (Prueba: 1234)"
                      value={adminPin}
                      onChange={(e) => setAdminPin(e.target.value)}
                      maxLength={6}
                      required
                      className="w-full bg-slate-900 border border-slate-700 text-slate-100 rounded-xl p-3 text-xs text-center font-bold tracking-widest focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                )}

                {(selectedRole === 'COMPRAS' || selectedRole === 'LOGISTICA') && (
                  <div className="text-center py-4 text-xs text-slate-500 leading-relaxed font-semibold">
                    💡 No se requieren configuraciones adicionales para {selectedRole}. <br/>
                    Este terminal recibirá la consola completa sin bloqueos de sucursal.
                  </div>
                )}
              </div>

              {/* Confirm submit */}
              <button
                type="submit"
                className="w-full bg-teal-600 hover:bg-teal-500 text-white font-extrabold py-3.5 tracking-wider rounded-2xl text-xs uppercase cursor-pointer shadow transition"
              >
                🔒 VINCULAR EQUIPO E INICIAR SESIÓN
              </button>
            </form>

            <div className="border-t border-slate-800/80 pt-4 text-center">
              <button
                onClick={() => {
                  const devSession = { role: 'SANDBOX' as const };
                  localStorage.setItem('logistika_session', JSON.stringify(devSession));
                  setSession(devSession);
                }}
                className="text-[11px] text-teal-400 hover:text-teal-300 font-bold uppercase tracking-wider inline-flex items-center gap-1.5 hover:underline"
              >
                <LayoutGrid size={12} />
                Modo Sandbox (Desbloquear todas las pestañas para Pruebas)
              </button>
            </div>
          </div>
        </main>

        <footer className="bg-slate-900 border-t border-slate-800/60 py-4 text-center text-[10px] text-slate-500 mt-auto">
          Logistika Unified Enterprise System · Dispositivo Sandbox Autorizado para Raullozanolara@gmail.com
        </footer>
      </div>
    );
  }

  // Unified gorgeous premium Slate visual canvas Layout for LOCKED SESSIONS or SANDBOX
  const isSandbox = session.role === 'SANDBOX';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-teal-500 selection:text-white">
      {/* Unified LOGISTIKA Top Brand Header */}
      <header className="bg-slate-900 border-b border-slate-800 shrink-0 sticky top-0 z-40 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">⚡</span>
            <div>
              <h1 className="text-lg font-black tracking-wider text-white font-mono flex items-center gap-1.5">
                LOGISTIKA
                <span className="text-[10px] bg-teal-500/20 text-teal-400 border border-teal-800 px-1.5 py-0.5 rounded font-sans tracking-normal">
                  CONSOLIDADA v2.5
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Optimizador centralizado de rutas de reparto y recolección</p>
            </div>
          </div>

          {/* Locked terminal indicator */}
          <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-xs bg-slate-950/60 px-3 py-1.5 rounded-full border border-slate-800">
              <span className="w-2 h-2 bg-teal-400 rounded-full animate-ping"></span>
              <span className="text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                {isSandbox ? '🧪 SANDBOX PRUEBAS' : `🛡️ MÓDULO: ${session.role} ${session.name ? '(' + session.name + ')' : ''}`}
              </span>
            </div>

            <button 
              onClick={handleLogout}
              className="px-3 py-1.5 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-950 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer shadow-sm"
              title="Cerrar sesión de terminal requiere PIN de Supervisor"
            >
              <LogOut size={11} />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </header>

      {/* Navigation role Selector (ONLY VISIBLE IN SANDBOX MODE OR SUPERVISOR/ADMIN OVERRIDE) */}
      {isSandbox ? (
        <nav className="bg-slate-900 border-b border-slate-800/80 shrink-0 sticky top-[68px] sm:top-[68px] z-30 overflow-x-auto select-none no-scrollbar">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-1 py-2">
              <button
                onClick={() => setCurrentView('TIENDA')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer ${
                  currentView === 'TIENDA' 
                    ? 'bg-teal-600 text-white shadow shadow-teal-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <AppWindow size={14} />
                🏪 Tienda (Sucursales)
              </button>

              <button
                onClick={() => setCurrentView('COMPRAS')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer ${
                  currentView === 'COMPRAS' 
                    ? 'bg-teal-600 text-white shadow shadow-teal-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <ShoppingBag size={14} />
                🛒 Compras (Materia Prima)
              </button>

              <button
                onClick={() => setCurrentView('LOGISTICA')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer ${
                  currentView === 'LOGISTICA' 
                    ? 'bg-teal-600 text-white shadow shadow-teal-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Truck size={14} />
                🚚 Logística (Buzón de Ruta)
              </button>

              <button
                onClick={() => setCurrentView('ADMIN')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer ${
                  currentView === 'ADMIN' 
                    ? 'bg-teal-600 text-white shadow shadow-teal-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Shield size={14} />
                📦 Admin (Supervisor)
              </button>

              <button
                onClick={() => setCurrentView('CHOFER')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer ${
                  currentView === 'CHOFER' 
                    ? 'bg-teal-600 text-white shadow shadow-teal-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <UserCheck size={14} />
                👤 Chofer (Operador Móvil)
              </button>

              <button
                onClick={() => setCurrentView('FOTO_TICKET')}
                className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold uppercase tracking-wider rounded-lg transition shrink-0 cursor-pointer ${
                  currentView === 'FOTO_TICKET' 
                    ? 'bg-teal-600 text-white shadow shadow-teal-900/40' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <Camera size={14} />
                📷 Foto Ticket (Vendedor)
              </button>
            </div>
          </div>
        </nav>
      ) : null}

      {/* Main interactive window viewport */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-fade-in duration-300">
          {currentView === 'TIENDA' && <Tienda lockedStore={session.name} />}
          {currentView === 'COMPRAS' && <Compras />}
          {currentView === 'LOGISTICA' && <Logistica />}
          {currentView === 'ADMIN' && <Admin />}
          {currentView === 'CHOFER' && <Chofer lockedDriver={session.name} />}
          {currentView === 'FOTO_TICKET' && <FotoTicket lockedStore={session.name} />}
        </div>
      </main>

      {/* Footer info segment */}
      <footer className="bg-slate-900 border-t border-slate-800/60 py-4 text-center shrink-0">
        <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
          Logistika Unified Enterprise System · Diseñado modularmente con patrones de persistencia local y sincronización.
        </p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <LogistikaProvider>
      <MainAppContent />
    </LogistikaProvider>
  );
}
