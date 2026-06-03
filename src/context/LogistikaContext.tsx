/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Pedido, Recoleccion, ChoferConfig, ProveedorConfig, TiendaConfig, LogRuta, HistorialEntrega, HistorialRecoleccion } from '../types';
import { db } from '../lib/firebase';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  getDoc,
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {},
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
}

// Global base mocks for initial database seeding
const initialPedidosMock: Pedido[] = [
  {
    ticket: 'TIV1166',
    fecha: '2026-05-29 14:55:20',
    tienda: 'TEKNO INTERLOMAS',
    cliente: 'RODOLFO HUERTA HDEZ.',
    tel: '5566778899',
    dir: 'ANTIGUO CAMINO A TECAMACHALCO MANZANA 1 LOTE 1, EL OLIVO, 52789 NAUCALPAN DE JUÁREZ, MÉX',
    ref: 'PORTON COCHERA GRIS',
    tipo: 'Entrega Parcial',
    obs: 'CUANTO LO TRAEN?',
    estatus: 'PROGRAMADO',
    comprasObs: 'MANDARLO YA',
    comprasUbic: 'EN BODEGA 3',
    chofer: 'Elias',
    dateenv: '2026-05-29',
    orden: 2,
    obsLogistica: 'Entregar antes de las 3 pm.',
    lat: 19.3861701,
    lng: -99.2776786,
    fotoUrl: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?q=80&w=600&auto=format&fit=crop'
  },
  {
    ticket: 'TIV6666',
    fecha: '2026-05-29 17:20:09',
    tienda: 'TEKNO INTERLOMAS',
    cliente: 'HORACIO JAUREGUI',
    tel: '5544332211',
    dir: 'CALLE DE LOS REVOLUCIONARIOS 45, LOMAS VERDES, NAUCALPAN DE JUÁREZ',
    ref: 'CASA COLOR ARENA JUNTO A TIENDA DE ABARROTES',
    tipo: 'Todo el Ticket',
    estatus: 'PROGRAMADO',
    obs: 'VIENE POR SUS MATERIALES EL MARTES.',
    comprasObs: 'LO MANDE COMPRAR, LLEGA EL VIERNES.',
    comprasUbic: 'COMPRA PROGRAMADA',
    chofer: 'Elias',
    dateenv: '2026-05-29',
    orden: 1,
    obsLogistica: 'Cargar primero en Interlomas.',
    lat: 19.3861701,
    lng: -99.2776786
  },
  {
    ticket: 'TIV4102',
    fecha: '2026-05-29 10:14:02',
    tienda: 'TEKNO INTERLOMAS',
    cliente: 'MAURICIO ESCAMILLA',
    tel: '5598765432',
    dir: 'AVENIDA PALO SOLO 128, HUIXQUILUCAN',
    ref: 'CONDOMINIO RESIDENCIAL LOS ARCOS',
    tipo: 'Todo el Ticket',
    estatus: 'CARGADO',
    obs: 'REQUIERE FACTURA ORIGINAL',
    comprasObs: '',
    comprasUbic: '',
    chofer: '',
    dateenv: '',
    orden: null,
    obsLogistica: '',
    lat: 19.3902,
    lng: -99.2810
  }
];

const initialRecsMock: Recoleccion[] = [
  {
    id: 'REC-H23R',
    solicitante: 'COMPRAS',
    proveedor: 'ACEROS DE SANTA CLARA',
    direccion: 'CALLE REVOLUCIÓN INDUSTRIAL 82, ZONA INDUSTRIAL, APODACA',
    referencias: 'BODEGA 10 CON LETRERO ROJO',
    material: '12 VARILLAS DE 1/2 PULGADA, 4 ROLLOS DE ALAMBRE',
    fechaDisponible: '2026-05-29',
    chofer: 'Elias',
    estatus: 'PROGRAMADO',
    fechaAlta: '2026-05-29 08:30:00',
    orden: 3,
    lat: 19.3621,
    lng: -99.2612
  },
  {
    id: 'REC-M54G',
    solicitante: 'COMPRAS',
    proveedor: 'HERRAMIENTAS NACIONALES',
    direccion: 'AV. COAPA 345, DELEGACION COYOACAN',
    referencias: 'PORTON NEGRO FRENTE A PARQUE',
    material: 'Cajas con adaptadores de taladro y brocas',
    fechaDisponible: '2026-05-30',
    chofer: '',
    estatus: 'SOLICITADO',
    fechaAlta: '2026-05-29 12:45:00',
    orden: null,
    lat: 19.3082,
    lng: -99.1320
  }
];

const initialChoferesMock: ChoferConfig[] = [
  { id: '1', nombre: 'Elias', lat: 19.367508, lng: -99.284752, ultimaUbicacion: '2026-05-29 18:00:00' },
  { id: '2', nombre: 'Carlos Perez', lat: 19.367508, lng: -99.284752, ultimaUbicacion: '2026-05-29 18:00:00' },
  { id: '3', nombre: 'Juan Manuel Gomez', lat: 19.367508, lng: -99.284752, ultimaUbicacion: '2026-05-29 18:00:00' }
];

const initialProveedoresMock: ProveedorConfig[] = [
  { nombre: 'ACEROS DE SANTA CLARA', direccion: 'CALLE REVOLUCIÓN INDUSTRIAL 82, ZONA INDUSTRIAL, APODACA', referencia: 'BODEGA 10 CON LETRERO ROJO' },
  { nombre: 'HERRAMIENTAS NACIONALES', direccion: 'AV. COAPA 345, DELEGACION COYOACAN', referencia: 'PORTON NEGRO FRENTE A PARQUE' },
  { nombre: 'CEMEX MATERIALES', direccion: 'PLANTA NAUCALPAN, AV. DE LAS GRANJAS 21', referencia: 'ENTRADA GENERAL DE CAMIONES' }
];

const initialTiendasMock: TiendaConfig[] = [
  { nombre: 'TEKNO INTERLOMAS', direccion: 'ANTIGUO CAMINO A TECAMACHALCO MANZANA 1 LOTE 1, EL OLIVO, 52789 NAUCALPAN DE JUÁREZ, MÉX', siglas: 'TIV' },
  { nombre: 'TEKNO POLANCO', direccion: 'CAMPOS ELISEOS 154, BOSQUE DE CHAPULTEPEC, POLANCO', siglas: 'TPV' },
  { nombre: 'TEKNO SANTA FE', direccion: 'VASCO DE QUIROGA 3800, LOMAS DE SANTA FE', siglas: 'TSF' }
];

interface LogistikaContextType {
  pedidos: Pedido[];
  recolecciones: Recoleccion[];
  choferes: ChoferConfig[];
  proveedores: ProveedorConfig[];
  tiendas: TiendaConfig[];
  logs: LogRuta[];
  historialEntregas: HistorialEntrega[];
  historialRecolecciones: HistorialRecoleccion[];
  
  guardarPedidoTienda: (p: Partial<Pedido> & { idTicket: string; esEdicion?: boolean; numInt?: string; entregaEnTienda?: boolean; direccionPegada?: string }) => { success: boolean; error?: string };
  verificarTicketExistente: (tienda: string, ticket: string) => boolean;
  guardarDictamenCompras: (data: { ticket: string; estatus: string; comprasObs: string; comprasUbic: string }) => { success: boolean; error?: string };
  guardarSolicitudDesdeCompras: (data: { idRec: string; proveedor: string; direccion: string; referencias: string; material: string; fechaDisponible: string }) => { success: boolean; error?: string };
  crearNuevaRecoleccion: (data: Partial<Recoleccion>) => boolean;
  
  actualizarPedidoLogistica: (p: { id: string; chofer: string; fecha: string; estatus: string; orden: number | ''; obs?: string }) => void;
  actualizarRecoleccionLogistica: (p: { id: string; chofer: string; fecha: string; estatus: string; orden: number | ''; direccion?: string }) => void;
  guardarServicioConOrden: (p: { id: string; hoja: 'ENTREGAS' | 'RECOLECCIONES'; chofer: string; fecha: string; estatus: string; orden: number | ''; obs?: string; direccion?: string }) => { ok: boolean; msg?: string; ordenFinal?: number | '' };
  
  obtenerSiguienteOrdenGlobal: (chofer: string, fecha: string) => number;
  moverOrden: (payload: { chofer: string; fecha: string; idActual: string; hojaActual: 'ENTREGAS' | 'RECOLECCIONES'; ordenSolicitado: number }) => { ok: boolean; ordenFinal: number };
  liberarOrden: (payload: { chofer: string; fecha: string; idActual: string; hojaActual: 'ENTREGAS' | 'RECOLECCIONES' }) => { ok: boolean };

  obtenerTareasChofer: (nombre: string) => Array<any>;
  actualizarEstatusChofer: (d: { id: string; hoja: 'DB_PEDIDOS' | 'DB_RECOLECCIONES'; fila?: number; nuevoEstatus: string; chofer: string; lat: number; lng: number; receptor?: string; fotos?: string[] }) => string | boolean;
  subirFotoDrive: (idPedido: string, base64Data: string | string[]) => string;
  obtenerEtaParaTicket: (chofer: string, idTicket: string, targetDate: string, startingNow?: boolean) => string;
  
  obtenerProyeccionRuta: (nombreChofer: string, fechaFila: string, ticketStartingNow?: string) => { inicio: string; fechaConsultada: string; ruta: Array<any> };
  obtenerProyeccionRutaPorTienda: (ticket: string, tienda: string) => { ok: boolean; msg?: string; chofer?: string; fechaConsultada?: string; inicio?: string; ruta?: Array<any> };

  agregarChofer: (nombre: string) => void;
  editarChofer: (filaIdx: number, nombre: string) => void;
  eliminarChofer: (filaIdx: number) => void;
  
