export type UserRole = 'staff' | 'client';

export interface User {
  token: string;
  name: string;
  role: UserRole;
  account?: string;
}

export interface Contact {
  name: string;
  role: string;
  email?: string;
  phone?: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  address: string;
  status: string;
  clientName: string;
}

export interface ProjectDetail {
  id: string;
  name: string;
  address: string;
  status: string;
  clientName: string;
  dates: {
    signed: string | null;
    scan: string | null;
    estimatedDelivery: string | null;
    delivered: string | null;
  };
  levels: string[];
  contacts: Contact[];
}

export interface Space {
  id: string;
  name: string;
  level: string;
  use: string;
  x: number;
  y: number;
  z: number;
  w: number;
  d: number;
  h: number;
}

export interface IssuePayload {
  title: string;
  level: string;
  spaceId?: string | null;
}

export interface CloudProgressMessage {
  type: 'progress';
  loadedBytes: number;
  totalBytes: number;
  percent: number;
}

export interface CloudDoneMessage {
  type: 'done';
  pointCount: number;
  positions: Float32Array;
  colors: Uint8Array;
}

export interface CloudErrorMessage {
  type: 'error';
  message: string;
  isTruncated?: boolean;
}

export type CloudWorkerMessage = CloudProgressMessage | CloudDoneMessage | CloudErrorMessage;
