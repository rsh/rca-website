/**
 * Reusable UI components for the RCA Tool
 */

import type { Rca, WhyNode } from "./api";

/**
 * Create login form component
 */
export function createLoginForm(): HTMLElement {
  const form = document.createElement("form");
  form.className = "card p-4";
  form.innerHTML = `
    <h2 class="mb-3">Login</h2>
    <div class="mb-3">
      <label for="email" class="form-label">Email</label>
      <input type="email" class="form-control" id="email" name="email" required>
    </div>
    <div class="mb-3">
      <label for="password" class="form-label">Password</label>
      <input type="password" class="form-control" id="password" name="password" required>
    </div>
    <button type="submit" class="btn btn-primary">Login</button>
    <button type="button" class="btn btn-link" id="switch-to-register">
      Don't have an account? Register
    </button>
  `;
  return form;
}

/**
 * Create registration form component
 */
export function createRegisterForm(): HTMLElement {
  const form = document.createElement("form");
  form.className = "card p-4";
  form.innerHTML = `
    <h2 class="mb-3">Register</h2>
    <div class="mb-3">
      <label for="username" class="form-label">Username</label>
      <input type="text" class="form-control" id="username" name="username" required minlength="3">
    </div>
    <div class="mb-3">
      <label for="email" class="form-label">Email</label>
      <input type="email" class="form-control" id="email" name="email" required>
    </div>
    <div class="mb-3">
      <label for="password" class="form-label">Password</label>
      <input type="password" class="form-control" id="password" name="password" required minlength="8">
    </div>
    <button type="submit" class="btn btn-primary">Register</button>
    <button type="button" class="btn btn-link" id="switch-to-login">
      Already have an account? Login
    </button>
  `;
  return form;
}

/**
 * Create RCA form (for create or edit)
 */
export function createRcaForm(rca?: Rca): HTMLElement {
  const form = document.createElement("form");
  form.className = "card p-4 mb-4";
  form.innerHTML = `
    <h3 class="mb-3">${rca ? "Edit RCA" : "Create New RCA"}</h3>
    <div class="mb-3">
      <label for="rca-name" class="form-label">Name</label>
      <input type="text" class="form-control" id="rca-name" name="name"
             value="${escapeAttr(rca?.name ?? "")}" required>
    </div>
    <div class="mb-3">
      <label for="rca-description" class="form-label">Description</label>
      <textarea class="form-control" id="rca-description" name="description" rows="3">${escapeHtml(rca?.description ?? "")}</textarea>
    </div>
    <div class="mb-3">
      <label for="rca-timeline" class="form-label">Timeline</label>
      <textarea class="form-control" id="rca-timeline" name="timeline" rows="3">${escapeHtml(rca?.timeline ?? "")}</textarea>
    </div>
    <div class="d-flex gap-2">
      <button type="submit" class="btn btn-primary">
        ${rca ? "Update" : "Create"} RCA
      </button>
      ${rca ? '<button type="button" class="btn btn-secondary" id="cancel-edit-rca">Cancel</button>' : ""}
    </div>
  `;
  return form;
}

/**
 * Create RCA list as cards
 */
export function createRcaList(rcas: Rca[]): HTMLElement {
  const container = document.createElement("div");

  if (rcas.length === 0) {
    container.innerHTML = `<p class="text-muted">No RCAs yet. Create your first one above!</p>`;
    return container;
  }

  for (const rca of rcas) {
    const card = document.createElement("div");
    card.className = "card mb-3 rca-card";
    card.dataset["rcaId"] = String(rca.id);
    card.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div class="rca-card-clickable" style="cursor: pointer; flex: 1;">
            <h5 class="card-title mb-1">${escapeHtml(rca.name)}</h5>
            ${rca.description ? `<p class="card-text text-muted mb-1">${escapeHtml(rca.description)}</p>` : ""}
            <small class="text-muted">Created ${formatDate(rca.created_at)}</small>
          </div>
          <button class="btn btn-sm btn-outline-danger delete-rca ms-2" data-rca-id="${rca.id}">Delete</button>
        </div>
      </div>
    `;
    container.appendChild(card);
  }

  return container;
}

/**
 * Create the Reddit-style why tree
 */
export function createWhyTree(
  nodes: WhyNode[],
  rcaId: number,
  isTopLevel: boolean
): HTMLElement {
  const container = document.createElement("div");
  container.className = "why-thread";

  for (const node of nodes) {
    const nodeEl = createWhyNodeElement(node, rcaId, isTopLevel);
    container.appendChild(nodeEl);
  }

  return container;
}

function createWhyNodeElement(
  node: WhyNode,
  rcaId: number,
  isTopLevel: boolean
): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.className = "why-node";
  wrapper.dataset["nodeId"] = String(node.id);

  const hasChildren = node.children.length > 0;

  const header = document.createElement("div");
  header.className = "why-node-header";
  header.innerHTML = `
    <button class="collapse-toggle btn btn-sm btn-link p-0 ${hasChildren ? "" : "invisible"}" data-node-id="${node.id}">
      <span class="collapse-icon">[&minus;]</span>
    </button>
    <span class="badge ${node.node_type === "root_cause" ? "bg-danger" : "bg-primary"} me-2">
      ${node.node_type === "root_cause" ? "Root Cause" : "Why"}
    </span>
    <span class="why-node-content">${escapeHtml(node.content)}</span>
  `;

  const actions = document.createElement("div");
  actions.className = "why-node-actions mt-1";
  actions.innerHTML = `
    <button class="btn btn-sm btn-link add-why-child" data-node-id="${node.id}" data-rca-id="${rcaId}">Add Why</button>
    <button class="btn btn-sm btn-link add-rc-child" data-node-id="${node.id}" data-rca-id="${rcaId}">Add Root Cause</button>
    <button class="btn btn-sm btn-link edit-node" data-node-id="${node.id}" data-node-type="${node.node_type}" ${isTopLevel ? 'data-is-top-level="true"' : ""}>Edit</button>
    <button class="btn btn-sm btn-link text-danger delete-node" data-node-id="${node.id}">Delete</button>
  `;

  const childrenContainer = document.createElement("div");
  childrenContainer.className = "why-node-children";
  if (node.children.length > 0) {
    const childTree = createWhyTree(node.children, rcaId, false);
    childrenContainer.appendChild(childTree);
  }

  wrapper.appendChild(header);
  wrapper.appendChild(actions);
  wrapper.appendChild(childrenContainer);

  return wrapper;
}

/**
 * Show error message
 */
export function showError(message: string): void {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-danger alert-dismissible fade show";
  alertDiv.innerHTML = `
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  const container = document.getElementById("app");
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 5000);
  }
}

/**
 * Show success message
 */
export function showSuccess(message: string): void {
  const alertDiv = document.createElement("div");
  alertDiv.className = "alert alert-success alert-dismissible fade show";
  alertDiv.innerHTML = `
    ${escapeHtml(message)}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;

  const container = document.getElementById("app");
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    setTimeout(() => alertDiv.remove(), 3000);
  }
}

// Helper functions

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function escapeAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString();
}