  agregarProveedor: (data: ProveedorConfig) => void;
  editarProveedor: (filaIdx: number, data: ProveedorConfig) => void;
  eliminarProveedor: (filaIdx: number) => void;

  agregarTienda: (data: TiendaConfig) => void;
  editarTienda: (filaIdx: number, data: TiendaConfig) => void;
  eliminarTienda: (filaIdx: number) => void;

  eliminarPedidoAdmin: (ticket: string) => { success: boolean; error?: string };
  eliminarRecoleccionAdmin: (id: string) => { success: boolean; error?: string };
  modificarPedidoAdmin: (data: any) => { success: boolean; error?: string };
  modificarRecoleccionAdmin: (data: any) => { success: boolean; error?: string };

  archivarFinalizados: () => string;
  reemplazarTablaDirecta: (tabla: string, nuevosDatos: any[]) => { success: boolean; error?: string };

  offlineQueue: any[];
  guardarLocalPendiente: (entrega: any) => void;
  sincronizarPendientesLocales: () => Promise<number>;
  clearOfflineQueue: () => void;
}

const LogistikaContext = createContext<LogistikaContextType | undefined>(undefined);

export const normalizarFecha = (val: string | Date | undefined): string => {
  if (!val) return '';
  if (val instanceof Date) {
    try {
      return val.toISOString().split('T')[0];
    } catch {
      return '';
    }
  }
  const s = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  const m = s.match(/^(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})/);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = m[2].padStart(2, '0');
    const year = m[3];
    return `${year}-${month}-${day}`;
  }

  const m2 = s.match(/^(\d{1,2})[-\/]([A-Za-z]{3})[-\/](\d{4})/);
  if (m2) {
    const meses: { [key: string]: string } = { ene: '01', feb: '02', mar: '03', abr: '04', may: '05', jun: '06', jul: '07', ago: '08', sep: '09', oct: '10', nov: '11', dic: '12' };
    const day = m2[1].padStart(2, '0');
    const mesStr = m2[2].toLowerCase().substring(0, 3);
    const month = meses[mesStr] || '01';
    const year = m2[3];
    return `${year}-${month}-${day}`;
  }

  const parsed = Date.parse(s);
  if (!isNaN(parsed)) {
    return new Date(parsed).toISOString().split('T')[0];
  }
  return s;
};

export const getMexicoCityDateTimeStr = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(date);
  
  const map: { [key: string]: string } = {};
  parts.forEach(p => {
    map[p.type] = p.value;
  });
  
  return `${map.year}-${map.month}-${map.day} ${map.hour}:${map.minute}:${map.second}`;
};

export const getMexicoCityDateStr = (date: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  
  const map: { [key: string]: string } = {};
  parts.forEach(p => {
    map[p.type] = p.value;
  });
  
  return `${map.year}-${map.month}-${map.day}`;
};

export const formatedDisplayDate = (val: string | Date | undefined): string => {
  const norm = normalizarFecha(val);
  if (!norm) return '—';
  const parts = norm.split('-');
  if (parts.length === 3) {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const idx = parseInt(parts[1]) - 1;
    return `${parts[2]}-${months[idx] ?? 'May'}-${parts[0]}`;
  }
  return norm;
};

const mockGeocode = (address: string): { latitude: number; longitude: number } => {
  const s = address.toUpperCase();
  let lat = 19.367508;
  let lng = -99.284752;

  if (s.includes('INTERLOMAS')) {
    lat = 19.3980; lng = -99.2740;
  } else if (s.includes('POLANCO')) {
    lat = 19.4326; lng = -99.2001;
  } else if (s.includes('SANTA FE')) {
    lat = 19.3587; lng = -99.2748;
  } else if (s.includes('BOSQUES')) {
    lat = 19.3956; lng = -99.2554;
  } else if (s.includes('LOMAS')) {
    lat = 19.4189; lng = -99.2274;
  } else if (s.includes('CONDESA')) {
    lat = 19.4116; lng = -99.1722;
  } else if (s.includes('NAUCALPAN')) {
    lat = 19.4785; lng = -99.2332;
  } else {
    const hash = address.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    lat += ((hash % 100) - 50) / 1000;
    lng += (((hash >> 1) % 100) - 50) / 1000;
  }
  return { latitude: lat, longitude: lng };
};

