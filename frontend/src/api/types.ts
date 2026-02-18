/**
 * TypeScript types for RCA API communication
 */

export interface User {
  id: number;
  username: string;
  email?: string;
  created_at: string;
}

export interface Rca {
  id: number;
  name: string;
  description: string | null;
  timeline: string | null;
  owner: User | null;
  nodes?: WhyNode[];
  created_at: string;
  updated_at: string;
}

export interface WhyNode {
  id: number;
  rca_id: number;
  parent_id: number | null;
  node_type: "why" | "root_cause";
  content: string;
  order: number;
  children: WhyNode[];
  created_at: string;
  updated_at: string;
}

// Request types
export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface RcaCreateRequest {
  name: string;
  description?: string;
  timeline?: string;
}

export interface RcaUpdateRequest {
  name?: string;
  description?: string;
  timeline?: string;
}

export interface WhyNodeCreateRequest {
  parent_id?: number | null;
  node_type: "why" | "root_cause";
  content: string;
}

export interface WhyNodeUpdateRequest {
  content?: string;
  node_type?: "why" | "root_cause";
}

export interface ApiError {
  error: string;
  details?: unknown;
}
