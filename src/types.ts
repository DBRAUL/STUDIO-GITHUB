/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Pedido {
  ticket: string; // Col A
  fecha: string; // Col B
  tienda: string; // Col C
  cliente: string; // Col D
  tel: string; // Col E
  dir: string; // Col F
  ref: string; // Col G
  tipo: string; // Col H (Todo el Ticket | Entrega Parcial)
  obs: string; // Col I
  estatus: 'CARGADO' | 'PENDIENTE' | 'EN PROCESO / COMPRA' | 'PARCIAL' | 'ENTREGA INMEDIATA' | 'REVISADO' | 'PROGRAMADO' | 'EN RUTA' | 'FINALIZADO'; // Col J
  comprasObs?: string; // Col K
  comprasUbic?: string; // Col L
  chofer?: string; // Col M
  dateenv?: string; // Col N (dd-MMM-yyyy or yyyy-MM-dd)
  orden?: number | null; // Col O
  obsLogistica?: string; // Col P
  lat?: number | string; // Col Q
  lng?: number | string; // Col R
  receptor?: string; // Col S
  fotoUrl?: string; // Col T (Foto Ticket URL)
  dateped?: string; // formatted date for admin view
  numInt?: string;
}

export interface Recoleccion {
  id: string; // Col A (REC-XXX)
  solicitante: 'COMPRAS' | 'LOGISTICA'; // Col B
  proveedor: string; // Col C
  direccion: string; // Col D
  referencias: string; // Col E
  material: string; // Col F
  fechaDisponible: string; // Col G (yyyy-MM-dd)
  chofer?: string; // Col H
  fechaReal?: string; // Col I
  estatus: 'SOLICITADO' | 'PENDIENTE' | 'REVISADO' | 'PROGRAMADO' | 'EN RUTA' | 'RECOLECTADO' | 'FINALIZADO'; // Col J
  fechaAlta?: string; // Col K
  orden?: number | null; // Col L
  lat?: number | string; // Col M
  lng?: number | string; // Col N
}

export interface ChoferConfig {
  id: string;
  nombre: string;
  lat?: number;
  lng?: number;
  ultimaUbicacion?: string;
}

export interface ProveedorConfig {
  nombre: string;
  direccion: string;
  referencia: string;
}

export interface TiendaConfig {
  nombre: string;
  direccion: string;
  siglas: string;
}

export interface LogRuta {
  ticketId: string;
  chofer: string;
  horaInicio?: string;
  horaFin?: string;
  ubicacionInicio?: string;
  ubicacionFin?: string;
  recibio?: string;
}

export interface HistorialEntrega extends Pedido {
  fechaArchivado: string;
}

export interface HistorialRecoleccion extends Recoleccion {
  fechaArchivado: string;
}
