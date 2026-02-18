/**
 * TypeScript client library for RCA Tool API
 */

import type {
  ApiError,
  AuthResponse,
  LoginRequest,
  Rca,
  RcaCreateRequest,
  RcaUpdateRequest,
  RegisterRequest,
  User,
  WhyNode,
  WhyNodeCreateRequest,
  WhyNodeUpdateRequest,
} from "./types";

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string = "http://localhost:5000") {
    this.baseUrl = baseUrl;
    this.loadToken();
  }

  private loadToken(): void {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("auth_token");
      if (stored !== null) {
        this.token = stored;
      }
    }
  }

  private saveToken(token: string): void {
    this.token = token;
    if (typeof window !== "undefined") {
      localStorage.setItem("auth_token", token);
    }
  }

  public clearToken(): void {
    this.token = null;
    if (typeof window !== "undefined") {
      localStorage.removeItem("auth_token");
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (options.headers) {
      Object.assign(headers, options.headers);
    }

    if (this.token !== null) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiError;
      throw new Error(error.error || "Request failed");
    }

    return response.json() as Promise<T>;
  }

  // Authentication

  public async register(data: RegisterRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.saveToken(response.token);
    return response;
  }

  public async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await this.request<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    this.saveToken(response.token);
    return response;
  }

  public logout(): void {
    this.clearToken();
  }

  public async getCurrentUser(): Promise<User> {
    const response = await this.request<{ user: User }>("/api/auth/me");
    return response.user;
  }

  // RCA methods

  public async getRcas(): Promise<Rca[]> {
    const response = await this.request<{ rcas: Rca[] }>("/api/rcas");
    return response.rcas;
  }

  public async createRca(data: RcaCreateRequest): Promise<Rca> {
    const response = await this.request<{ rca: Rca }>("/api/rcas", {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.rca;
  }

  public async getRca(id: number): Promise<Rca> {
    const response = await this.request<{ rca: Rca }>(`/api/rcas/${id}`);
    return response.rca;
  }

  public async updateRca(id: number, data: RcaUpdateRequest): Promise<Rca> {
    const response = await this.request<{ rca: Rca }>(`/api/rcas/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.rca;
  }

  public async deleteRca(id: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/rcas/${id}`, {
      method: "DELETE",
    });
  }

  // WhyNode methods

  public async createNode(rcaId: number, data: WhyNodeCreateRequest): Promise<WhyNode> {
    const response = await this.request<{ node: WhyNode }>(`/api/rcas/${rcaId}/nodes`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    return response.node;
  }

  public async updateNode(
    nodeId: number,
    data: WhyNodeUpdateRequest
  ): Promise<WhyNode> {
    const response = await this.request<{ node: WhyNode }>(`/api/nodes/${nodeId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    return response.node;
  }

  public async deleteNode(nodeId: number): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/api/nodes/${nodeId}`, {
      method: "DELETE",
    });
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