export const LogistikaProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Real-time states synchronized with Firestore
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([]);
  const [choferes, setChoferes] = useState<ChoferConfig[]>([]);
  const [proveedores, setProveedores] = useState<ProveedorConfig[]>([]);
  const [tiendas, setTiendas] = useState<TiendaConfig[]>([]);
  const [logs, setLogs] = useState<LogRuta[]>([]);
  const [historialEntregas, setHistorialEntregas] = useState<HistorialEntrega[]>([]);
  const [historialRecolecciones, setHistorialRecolecciones] = useState<HistorialRecoleccion[]>([]);
  const [offlineQueue, setOfflineQueue] = useState<any[]>(() => {
    const saved = localStorage.getItem('logistika_offline_queue');
    return saved ? JSON.parse(saved) : [];
  });

  // 1. Unified Real-Time listeners subscribing to Firestore
  useEffect(() => {
    const unsubPedidos = onSnapshot(collection(db, 'pedidos'), (snap) => {
      const list: Pedido[] = [];
      snap.forEach(d => list.push(d.data() as Pedido));
      setPedidos(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedidos'));

    const unsubRecs = onSnapshot(collection(db, 'recolecciones'), (snap) => {
      const list: Recoleccion[] = [];
      snap.forEach(d => list.push(d.data() as Recoleccion));
      setRecolecciones(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'recolecciones'));

    const unsubChoferes = onSnapshot(collection(db, 'choferes'), (snap) => {
      const list: ChoferConfig[] = [];
      snap.forEach(d => list.push(d.data() as ChoferConfig));
      list.sort((a, b) => a.id.localeCompare(b.id));
      setChoferes(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'choferes'));

    const unsubProveedores = onSnapshot(collection(db, 'proveedores'), (snap) => {
      const list: ProveedorConfig[] = [];
      snap.forEach(d => list.push(d.data() as ProveedorConfig));
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setProveedores(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'proveedores'));

    const unsubTiendas = onSnapshot(collection(db, 'tiendas'), (snap) => {
      const list: TiendaConfig[] = [];
      snap.forEach(d => list.push(d.data() as TiendaConfig));
      list.sort((a, b) => a.nombre.localeCompare(b.nombre));
      setTiendas(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'tiendas'));

    const unsubLogs = onSnapshot(collection(db, 'logs'), (snap) => {
      const list: LogRuta[] = [];
      snap.forEach(d => list.push(d.data() as LogRuta));
      setLogs(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'logs'));

    const unsubHistE = onSnapshot(collection(db, 'historial_entregas'), (snap) => {
      const list: HistorialEntrega[] = [];
      snap.forEach(d => list.push(d.data() as HistorialEntrega));
      setHistorialEntregas(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'historial_entregas'));

    const unsubHistR = onSnapshot(collection(db, 'historial_recolecciones'), (snap) => {
      const list: HistorialRecoleccion[] = [];
      snap.forEach(d => list.push(d.data() as HistorialRecoleccion));
      setHistorialRecolecciones(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'historial_recolecciones'));

    return () => {
      unsubPedidos();
      unsubRecs();
      unsubChoferes();
      unsubProveedores();
      unsubTiendas();
      unsubLogs();
      unsubHistE();
      unsubHistR();
    };
  }, []);

  // 2. Database Seeding on Bootstrap (if empty)
  useEffect(() => {
    const runSeeding = async () => {
      try {
        const lockRef = doc(db, 'system_config', 'seeding');
        const lockSnap = await getDoc(lockRef);
        
        // If we already seeded this database successfully in the past, DO NOT seed anything again.
        // This is crucial when the user intentionally clears orders for a new day.
        if (lockSnap.exists() && lockSnap.data()?.seeded === true) {
          console.log('[BOOT] Database is already initialized. Seeding step skipped.');
          return;
        }

        const seedConfig = [
          { name: 'pedidos', mock: initialPedidosMock, key: 'ticket' },
          { name: 'recolecciones', mock: initialRecsMock, key: 'id' },
          { name: 'choferes', mock: initialChoferesMock, key: 'id' },
          { name: 'proveedores', mock: initialProveedoresMock, key: 'nombre' },
          { name: 'tiendas', mock: initialTiendasMock, key: 'nombre' }
        ];

        let seededAny = false;
        for (const target of seedConfig) {
          const colRef = collection(db, target.name);
          const snap = await getDocs(colRef);
          if (snap.empty) {
            console.log(`[BOOT] Seeding Firestore collection "${target.name}" with default mock values.`);
            seededAny = true;
            for (const item of target.mock) {
              const docId = String((item as any)[target.key]).toUpperCase().trim().replace(/\//g, '-');
              await setDoc(doc(db, target.name, docId), item);
            }
          }
        }

        // Set the permanent initialization lock so it never seeds again
        await setDoc(lockRef, { seeded: true, timestamp: new Date().toISOString() });
        console.log('[BOOT] Database initialization marked as completed in Firestore.');
      } catch (err) {
        console.warn('Seeding execution bypassed or failed: ', err);
      }
    };
    runSeeding();
  }, []);

  // Sync offline queue to localStorage (local only backup helper)
  useEffect(() => {
    localStorage.setItem('logistika_offline_queue', JSON.stringify(offlineQueue));
  }, [offlineQueue]);

  // Firestore update helper for bulk/order mutations
  const syncListsToFirestore = (updatedPedidos: Pedido[], updatedRecs: Recoleccion[]) => {
    updatedPedidos.forEach(p => {
      const orig = pedidos.find(x => x.ticket === p.ticket);
      if (!orig || orig.orden !== p.orden || orig.chofer !== p.chofer || orig.dateenv !== p.dateenv || orig.estatus !== p.estatus) {
        setDoc(doc(db, 'pedidos', p.ticket), p).catch((e) => console.error(e));
      }
    });
    updatedRecs.forEach(r => {
      const orig = recolecciones.find(x => x.id === r.id);
      if (!orig || orig.orden !== r.orden || orig.chofer !== r.chofer || orig.fechaReal !== r.fechaReal || orig.estatus !== r.estatus || orig.direccion !== r.direccion) {
        setDoc(doc(db, 'recolecciones', r.id), r).catch((e) => console.error(e));
      }
    });
  };

  const verificarTicketExistente = (tienda: string, ticket: string): boolean => {
    const ticketBuscado = ticket.toString().trim().toUpperCase();
    return pedidos.some(p => p.ticket.toUpperCase() === ticketBuscado && p.tienda.toUpperCase() === tienda.toUpperCase().trim());
  };

  const guardarPedidoTienda = (datos: Partial<Pedido> & { idTicket: string; esEdicion?: boolean; numInt?: string; entregaEnTienda?: boolean; direccionPegada?: string }): { success: boolean, error?: string } => {
    try {
      const ticketNuevo = datos.idTicket.toUpperCase().trim();
      const esEdicion = !!datos.esEdicion;
      const tiendaName = datos.tienda || '';

      let dirFinal = '';
      if (datos.entregaEnTienda) {
        const storeMatch = tiendas.find(t => t.nombre.toUpperCase().trim() === tiendaName.toUpperCase().trim());
        if (!storeMatch) {
          return { success: false, error: 'No se encontró la dirección física de ' + tiendaName };
        }
        dirFinal = '(ENTREGA EN TIENDA:) ' + storeMatch.direccion.toUpperCase();
      } else {
        const prefijoInt = datos.numInt?.trim() ? `(INT. ${datos.numInt.toUpperCase()}) ` : '';
        dirFinal = (prefijoInt + (datos.direccionPegada || '')).toUpperCase().trim();
      }

      const { latitude, longitude } = mockGeocode(dirFinal);

      if (esEdicion) {
        const docRef = doc(db, 'pedidos', ticketNuevo);
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            setDoc(docRef, {
              ...snap.data(),
              cliente: (datos.cliente || '').toUpperCase().trim(),
              tel: datos.tel || '',
              dir: dirFinal,
              ref: (datos.ref || '').toUpperCase().trim(),
              tipo: datos.tipo || 'Todo el Ticket',
              obs: (datos.obs || '').toUpperCase().trim(),
              lat: latitude,
              lng: longitude
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${ticketNuevo}`));
          }
        });
      } else {
        if (verificarTicketExistente(tiendaName, ticketNuevo)) {
          return { success: false, error: 'Este ID de Ticket ya existe para esta tienda.' };
        }

        const nuevo: Pedido = {
          ticket: ticketNuevo,
          fecha: getMexicoCityDateTimeStr(),
          tienda: tiendaName.toUpperCase(),
          cliente: (datos.cliente || '').toUpperCase().trim(),
          tel: datos.tel || '',
          dir: dirFinal,
          ref: (datos.ref || '').toUpperCase().trim(),
          tipo: datos.tipo || 'Todo el Ticket',
          obs: (datos.obs || '').toUpperCase().trim(),
          estatus: 'CARGADO',
          comprasObs: '',
          comprasUbic: '',
          chofer: '',
          dateenv: '',
          orden: null,
          obsLogistica: '',
          lat: latitude,
          lng: longitude,
          dateped: getMexicoCityDateStr()
        };
        setDoc(doc(db, 'pedidos', ticketNuevo), nuevo)
          .catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${ticketNuevo}`));
      }

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const guardarDictamenCompras = (datos: { ticket: string; estatus: string; comprasObs: string; comprasUbic: string }): { success: boolean; error?: string } => {
    try {
      const ticketBuscado = datos.ticket.toUpperCase().trim();
      const docRef = doc(db, 'pedidos', ticketBuscado);
      getDoc(docRef).then(snap => {
        if (snap.exists()) {
          setDoc(docRef, {
            ...snap.data(),
            estatus: datos.estatus.toUpperCase() as any,
            comprasObs: datos.comprasObs.toUpperCase(),
            comprasUbic: datos.comprasUbic.toUpperCase()
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${ticketBuscado}`));
        }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const guardarSolicitudDesdeCompras = (datos: { idRec: string; proveedor: string; direccion: string; referencias: string; material: string; fechaDisponible: string }): { success: boolean; error?: string } => {
    try {
      const idManual = datos.idRec.trim().toUpperCase();
      const yaExiste = recolecciones.some(r => r.id.toUpperCase() === idManual);
      if (yaExiste) {
        return { success: false, error: "El folio '" + idManual + "' ya existe." };
      }

      const { latitude, longitude } = mockGeocode(datos.direccion);
      const provUpper = datos.proveedor.trim().toUpperCase();
      const provDocId = provUpper.replace(/\//g, '-');

      setDoc(doc(db, 'proveedores', provDocId), {
        nombre: provUpper,
        direccion: datos.direccion.toUpperCase(),
        referencia: datos.referencias.toUpperCase()
      }).catch(e => handleFirestoreError(e, OperationType.WRITE, `proveedores/${provDocId}`));

      const nueva: Recoleccion = {
        id: idManual,
        solicitante: 'COMPRAS',
        proveedor: provUpper,
        direccion: datos.direccion.toUpperCase(),
        referencias: datos.referencias.toUpperCase(),
        material: datos.material.toUpperCase(),
        fechaDisponible: datos.fechaDisponible,
        estatus: 'SOLICITADO',
        fechaAlta: getMexicoCityDateTimeStr(),
        lat: latitude,
        lng: longitude
      };

      setDoc(doc(db, 'recolecciones', idManual), nueva)
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${idManual}`));

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const crearNuevaRecoleccion = (p: Partial<Recoleccion>): boolean => {
    if (!p.id) return false;
    const { latitude, longitude } = mockGeocode(p.direccion || '');
    
    const provUpper = (p.proveedor || '').trim().toUpperCase();
    if (provUpper) {
      const provDocId = provUpper.replace(/\//g, '-');
      setDoc(doc(db, 'proveedores', provDocId), {
        nombre: provUpper,
        direccion: (p.direccion || '').toUpperCase(),
        referencia: (p.referencias || '').toUpperCase()
      }).catch(e => handleFirestoreError(e, OperationType.WRITE, `proveedores/${provDocId}`));
    }

    const nueva: Recoleccion = {
      id: p.id,
      solicitante: p.solicitante || 'LOGISTICA',
      proveedor: provUpper,
      direccion: (p.direccion || '').toUpperCase(),
      referencias: (p.referencias || '').toUpperCase(),
      material: (p.material || '').toUpperCase(),
      fechaDisponible: p.fechaDisponible || getMexicoCityDateStr(),
      estatus: 'PENDIENTE',
      fechaAlta: getMexicoCityDateTimeStr(),
      lat: latitude,
      lng: longitude
    };

    setDoc(doc(db, 'recolecciones', p.id), nueva)
      .catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${p.id}`));

    return true;
  };

  const obtenerSiguienteOrdenGlobal = (chofer: string, fecha: string): number => {
    if (!chofer || !fecha) return 1;
    const targetDate = normalizarFecha(fecha);
    const choferKey = chofer.trim().toUpperCase();
    let maxOrden = 0;

    pedidos.forEach(p => {
      if (p.chofer?.trim().toUpperCase() === choferKey && 
          normalizarFecha(p.dateenv || '') === targetDate && 
          p.estatus === 'PROGRAMADO') {
        const ord = Number(p.orden) || 0;
        if (ord > maxOrden) maxOrden = ord;
      }
    });

    recolecciones.forEach(r => {
      const rDate = r.fechaReal || r.fechaDisponible || '';
      if (r.chofer?.trim().toUpperCase() === choferKey && 
          normalizarFecha(rDate) === targetDate && 
          r.estatus === 'PROGRAMADO') {
        const ord = Number(r.orden) || 0;
        if (ord > maxOrden) maxOrden = ord;
      }
    });

    return maxOrden + 1;
  };

  const moverOrden = (payload: { chofer: string; fecha: string; idActual: string; hojaActual: 'ENTREGAS' | 'RECOLECCIONES'; ordenSolicitado: number }): { ok: boolean, ordenFinal: number } => {
    const { chofer, fecha, idActual, hojaActual, ordenSolicitado } = payload;
    const targetDate = normalizarFecha(fecha);
    const choferKey = chofer.trim().toUpperCase();

    const virtualList: Array<{ id: string; hoja: 'ENTREGAS' | 'RECOLECCIONES'; ordenActual: number | null }> = [];

    pedidos.forEach(p => {
      if (p.ticket !== idActual &&
          p.chofer?.trim().toUpperCase() === choferKey && 
          normalizarFecha(p.dateenv || '') === targetDate && 
          p.estatus === 'PROGRAMADO') {
        virtualList.push({ id: p.ticket, hoja: 'ENTREGAS', ordenActual: p.orden ?? null });
      }
    });

    recolecciones.forEach(r => {
      const rDate = r.fechaReal || r.fechaDisponible || '';
      if (r.id !== idActual &&
          r.chofer?.trim().toUpperCase() === choferKey && 
          normalizarFecha(rDate) === targetDate && 
          r.estatus === 'PROGRAMADO') {
        virtualList.push({ id: r.id, hoja: 'RECOLECCIONES', ordenActual: r.orden ?? null });
      }
    });

    virtualList.sort((a, b) => {
      if (a.ordenActual === null) return 1;
      if (b.ordenActual === null) return -1;
      return a.ordenActual - b.ordenActual;
    });

    let currentItem = { id: idActual, hoja: hojaActual, ordenActual: null as number | null };
    
    if (hojaActual === 'ENTREGAS') {
      const pMatch = pedidos.find(p => p.ticket === idActual);
      if (pMatch) currentItem.ordenActual = pMatch.orden ?? null;
    } else {
      const rMatch = recolecciones.find(r => r.id === idActual);
      if (rMatch) currentItem.ordenActual = rMatch.orden ?? null;
    }

    let destino = parseInt(String(ordenSolicitado)) || 1;
    if (virtualList.length > 0) {
      destino = Math.max(1, Math.min(destino, virtualList.length + 1));
    }

    virtualList.splice(destino - 1, 0, currentItem);

    const updatedPedidos = [...pedidos];
    const updatedRecs = [...recolecciones];

    virtualList.forEach((x, i) => {
      const nuevo = i + 1;
      if (x.hoja === 'ENTREGAS') {
        const pIdx = updatedPedidos.findIndex(p => p.ticket === x.id);
        if (pIdx >= 0) updatedPedidos[pIdx].orden = nuevo;
      } else {
        const rIdx = updatedRecs.findIndex(r => r.id === x.id);
        if (rIdx >= 0) updatedRecs[rIdx].orden = nuevo;
      }
    });

    setPedidos(updatedPedidos);
    setRecolecciones(updatedRecs);
    syncListsToFirestore(updatedPedidos, updatedRecs);

    return { ok: true, ordenFinal: destino };
  };

  const liberarOrden = (payload: { chofer: string; fecha: string; idActual: string; hojaActual: 'ENTREGAS' | 'RECOLECCIONES' }): { ok: boolean } => {
    const { chofer, fecha, idActual, hojaActual } = payload;
    const targetDate = normalizarFecha(fecha);
    const choferKey = chofer.trim().toUpperCase();

    const virtualList: Array<{ id: string; hoja: 'ENTREGAS' | 'RECOLECCIONES'; ordenActual: number | null }> = [];

    pedidos.forEach(p => {
      if (p.ticket !== idActual && 
          p.chofer?.trim().toUpperCase() === choferKey && 
          normalizarFecha(p.dateenv || '') === targetDate && 
          p.estatus === 'PROGRAMADO') {
        virtualList.push({ id: p.ticket, hoja: 'ENTREGAS', ordenActual: p.orden ?? null });
      }
    });

    recolecciones.forEach(r => {
      const rDate = r.fechaReal || r.fechaDisponible || '';
      if (r.id !== idActual && 
          r.chofer?.trim().toUpperCase() === choferKey && 
          normalizarFecha(rDate) === targetDate && 
          r.estatus === 'PROGRAMADO') {
        virtualList.push({ id: r.id, hoja: 'RECOLECCIONES', ordenActual: r.orden ?? null });
      }
    });

    virtualList.sort((a, b) => {
      if (a.ordenActual === null) return 1;
      if (b.ordenActual === null) return -1;
      return a.ordenActual - b.ordenActual;
    });

    const updatedPedidos = [...pedidos];
    const updatedRecs = [...recolecciones];

    virtualList.forEach((x, i) => {
      const nuevo = i + 1;
      if (x.hoja === 'ENTREGAS') {
        const pIdx = updatedPedidos.findIndex(p => p.ticket === x.id);
        if (pIdx >= 0) updatedPedidos[pIdx].orden = nuevo;
      } else {
        const rIdx = updatedRecs.findIndex(r => r.id === x.id);
        if (rIdx >= 0) updatedRecs[rIdx].orden = nuevo;
      }
    });

    if (hojaActual === 'ENTREGAS') {
      const pIdx = updatedPedidos.findIndex(p => p.ticket === idActual);
      if (pIdx >= 0) updatedPedidos[pIdx].orden = null;
    } else {
      const rIdx = updatedRecs.findIndex(r => r.id === idActual);
      if (rIdx >= 0) updatedRecs[rIdx].orden = null;
    }

    setPedidos(updatedPedidos);
    setRecolecciones(updatedRecs);
    syncListsToFirestore(updatedPedidos, updatedRecs);

    return { ok: true };
  };

  const actualizarPedidoLogistica = (p: { id: string; chofer: string; fecha: string; estatus: string; orden: number | ''; obs?: string }) => {
    const docRef = doc(db, 'pedidos', p.id);
    getDoc(docRef).then(snap => {
      if (snap.exists()) {
        const item = snap.data();
        setDoc(docRef, {
          ...item,
          chofer: p.chofer,
          dateenv: p.fecha,
          estatus: p.estatus as any,
          orden: p.orden === '' ? null : p.orden,
          obsLogistica: p.obs || item.obsLogistica || ''
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${p.id}`));
      }
    });
  };

  const actualizarRecoleccionLogistica = (p: { id: string; chofer: string; fecha: string; estatus: string; orden: number | ''; direccion?: string }) => {
    const docRef = doc(db, 'recolecciones', p.id);
    getDoc(docRef).then(snap => {
      if (snap.exists()) {
        const item = snap.data();
        const { latitude, longitude } = p.direccion ? mockGeocode(p.direccion) : { latitude: item.lat || 19.367508, longitude: item.lng || -99.284752 };
        setDoc(docRef, {
          ...item,
          chofer: p.chofer,
          fechaReal: p.fecha,
          estatus: p.estatus as any,
          orden: p.orden === '' ? null : p.orden,
          direccion: p.direccion ? p.direccion.toUpperCase() : item.direccion,
          lat: p.direccion ? latitude : (item.lat || 19.367508),
          lng: p.direccion ? longitude : (item.lng || -99.284752)
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${p.id}`));
      }
    });
  };

  const guardarServicioConOrden = (p: { id: string; hoja: 'ENTREGAS' | 'RECOLECCIONES'; chofer: string; fecha: string; estatus: string; orden: number | ''; obs?: string; direccion?: string }): { ok: boolean; msg?: string; ordenFinal?: number | '' } => {
    try {
      // 1. Prepare fully updated in-memory arrays
      const updatedPedidos = [...pedidos];
      const updatedRecs = [...recolecciones];

      // Find the target element in current state arrays
      const targetPedIdx = p.hoja === 'ENTREGAS' ? updatedPedidos.findIndex(x => x.ticket === p.id) : -1;
      const targetRecIdx = p.hoja === 'RECOLECCIONES' ? updatedRecs.findIndex(x => x.id === p.id) : -1;

      if (p.hoja === 'ENTREGAS' && targetPedIdx === -1) {
        return { ok: false, msg: 'No se encontró el pedido a planificar en el listado.' };
      }
      if (p.hoja === 'RECOLECCIONES' && targetRecIdx === -1) {
        return { ok: false, msg: 'No se encontró la recolección a planificar en el listado.' };
      }

      // Record the OLD state to identify changes
      const viejo = p.hoja === 'ENTREGAS'
        ? { chofer: updatedPedidos[targetPedIdx].chofer, fecha: updatedPedidos[targetPedIdx].dateenv, estatus: updatedPedidos[targetPedIdx].estatus, orden: updatedPedidos[targetPedIdx].orden }
        : { chofer: updatedRecs[targetRecIdx].chofer, fecha: updatedRecs[targetRecIdx].fechaReal || updatedRecs[targetRecIdx].fechaDisponible, estatus: updatedRecs[targetRecIdx].estatus, orden: updatedRecs[targetRecIdx].orden };

      // Make initial modifications to basic fields in the cloned objects
      if (p.hoja === 'ENTREGAS') {
        updatedPedidos[targetPedIdx] = {
          ...updatedPedidos[targetPedIdx],
          chofer: p.chofer,
          dateenv: p.fecha,
          estatus: p.estatus as any,
          obsLogistica: p.obs !== undefined ? p.obs : (updatedPedidos[targetPedIdx].obsLogistica || ''),
          orden: p.orden === '' ? null : p.orden
        };
      } else {
        const currentRec = updatedRecs[targetRecIdx];
        const { latitude, longitude } = p.direccion ? mockGeocode(p.direccion) : { latitude: currentRec.lat || 19.367508, longitude: currentRec.lng || -99.284752 };
        updatedRecs[targetRecIdx] = {
          ...currentRec,
          chofer: p.chofer,
          fechaReal: p.fecha,
          estatus: p.estatus as any,
          direccion: p.direccion ? p.direccion.toUpperCase() : currentRec.direccion,
          lat: latitude,
          lng: longitude,
          orden: p.orden === '' ? null : p.orden
        };
      }

      // Check for driver / date / status assignment cambios that vacate the previous slot
      const cambioChofer = String(viejo.chofer || '').toUpperCase() !== String(p.chofer || '').toUpperCase();
      const cambioFecha = normalizarFecha(viejo.fecha || '') !== normalizarFecha(p.fecha || '');
      const yaNoProgram = String(p.estatus || '').toUpperCase() !== 'PROGRAMADO';

      if ((cambioChofer || cambioFecha || yaNoProgram) && String(viejo.estatus || '').toUpperCase() === 'PROGRAMADO') {
        const oldChoferKey = (viejo.chofer || '').trim().toUpperCase();
        const oldTargetDate = normalizarFecha(viejo.fecha || '');

        // Gather remaining items for the old group to fill the gap sequentially
        const oldGroupItems: Array<{ id: string; hoja: 'ENTREGAS' | 'RECOLECCIONES'; ordenActual: number | null }> = [];
        updatedPedidos.forEach(x => {
          if (x.ticket !== p.id &&
              String(x.chofer || '').trim().toUpperCase() === oldChoferKey &&
              normalizarFecha(x.dateenv || '') === oldTargetDate &&
              String(x.estatus).toUpperCase() === 'PROGRAMADO') {
            oldGroupItems.push({ id: x.ticket, hoja: 'ENTREGAS', ordenActual: x.orden ?? null });
          }
        });
        updatedRecs.forEach(x => {
          const rDate = x.fechaReal || x.fechaDisponible || '';
          if (x.id !== p.id &&
              String(x.chofer || '').trim().toUpperCase() === oldChoferKey &&
              normalizarFecha(rDate) === oldTargetDate &&
              String(x.estatus).toUpperCase() === 'PROGRAMADO') {
            oldGroupItems.push({ id: x.id, hoja: 'RECOLECCIONES', ordenActual: x.orden ?? null });
          }
        });

        oldGroupItems.sort((a, b) => {
          if (a.ordenActual === null) return 1;
          if (b.ordenActual === null) return -1;
          return a.ordenActual - b.ordenActual;
        });

        oldGroupItems.forEach((x, index) => {
          const nuevoSec = index + 1;
          if (x.hoja === 'ENTREGAS') {
            const pIdx = updatedPedidos.findIndex(item => item.ticket === x.id);
            if (pIdx >= 0) updatedPedidos[pIdx].orden = nuevoSec;
          } else {
            const rIdx = updatedRecs.findIndex(item => item.id === x.id);
            if (rIdx >= 0) updatedRecs[rIdx].orden = nuevoSec;
          }
        });
      }

      // Process sequence numbering for the new slot
      let ordenFinal: number | '' = '';
      if (String(p.estatus).toUpperCase() === 'PROGRAMADO') {
        const newChoferKey = p.chofer.trim().toUpperCase();
        const newTargetDate = normalizarFecha(p.fecha);

        // Gather all other programmed route items under this new assignment (excluding the current one)
        const otherGroupItems: Array<{ id: string; hoja: 'ENTREGAS' | 'RECOLECCIONES'; ordenActual: number | null }> = [];
        updatedPedidos.forEach(x => {
          if (x.ticket !== p.id &&
              String(x.chofer || '').trim().toUpperCase() === newChoferKey &&
              normalizarFecha(x.dateenv || '') === newTargetDate &&
              String(x.estatus).toUpperCase() === 'PROGRAMADO') {
            otherGroupItems.push({ id: x.ticket, hoja: 'ENTREGAS', ordenActual: x.orden ?? null });
          }
        });
        updatedRecs.forEach(x => {
          const rDate = x.fechaReal || x.fechaDisponible || '';
          if (x.id !== p.id &&
              String(x.chofer || '').trim().toUpperCase() === newChoferKey &&
              normalizarFecha(rDate) === newTargetDate &&
              String(x.estatus).toUpperCase() === 'PROGRAMADO') {
            otherGroupItems.push({ id: x.id, hoja: 'RECOLECCIONES', ordenActual: x.orden ?? null });
          }
        });

        // Always sort existing others by order to avoid randomness
        otherGroupItems.sort((a, b) => {
          if (a.ordenActual === null) return 1;
          if (b.ordenActual === null) return -1;
          return a.ordenActual - b.ordenActual;
        });

        if (p.orden === '') {
          // If no sequence was designated, put it at the very first slot at the end
          ordenFinal = otherGroupItems.length + 1;
          if (p.hoja === 'ENTREGAS') {
            updatedPedidos[targetPedIdx].orden = ordenFinal;
          } else {
            updatedRecs[targetRecIdx].orden = ordenFinal;
          }
        } else {
          // Precise manual reordering shift desired
          let destino = parseInt(String(p.orden)) || 1;
          if (otherGroupItems.length > 0) {
            destino = Math.max(1, Math.min(destino, otherGroupItems.length + 1));
          }
          ordenFinal = destino;

          // Splice our current item into the sorted other list at the target index (destino - 1)
          const targetItem = { 
            id: p.id, 
            hoja: p.hoja, 
            ordenActual: p.orden
          };
          otherGroupItems.splice(destino - 1, 0, targetItem);

          // Force precise sequential index numbers (1, 2, 3...) on all of them
          otherGroupItems.forEach((x, index) => {
            const nuevoSec = index + 1;
            if (x.hoja === 'ENTREGAS') {
              const pIdx = updatedPedidos.findIndex(item => item.ticket === x.id);
              if (pIdx >= 0) updatedPedidos[pIdx].orden = nuevoSec;
            } else {
              const rIdx = updatedRecs.findIndex(item => item.id === x.id);
              if (rIdx >= 0) updatedRecs[rIdx].orden = nuevoSec;
            }
          });
        }
      } else {
        // Unprogram/revisar status gets order null
        if (p.hoja === 'ENTREGAS') {
          updatedPedidos[targetPedIdx].orden = null;
        } else {
          updatedRecs[targetRecIdx].orden = null;
        }
      }

      // Update context in-memory lists state
      setPedidos(updatedPedidos);
      setRecolecciones(updatedRecs);

      // Perform selective Firestore updates to minimize database I/O and prevent race condition locks
      updatedPedidos.forEach(x => {
        const orig = pedidos.find(o => o.ticket === x.ticket);
        const hasChanges = !orig || 
          orig.orden !== x.orden || 
          orig.chofer !== x.chofer || 
          orig.dateenv !== x.dateenv || 
          orig.estatus !== x.estatus || 
          orig.obsLogistica !== x.obsLogistica;
        
        if (hasChanges) {
          setDoc(doc(db, 'pedidos', x.ticket), x).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${x.ticket}`));
        }
      });

      updatedRecs.forEach(x => {
        const orig = recolecciones.find(o => o.id === x.id);
        const rDateOrig = orig ? (orig.fechaReal || orig.fechaDisponible || '') : '';
        const rDateNew = x.fechaReal || x.fechaDisponible || '';
        const hasChanges = !orig || 
          orig.orden !== x.orden || 
          orig.chofer !== x.chofer || 
          rDateOrig !== rDateNew || 
          orig.estatus !== x.estatus || 
          orig.direccion !== x.direccion ||
          orig.lat !== x.lat ||
          orig.lng !== x.lng;

        if (hasChanges) {
          setDoc(doc(db, 'recolecciones', x.id), x).catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${x.id}`));
        }
      });

      return { ok: true, ordenFinal: ordenFinal };
    } catch (e: any) {
      console.error('Error saving service sequence custom order:', e);
      return { ok: false, msg: e.message };
    }
  };

  const obtenerTareasChofer = (nombre: string): Array<any> => {
    const res: any[] = [];
    const nombreB = nombre.trim().toLowerCase();
    if (!nombreB) return [];

    pedidos.forEach(p => {
      const choferP = (p.chofer || '').trim().toLowerCase();
      
      // Look for latest offline queue entry for this ticket
      const offlineItems = offlineQueue.filter(item => item.id === p.ticket && item.hoja === 'DB_PEDIDOS');
      const latestOffline = offlineItems.length > 0 ? offlineItems[offlineItems.length - 1] : null;
      const estatus = latestOffline ? latestOffline.nuevoEstatus : p.estatus;
      const estatusP = estatus.toUpperCase();

      if (choferP === nombreB && estatusP !== 'FINALIZADO') {
        res.push({
          id: p.ticket,
          tienda: p.tienda,
          cliente: p.cliente,
          telefono: p.tel,
          direccion: p.dir,
          referencia: p.ref,
          estatus: estatus,
          tipo: 'Entrega',
          hoja: 'DB_PEDIDOS',
          orden: p.orden || 999
        });
      }
    });

    recolecciones.forEach(r => {
      const choferR = (r.chofer || '').trim().toLowerCase();
      
      // Look for latest offline queue entry for this recolección
      const offlineItems = offlineQueue.filter(item => item.id === r.id && item.hoja === 'DB_RECOLECCIONES');
      const latestOffline = offlineItems.length > 0 ? offlineItems[offlineItems.length - 1] : null;
      const estatus = latestOffline ? latestOffline.nuevoEstatus : r.estatus;
      const estatusR = estatus.toUpperCase();

      if (choferR === nombreB && estatusR !== 'FINALIZADO' && estatusR !== 'RECOLECTADO') {
        res.push({
          id: r.id,
          cliente: r.proveedor,
          telefono: '',
          direccion: r.direccion,
          referencia: r.referencias,
          estatus: estatus,
          tipo: 'Recolección',
          hoja: 'DB_RECOLECCIONES',
          orden: r.orden || 999
        });
      }
    });

    return res.sort((a, b) => a.orden - b.orden);
  };

  const actualizarEstatusChofer = (d: { id: string; hoja: 'DB_PEDIDOS' | 'DB_RECOLECCIONES'; nuevoEstatus: string; chofer: string; lat: number; lng: number; receptor?: string; fotos?: string[] }): string | boolean => {
    try {
      const ahora = getMexicoCityDateTimeStr();

      if (d.hoja === 'DB_PEDIDOS') {
        const docRef = doc(db, 'pedidos', d.id);
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            const currentData = snap.data();
            const updateObj: any = {
              ...currentData,
              estatus: d.nuevoEstatus.toUpperCase() as any,
              receptor: (d.nuevoEstatus.toUpperCase() === 'FINALIZADO') ? d.receptor?.toUpperCase() : (currentData.receptor || '')
            };
            if (d.fotos && d.fotos.length > 0) {
              updateObj.fotos = d.fotos;
            }
            setDoc(docRef, updateObj).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${d.id}`));
          }
        });
      } else {
        const docRef = doc(db, 'recolecciones', d.id);
        getDoc(docRef).then(snap => {
          if (snap.exists()) {
            const currentData = snap.data();
            const updateObj: any = {
              ...currentData,
              estatus: d.nuevoEstatus.toUpperCase() as any,
              fechaReal: (d.nuevoEstatus.toUpperCase() === 'FINALIZADO' || d.nuevoEstatus.toUpperCase() === 'RECOLECTADO') ? ahora.split(' ')[0] : (currentData.fechaReal || '')
            };
            if (d.fotos && d.fotos.length > 0) {
              updateObj.fotos = d.fotos;
            }
            setDoc(docRef, updateObj).catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${d.id}`));
          }
        });
      }

      const dName = d.chofer.toLowerCase();
      choferes.forEach(ch => {
        if (ch.nombre.toLowerCase() === dName) {
          setDoc(doc(db, 'choferes', ch.id), {
            ...ch,
            lat: d.lat || ch.lat,
            lng: d.lng || ch.lng,
            ultimaUbicacion: ahora
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `choferes/${ch.id}`));
        }
      });

      const logId = `${d.id}_${d.chofer}_${d.nuevoEstatus.toUpperCase() === 'EN RUTA' ? 'iniciada' : 'finalizada'}`;
      if (d.nuevoEstatus.toUpperCase() === 'EN RUTA') {
        setDoc(doc(db, 'logs', logId), {
          ticketId: d.id,
          chofer: d.chofer,
          horaInicio: ahora,
          ubicacionInicio: `${d.lat},${d.lng}`
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `logs/${logId}`));
      } else if (d.nuevoEstatus.toUpperCase() === 'FINALIZADO' || d.nuevoEstatus.toUpperCase() === 'RECOLECTADO') {
        const logQuery = logs.find(l => l.ticketId === d.id && l.chofer === d.chofer && !l.horaFin);
        if (logQuery) {
          const logRefId = logId;
          setDoc(doc(db, 'logs', logRefId), {
            ...logQuery,
            horaFin: ahora,
            ubicacionFin: `${d.lat},${d.lng}`,
            recibio: d.receptor || (d.hoja === 'DB_RECOLECCIONES' ? 'RECOLECTADO' : '')
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `logs/${logRefId}`));
        } else {
          setDoc(doc(db, 'logs', logId), {
            ticketId: d.id,
            chofer: d.chofer,
            horaFin: ahora,
            ubicacionFin: `${d.lat},${d.lng}`,
            recibio: d.receptor || (d.hoja === 'DB_RECOLECCIONES' ? 'RECOLECTADO' : '')
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `logs/${logId}`));
        }
      }

      return true;
    } catch (e: any) {
      return "Error: " + e.toString();
    }
  };

  const subirFotoDrive = (idPedido: string, base64Data: string | string[]): string => {
    const urls = Array.isArray(base64Data) ? base64Data : (base64Data ? [base64Data] : []);
    const principalFoto = urls[0] || '';
    const cleanId = idPedido.trim();
    const upperId = idPedido.toUpperCase().trim();

    // 1. Try with exact ID in pedidos
    const docRefPedido = doc(db, 'pedidos', cleanId);
    getDoc(docRefPedido).then(snap => {
      if (snap.exists()) {
        setDoc(docRefPedido, {
          ...snap.data(),
          fotoUrl: principalFoto
        }).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${cleanId}`));
      } else {
        // 2. Try with uppercase ID in pedidos
        const docRefPedidoUpper = doc(db, 'pedidos', upperId);
        getDoc(docRefPedidoUpper).then(snapUpper => {
          if (snapUpper.exists()) {
            setDoc(docRefPedidoUpper, {
              ...snapUpper.data(),
              fotoUrl: principalFoto
            }).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${upperId}`));
          } else {
            // 3. Try in recolecciones with exact ID
            const docRefRec = doc(db, 'recolecciones', cleanId);
            getDoc(docRefRec).then(snapRec => {
              if (snapRec.exists()) {
                setDoc(docRefRec, {
                  ...snapRec.data(),
                  fotoUrl: principalFoto
                }).catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${cleanId}`));
              } else {
                // 4. Try in recolecciones with uppercase ID
                const docRefRecUpper = doc(db, 'recolecciones', upperId);
                getDoc(docRefRecUpper).then(snapRecUpper => {
                  if (snapRecUpper.exists()) {
                    setDoc(docRefRecUpper, {
                      ...snapRecUpper.data(),
                      fotoUrl: principalFoto
                    }).catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${upperId}`));
                  }
                });
              }
            });
          }
        });
      }
    });

    return `https://drive.google.com/thumbnail?id=simulated_file_${idPedido}_${new Date().getTime()}`;
  };

  const calcularDistanciaKm = (lat1: number | string, lng1: number | string, lat2: number | string, lng2: number | string): number => {
    const p1Lat = typeof lat1 === 'string' ? parseFloat(lat1) : lat1;
    const p1Lng = typeof lng1 === 'string' ? parseFloat(lng1) : lng1;
    const p2Lat = typeof lat2 === 'string' ? parseFloat(lat2) : lat2;
    const p2Lng = typeof lng2 === 'string' ? parseFloat(lng2) : lng2;

    if (isNaN(p1Lat) || isNaN(p1Lng) || isNaN(p2Lat) || isNaN(p2Lng)) return 5.0; // Fallback distance in km

    const R = 6371; // Earth ratio in km
    const dLat = (p2Lat - p1Lat) * Math.PI / 180;
    const dLng = (p2Lng - p1Lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(p1Lat * Math.PI / 180) * Math.cos(p2Lat * Math.PI / 180) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const obtenerVelocidadPromedioYMultiplicador = (currTime: Date): { velocidadKmh: number; factorCircuito: number; overheadDeManiobraMins: number } => {
    const horas = currTime.getHours() + currTime.getMinutes() / 60;
    let velocidadKmh = 25.0; // Base speed: 25 km/h
    let overheadDeManiobraMins = 5; // buffer for parking, gates, signature
    
    // Circuity factor (Manhattan index) converts geodesic distance to realistic urban pathways in CDMX/EdoMex
    const factorCircuito = 1.35; 

    // Dynamic Traffic Speed Profiles
    if (horas >= 8.0 && horas < 10.5) {
      // morning rush
      velocidadKmh = 14.0; 
      overheadDeManiobraMins = 8;
    } else if (horas >= 10.5 && horas < 13.5) {
      // mid morning off-peak
      velocidadKmh = 24.0;
      overheadDeManiobraMins = 5;
    } else if (horas >= 13.5 && horas < 16.0) {
      // lunch rush hour
      velocidadKmh = 18.0;
      overheadDeManiobraMins = 7;
    } else if (horas >= 16.0 && horas < 18.0) {
      // afternoon off-peak
      velocidadKmh = 22.0;
      overheadDeManiobraMins = 5;
    } else if (horas >= 18.0 && horas < 20.5) {
      // evening rush hour
      velocidadKmh = 11.0;
      overheadDeManiobraMins = 10;
    } else {
      // nighttime
      velocidadKmh = 32.0;
      overheadDeManiobraMins = 3;
    }

    // Weekend factor adjustments
    const diaSemana = currTime.getDay(); // 0 is Sunday, 6 is Saturday
    if (diaSemana === 0) {
      // Sunday has lightweight traffic
      velocidadKmh *= 1.45;
      overheadDeManiobraMins = Math.max(3, overheadDeManiobraMins - 3);
    } else if (diaSemana === 6) {
      // Saturday has intermediate traffic
      velocidadKmh *= 1.15;
    }

    return { velocidadKmh, factorCircuito, overheadDeManiobraMins };
  };

  const calcularMinutosViaje = (
    latOri: number | string, lngOri: number | string,
    latDest: number | string, lngDest: number | string,
    currTime: Date
  ): number => {
    const distanceLineal = calcularDistanciaKm(latOri, lngOri, latDest, lngDest);

    // Highly proximate stops (same complex, street block or adjacent building)
    if (distanceLineal < 0.18) {
      return 3; // 3 minutes parking/maneuvering
    }

    const { velocidadKmh, factorCircuito, overheadDeManiobraMins } = obtenerVelocidadPromedioYMultiplicador(currTime);
    const distanciaCalle = distanceLineal * factorCircuito;
    const horasViaje = distanciaCalle / velocidadKmh;
    const minsCalculado = Math.round(horasViaje * 60) + overheadDeManiobraMins;

    // Set a solid operational floor of at least 7 minutes transit between any standard physical locations
    return Math.max(7, minsCalculado);
  };

  const _calcularCronograma = (ruta: any[], targetDate: string, nombreChofer: string, ticketStartingNow?: string) => {
    const cronograma: any[] = [];
    const TIEMPO_DESCARGA = 30; // mins
    const MARGEN_VENTANA = 25; // mins

    let currTime = new Date(`${targetDate}T08:30:00`);
    const todayStr = getMexicoCityDateStr();
    const isToday = targetDate === todayStr;
    const now = new Date();

    // Establish the driver's start location for the daily sequence
    let lastLat: number | string = 19.367508;
    let lastLng: number | string = -99.284752;

    const primerItem = ruta[0];
    if (primerItem && primerItem.tienda) {
      const st = tiendas.find(t => t.nombre.toUpperCase().trim() === primerItem.tienda.toUpperCase().trim());
      if (st) {
        const geoStore = mockGeocode(st.direccion || '');
        lastLat = geoStore.latitude;
        lastLng = geoStore.longitude;
      }
    }

    ruta.forEach(item => {
      const logEntry = logs.find(l => l.ticketId === item.id && l.chofer?.trim().toUpperCase() === nombreChofer.trim().toUpperCase());
      let tieneHoraInicio = !!logEntry?.horaInicio;
      let tieneHoraFin = !!logEntry?.horaFin;
      let horaInicioVal = logEntry?.horaInicio ? new Date(logEntry.horaInicio) : null;
      let horaFinVal = logEntry?.horaFin ? new Date(logEntry.horaFin) : null;

      // Clean current location coords for distance calculations
      const destLat = item.lat || 19.367508;
      const destLng = item.lng || -99.284752;

      if (item.id === ticketStartingNow) {
        tieneHoraInicio = true;
        tieneHoraFin = false;
        horaInicioVal = now;
      }

      if (tieneHoraFin && horaFinVal) {
        cronograma.push({
          id: item.id,
          tipo: item.tipo,
          destino: item.destino,
          direccion: item.direccion,
          realizado: true,
          enRuta: false,
          ventana: "FINALIZADO: " + horaFinVal.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
        // The driver leaves immediately after finalising the delivery download. 
        // No extra TIEMPO_DESCARGA is added to currTime because the task is already finalized.
        currTime = horaFinVal;
      } else if (tieneHoraInicio && horaInicioVal) {
        currTime = horaInicioVal;
        const minutosViaje = calcularMinutosViaje(lastLat, lastLng, destLat, destLng, currTime);
        const llegada = new Date(currTime.getTime() + minutosViaje * 60000);
        const ventanaFin = new Date(llegada.getTime() + MARGEN_VENTANA * 60000);

        cronograma.push({
          id: item.id,
          tipo: item.tipo,
          destino: item.destino,
          direccion: item.direccion,
          realizado: false,
          enRuta: true,
          ventana: "ESTIMADO: " + 
            llegada.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + " - " +
            ventanaFin.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
        currTime = new Date(ventanaFin.getTime() + TIEMPO_DESCARGA * 60000);
      } else {
        // Dynamic Offset: If calculating today's route, pending estimates cannot start in the past
        if (isToday) {
          currTime = new Date(Math.max(currTime.getTime(), now.getTime()));
        }

        const minutosViaje = calcularMinutosViaje(lastLat, lastLng, destLat, destLng, currTime);
        const llegada = new Date(currTime.getTime() + minutosViaje * 60000);
        const ventanaFin = new Date(llegada.getTime() + MARGEN_VENTANA * 60000);

        cronograma.push({
          id: item.id,
          tipo: item.tipo,
          destino: item.destino,
          direccion: item.direccion,
          realizado: false,
          enRuta: false,
          ventana: 
            llegada.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) + " - " +
            ventanaFin.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
        });
        currTime = new Date(ventanaFin.getTime() + TIEMPO_DESCARGA * 60000);
      }

      // Progress position tracker to the completed/forecast coordinates
      lastLat = destLat;
      lastLng = destLng;
    });

    return cronograma;
  };

  const obtenerProyeccionRuta = (nombreChofer: string, fechaFila: string, ticketStartingNow?: string) => {
    const targetDate = normalizarFecha(fechaFila || new Date());
    const choferKey = nombreChofer.trim().toUpperCase();

    const rutaUnificada: any[] = [];

    // Active deliveries
    pedidos.forEach(p => {
      if (p.chofer?.trim().toUpperCase() === choferKey && normalizarFecha(p.dateenv || '') === targetDate) {
        rutaUnificada.push({
          id: p.ticket,
          tipo: 'ENTREGA',
          destino: p.cliente,
          direccion: p.dir,
          orden: p.orden || 99,
          lat: p.lat,
          lng: p.lng,
          tienda: p.tienda
        });
      }
    });

    // Archived deliveries
    historialEntregas.forEach(p => {
      if (p.chofer?.trim().toUpperCase() === choferKey && normalizarFecha(p.dateenv || '') === targetDate) {
        if (!rutaUnificada.some(x => x.id === p.ticket)) {
          rutaUnificada.push({
            id: p.ticket,
            tipo: 'ENTREGA',
            destino: p.cliente,
            direccion: p.dir,
            orden: p.orden || 99,
            lat: p.lat,
            lng: p.lng,
            tienda: p.tienda
          });
        }
      }
    });

    // Active recolecciones
    recolecciones.forEach(r => {
      const rDate = r.fechaReal || r.fechaDisponible;
      if (r.chofer?.trim().toUpperCase() === choferKey && normalizarFecha(rDate || '') === targetDate) {
        rutaUnificada.push({
          id: r.id,
          tipo: 'RECOLECCIÓN',
          destino: r.proveedor,
          direccion: r.direccion,
          orden: r.orden || 99,
          lat: r.lat,
          lng: r.lng,
          tienda: ''
        });
      }
    });

    // Archived recolecciones
    historialRecolecciones.forEach(r => {
      const rDate = r.fechaReal || r.fechaDisponible;
      if (r.chofer?.trim().toUpperCase() === choferKey && normalizarFecha(rDate || '') === targetDate) {
        if (!rutaUnificada.some(x => x.id === r.id)) {
          rutaUnificada.push({
            id: r.id,
            tipo: 'RECOLECCIÓN',
            destino: r.proveedor,
            direccion: r.direccion,
            orden: r.orden || 99,
            lat: r.lat,
            lng: r.lng,
            tienda: ''
          });
        }
      }
    });

    rutaUnificada.sort((a, b) => a.orden - b.orden);

    // Let's check if there is some activity (horaInicio or horaFin) recorded in logs for this driver on this route.
    let earliestActivity: Date | null = null;
    rutaUnificada.forEach(item => {
      const logEntry = logs.find(l => l.ticketId === item.id && l.chofer?.trim().toUpperCase() === choferKey);
      if (logEntry) {
        if (logEntry.horaInicio) {
          const d = new Date(logEntry.horaInicio);
          if (!earliestActivity || d < earliestActivity) {
            earliestActivity = d;
          }
        }
        if (logEntry.horaFin) {
          const d = new Date(logEntry.horaFin);
          if (!earliestActivity || d < earliestActivity) {
            earliestActivity = d;
          }
        }
      }
    });

    if (ticketStartingNow) {
      earliestActivity = new Date();
    }

    const formatTo12h = (d: Date): string => {
      return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    };

    const displayInicio = earliestActivity 
      ? formatTo12h(earliestActivity) 
      : 'Pendiente (Al iniciar primer recorrido)';

    const crono = _calcularCronograma(rutaUnificada, targetDate, nombreChofer, ticketStartingNow);

    return {
      inicio: displayInicio,
      fechaConsultada: formatedDisplayDate(targetDate),
      ruta: crono
    };
  };

  const obtenerProyeccionRutaPorTienda = (ticket: string, tienda: string) => {
    const p = pedidos.find(x => x.ticket.toUpperCase() === ticket.toUpperCase());
    if (!p || !p.chofer || !p.dateenv) {
      return { ok: false, msg: 'Este pedido aún no tiene chofer o fecha asignada.' };
    }

    const proy = obtenerProyeccionRuta(p.chofer, p.dateenv);
    const ticketIdsDeTienda = pedidos
      .filter(x => x.tienda.toUpperCase().trim() === tienda.toUpperCase().trim())
      .map(x => x.ticket.toUpperCase());

    const rutaMarcada = proy.ruta.map(item => ({
      ...item,
      esDeTienda: ticketIdsDeTienda.includes(item.id.toUpperCase())
    }));

    return {
      ok: true,
      chofer: p.chofer,
      fechaConsultada: proy.fechaConsultada,
      inicio: proy.inicio,
      ruta: rutaMarcada
    };
  };

  const obtenerEtaParaTicket = (chofer: string, idTicket: string, targetDate: string, startingNow: boolean = false): string => {
    try {
      const proy = obtenerProyeccionRuta(chofer, targetDate, startingNow ? idTicket : undefined);
      const parada = proy.ruta.find(x => x.id === idTicket);
      if (parada && parada.ventana) {
        const v = parada.ventana.replace('ESTIMADO:', '').trim();
        const partes = v.split('-');
        if (partes.length === 2) {
          return "entre las " + partes[0].trim() + " y las " + partes[1].trim();
        }
        return v;
      }
      return 'en los próximos minutos';
    } catch {
      return 'en los próximos minutos';
    }
  };

  const agregarChofer = (nombre: string) => {
    const nextId = String(choferes.length + 1);
    const docRef = doc(db, 'choferes', nextId);
    setDoc(docRef, {
      id: nextId,
      nombre,
      lat: 19.367508,
      lng: -99.284752,
      ultimaUbicacion: ''
    }).catch(e => handleFirestoreError(e, OperationType.WRITE, `choferes/${nextId}`));
  };

  const editarChofer = (filaIdx: number, nombre: string) => {
    const idx = filaIdx - 2;
    const target = choferes[idx];
    if (target) {
      const docRef = doc(db, 'choferes', target.id);
      setDoc(docRef, { ...target, nombre })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `choferes/${target.id}`));
    }
  };

  const eliminarChofer = (filaIdx: number) => {
    const idx = filaIdx - 2;
    const target = choferes[idx];
    if (target) {
      deleteDoc(doc(db, 'choferes', target.id))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `choferes/${target.id}`));
    }
  };

  const agregarProveedor = (data: ProveedorConfig) => {
    const docId = data.nombre.toUpperCase().trim().replace(/\//g, '-');
    setDoc(doc(db, 'proveedores', docId), {
      nombre: data.nombre.toUpperCase(),
      direccion: data.direccion.toUpperCase(),
      referencia: data.referencia.toUpperCase()
    }).catch(e => handleFirestoreError(e, OperationType.WRITE, `proveedores/${docId}`));
  };

  const editarProveedor = (filaIdx: number, data: ProveedorConfig) => {
    const idx = filaIdx - 2;
    const target = proveedores[idx];
    if (target) {
      const oldDocId = target.nombre.toUpperCase().trim().replace(/\//g, '-');
      const newDocId = data.nombre.toUpperCase().trim().replace(/\//g, '-');
      
      const proceed = async () => {
        if (oldDocId !== newDocId) {
          await deleteDoc(doc(db, 'proveedores', oldDocId));
        }
        await setDoc(doc(db, 'proveedores', newDocId), {
          nombre: data.nombre.toUpperCase(),
          direccion: data.direccion.toUpperCase(),
          referencia: data.referencia.toUpperCase()
        });
      };
      proceed().catch(e => handleFirestoreError(e, OperationType.WRITE, `proveedores/${newDocId}`));
    }
  };

  const eliminarProveedor = (filaIdx: number) => {
    const idx = filaIdx - 2;
    const target = proveedores[idx];
    if (target) {
      const docId = target.nombre.toUpperCase().trim().replace(/\//g, '-');
      deleteDoc(doc(db, 'proveedores', docId))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `proveedores/${docId}`));
    }
  };

  const agregarTienda = (data: TiendaConfig) => {
    const docId = data.nombre.toUpperCase().trim().replace(/\//g, '-');
    setDoc(doc(db, 'tiendas', docId), {
      nombre: data.nombre.toUpperCase(),
      direccion: data.direccion.toUpperCase(),
      siglas: data.siglas.toUpperCase()
    }).catch(e => handleFirestoreError(e, OperationType.WRITE, `tiendas/${docId}`));
  };

  const editarTienda = (filaIdx: number, data: TiendaConfig) => {
    const idx = filaIdx - 2;
    const target = tiendas[idx];
    if (target) {
      const oldDocId = target.nombre.toUpperCase().trim().replace(/\//g, '-');
      const newDocId = data.nombre.toUpperCase().trim().replace(/\//g, '-');
      
      const proceed = async () => {
        if (oldDocId !== newDocId) {
          await deleteDoc(doc(db, 'tiendas', oldDocId));
        }
        await setDoc(doc(db, 'tiendas', newDocId), {
          nombre: data.nombre.toUpperCase(),
          direccion: data.direccion.toUpperCase(),
          siglas: data.siglas.toUpperCase()
        });
      };
      proceed().catch(e => handleFirestoreError(e, OperationType.WRITE, `tiendas/${newDocId}`));
    }
  };

  const eliminarTienda = (filaIdx: number) => {
    const idx = filaIdx - 2;
    const target = tiendas[idx];
    if (target) {
      const docId = target.nombre.toUpperCase().trim().replace(/\//g, '-');
      deleteDoc(doc(db, 'tiendas', docId))
        .catch(e => handleFirestoreError(e, OperationType.DELETE, `tiendas/${docId}`));
    }
  };

  const eliminarPedidoAdmin = (ticket: string) => {
    const ticketB = ticket.trim().toUpperCase();
    deleteDoc(doc(db, 'pedidos', ticketB))
      .catch(e => handleFirestoreError(e, OperationType.DELETE, `pedidos/${ticketB}`));
    return { success: true };
  };

  const eliminarRecoleccionAdmin = (id: string) => {
    const idB = id.trim().toUpperCase();
    deleteDoc(doc(db, 'recolecciones', idB))
      .catch(e => handleFirestoreError(e, OperationType.DELETE, `recolecciones/${idB}`));
    return { success: true };
  };

  const modificarPedidoAdmin = (data: any) => {
    try {
      const ticketUpper = data.ticket.toUpperCase().trim();
      let dirFinal = '';
      if (data.entregaEnTienda) {
        const dirTienda = tiendas.find(t => t.nombre.toUpperCase().trim() === data.tienda.toUpperCase().trim())?.direccion || '';
        dirFinal = "(ENTREGA EN TIENDA:) " + dirTienda;
      } else {
        const prefijo = data.numInt ? `(INT. ${data.numInt.toUpperCase()}) ` : '';
        dirFinal = (prefijo + (data.dir || '')).toUpperCase().trim();
      }

      const { latitude, longitude } = mockGeocode(dirFinal);

      const docRef = doc(db, 'pedidos', ticketUpper);
      getDoc(docRef).then(snap => {
        if (snap.exists()) {
          setDoc(docRef, {
            ...snap.data(),
            cliente: data.cliente.toUpperCase(),
            tel: data.tel,
            dir: dirFinal,
            ref: data.ref.toUpperCase(),
            tipo: data.tipo,
            obs: data.obs.toUpperCase(),
            lat: latitude,
            lng: longitude
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `pedidos/${ticketUpper}`));
        }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const modificarRecoleccionAdmin = (data: any) => {
    try {
      const idUpper = data.id.toUpperCase().trim();
      const { latitude, longitude } = mockGeocode(data.direccion || '');

      const docRef = doc(db, 'recolecciones', idUpper);
      getDoc(docRef).then(snap => {
        if (snap.exists()) {
          setDoc(docRef, {
            ...snap.data(),
            proveedor: data.proveedor.toUpperCase(),
            direccion: data.direccion.toUpperCase(),
            referencias: data.referencias.toUpperCase(),
            material: data.material.toUpperCase(),
            fechaDisponible: data.fechaDisp,
            lat: latitude,
            lng: longitude
          }).catch(e => handleFirestoreError(e, OperationType.WRITE, `recolecciones/${idUpper}`));
        }
      });
      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  };

  const archivarFinalizados = (): string => {
    const ahoraStr = getMexicoCityDateTimeStr();
    const finalizadosPedidos = pedidos.filter(p => p.estatus === 'FINALIZADO');
    const finalizadosRecs = recolecciones.filter(r => r.estatus === 'FINALIZADO' || r.estatus === 'RECOLECTADO');

    if (finalizadosPedidos.length === 0 && finalizadosRecs.length === 0) {
      return "No se encontraron entregas o recolecciones finalizadas elegibles para archivo en este momento.";
    }

    finalizadosPedidos.forEach(p => {
      const archivedItem = {
        ...p,
        fechaArchivado: ahoraStr
      };
      setDoc(doc(db, 'historial_entregas', p.ticket), archivedItem)
        .then(() => {
          deleteDoc(doc(db, 'pedidos', p.ticket));
        })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `historial_entregas/${p.ticket}`));
    });

    finalizadosRecs.forEach(r => {
      const archivedItem = {
        ...r,
        fechaArchivado: ahoraStr
      };
      setDoc(doc(db, 'historial_recolecciones', r.id), archivedItem)
        .then(() => {
          deleteDoc(doc(db, 'recolecciones', r.id));
        })
        .catch(e => handleFirestoreError(e, OperationType.WRITE, `historial_recolecciones/${r.id}`));
    });

    return `Archivado completado con éxito: ${finalizadosPedidos.length} entregas, ${finalizadosRecs.length} recolecciones movidas al historial.`;
  };

  const guardarLocalPendiente = (entrega: any) => {
    setOfflineQueue(prev => [...prev, entrega]);
  };

  const sincronizarPendientesLocales = async (): Promise<number> => {
    if (offlineQueue.length === 0) return 0;
    
    offlineQueue.forEach(item => {
      actualizarEstatusChofer({
        id: item.id,
        hoja: item.hoja,
        nuevoEstatus: item.nuevoEstatus,
        chofer: item.chofer,
        lat: item.lat,
        lng: item.lng,
        receptor: item.receptor,
        fotos: item.fotos
      });
    });

    const count = offlineQueue.length;
    setOfflineQueue([]);
    return count;
  };

  const clearOfflineQueue = () => {
    setOfflineQueue([]);
  };

  const reemplazarTablaDirecta = (tabla: string, nuevosDatos: any[]): { success: boolean; error?: string } => {
    if (!Array.isArray(nuevosDatos)) {
      return { success: false, error: 'Los datos deben ser un Arreglo (Array) válido de JSON.' };
    }
    try {
      let colName = '';
      let keyField = '';
      switch (tabla) {
        case 'DB_PEDIDOS': colName = 'pedidos'; keyField = 'ticket'; break;
        case 'DB_RECOLECCIONES': colName = 'recolecciones'; keyField = 'id'; break;
        case 'DB_CHOFERES': colName = 'choferes'; keyField = 'id'; break;
        case 'DB_PROVEEDORES': colName = 'proveedores'; keyField = 'nombre'; break;
        case 'DB_TIENDAS': colName = 'tiendas'; keyField = 'nombre'; break;
        case 'DB_HIST_ENTREGAS': colName = 'historial_entregas'; keyField = 'ticket'; break;
        case 'DB_HIST_RECOLECCIONES': colName = 'historial_recolecciones'; keyField = 'id'; break;
        default:
          return { success: false, error: `Tabla '${tabla}' no identificada.` };
      }

      const proceedReplace = async () => {
        const snap = await getDocs(collection(db, colName));
        for (const d of snap.docs) {
          await deleteDoc(doc(db, colName, d.id));
        }
        for (const item of nuevosDatos) {
          const docId = String(item[keyField]).toUpperCase().trim().replace(/\//g, '-');
          await setDoc(doc(db, colName, docId), item);
        }
      };

      proceedReplace().catch(e => handleFirestoreError(e, OperationType.WRITE, colName));
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error al actualizar base de datos en nube.' };
    }
  };

  return (
    <LogistikaContext.Provider value={{
      pedidos,
      recolecciones,
      choferes,
      proveedores,
      tiendas,
      logs,
      historialEntregas,
      historialRecolecciones,
      
      guardarPedidoTienda,
      verificarTicketExistente,
      guardarDictamenCompras,
      guardarSolicitudDesdeCompras,
      crearNuevaRecoleccion,
      
      actualizarPedidoLogistica,
      actualizarRecoleccionLogistica,
      guardarServicioConOrden,
      
      obtenerSiguienteOrdenGlobal,
      moverOrden,
      liberarOrden,
      
      obtenerTareasChofer,
      actualizarEstatusChofer,
      subirFotoDrive,
      obtenerEtaParaTicket,
      
      obtenerProyeccionRuta,
      obtenerProyeccionRutaPorTienda,

      agregarChofer,
      editarChofer,
      eliminarChofer,
      agregarProveedor,
      editarProveedor,
      eliminarProveedor,
      agregarTienda,
      editarTienda,
      eliminarTienda,

      eliminarPedidoAdmin,
      eliminarRecoleccionAdmin,
      modificarPedidoAdmin,
      modificarRecoleccionAdmin,

      archivarFinalizados,
      reemplazarTablaDirecta,
      
      offlineQueue,
      guardarLocalPendiente,
      sincronizarPendientesLocales,
      clearOfflineQueue
    }}>
      {children}
    </LogistikaContext.Provider>
  );
};

export const useLogistika = () => {
  const context = useContext(LogistikaContext);
  if (!context) {
    throw new Error('useLogistika must be used within a LogistikaProvider');
  }
  return context;
};
