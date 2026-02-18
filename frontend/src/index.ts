/**
 * Main application entry point - RCA Tool
 */

import "bootstrap/dist/css/bootstrap.min.css";
import "./styles.css";

import { apiClient, type Rca } from "./api";
import {
  getCurrentUser,
  initAuth,
  isAuthenticated,
  logout,
  setCurrentUser,
} from "./auth";
import {
  createLoginForm,
  createRcaForm,
  createRcaList,
  createRegisterForm,
  createWhyTree,
  showError,
  showSuccess,
} from "./components";

// State
let rcas: Rca[] = [];
let currentRca: Rca | null = null;

/**
 * Initialize the application
 */
async function init(): Promise<void> {
  await initAuth();

  if (isAuthenticated()) {
    await showRcaListView();
  } else {
    showAuthView();
  }
}

/**
 * Show authentication view (login/register)
 */
function showAuthView(showRegister = false): void {
  const app = document.getElementById("app");
  if (!app) return;

  app.innerHTML = `
    <nav class="navbar navbar-dark bg-primary">
      <div class="container">
        <span class="navbar-brand mb-0 h1">RCA Tool</span>
      </div>
    </nav>
    <div class="container mt-5">
      <div class="row justify-content-center">
        <div class="col-md-6" id="auth-container"></div>
      </div>
    </div>
  `;

  const authContainer = document.getElementById("auth-container");
  if (!authContainer) return;

  if (showRegister) {
    const registerForm = createRegisterForm();
    authContainer.appendChild(registerForm);
    setupRegisterForm(registerForm);
  } else {
    const loginForm = createLoginForm();
    authContainer.appendChild(loginForm);
    setupLoginForm(loginForm);
  }
}

function setupLoginForm(form: HTMLElement): void {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
      const response = await apiClient.login({ email, password });
      setCurrentUser(response.user);
      await showRcaListView();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Login failed");
    }
  });

  const switchBtn = form.querySelector("#switch-to-register");
  switchBtn?.addEventListener("click", () => showAuthView(true));
}

function setupRegisterForm(form: HTMLElement): void {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const response = await apiClient.register({ email, username, password });
      setCurrentUser(response.user);
      await showRcaListView();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Registration failed");
    }
  });

  const switchBtn = form.querySelector("#switch-to-login");
  switchBtn?.addEventListener("click", () => showAuthView(false));
}

// ============================================================================
// RCA List View
// ============================================================================

async function showRcaListView(): Promise<void> {
  const app = document.getElementById("app");
  const user = getCurrentUser();
  if (!app || !user) return;

  currentRca = null;

  app.innerHTML = `
    <nav class="navbar navbar-dark bg-primary">
      <div class="container">
        <span class="navbar-brand mb-0 h1">RCA Tool</span>
        <div class="d-flex align-items-center gap-3">
          <span class="text-white">Welcome, ${user.username}!</span>
          <button class="btn btn-outline-light btn-sm" id="logout-btn">Logout</button>
        </div>
      </div>
    </nav>
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div id="rca-form-container"></div>
          <h3 class="mb-3">Your RCAs</h3>
          <div id="rca-list-container"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById("logout-btn")?.addEventListener("click", handleLogout);

  try {
    rcas = await apiClient.getRcas();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Failed to load RCAs");
  }

  renderRcaForm();
  renderRcaList();
}

function renderRcaForm(): void {
  const container = document.getElementById("rca-form-container");
  if (!container) return;

  container.innerHTML = "";
  const form = createRcaForm();
  container.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const timeline = formData.get("timeline") as string;

    try {
      const rcaData: { name: string; description?: string; timeline?: string } = {
        name,
      };
      if (description) rcaData.description = description;
      if (timeline) rcaData.timeline = timeline;
      const newRca = await apiClient.createRca(rcaData);
      rcas.unshift(newRca);
      showSuccess(`RCA "${name}" created successfully`);
      (e.target as HTMLFormElement).reset();
      renderRcaList();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to create RCA");
    }
  });
}

function renderRcaList(): void {
  const container = document.getElementById("rca-list-container");
  if (!container) return;

  container.innerHTML = "";
  const list = createRcaList(rcas);
  container.appendChild(list);

  // Click to open RCA detail
  list.querySelectorAll(".rca-card-clickable").forEach((el) => {
    el.addEventListener("click", async (e) => {
      const card = (e.currentTarget as HTMLElement).closest(
        ".rca-card"
      ) as HTMLElement | null;
      const rcaId = parseInt(card?.dataset["rcaId"] ?? "0");
      if (rcaId > 0) {
        await showRcaDetailView(rcaId);
      }
    });
  });

  // Delete RCA
  list.querySelectorAll(".delete-rca").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      const rcaId = parseInt((e.currentTarget as HTMLElement).dataset["rcaId"] ?? "0");
      if (rcaId > 0) {
        await handleDeleteRca(rcaId);
      }
    });
  });
}

async function handleDeleteRca(rcaId: number): Promise<void> {
  if (!confirm("Are you sure you want to delete this RCA?")) return;

  try {
    await apiClient.deleteRca(rcaId);
    rcas = rcas.filter((r) => r.id !== rcaId);
    showSuccess("RCA deleted successfully");
    renderRcaList();
  } catch (error) {
    showError(error instanceof Error ? error.message : "Failed to delete RCA");
  }
}

// ============================================================================
// RCA Detail View
// ============================================================================

async function showRcaDetailView(rcaId: number): Promise<void> {
  const app = document.getElementById("app");
  const user = getCurrentUser();
  if (!app || !user) return;

  try {
    currentRca = await apiClient.getRca(rcaId);
  } catch (error) {
    showError(error instanceof Error ? error.message : "Failed to load RCA");
    return;
  }

  app.innerHTML = `
    <nav class="navbar navbar-dark bg-primary">
      <div class="container">
        <span class="navbar-brand mb-0 h1">RCA Tool</span>
        <div class="d-flex align-items-center gap-3">
          <button class="btn btn-outline-light btn-sm" id="back-btn">Back to List</button>
          <span class="text-white">Welcome, ${user.username}!</span>
          <button class="btn btn-outline-light btn-sm" id="logout-btn">Logout</button>
        </div>
      </div>
    </nav>
    <div class="container mt-4">
      <div class="row justify-content-center">
        <div class="col-md-10">
          <div id="rca-detail-header"></div>
          <hr>
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h4>5 Whys Analysis</h4>
            <button class="btn btn-primary btn-sm" id="add-top-why">Add Why</button>
          </div>
          <div id="why-tree-container"></div>
        </div>
      </div>
    </div>
  `;

  document
    .getElementById("back-btn")
    ?.addEventListener("click", () => showRcaListView());
  document.getElementById("logout-btn")?.addEventListener("click", handleLogout);
  document.getElementById("add-top-why")?.addEventListener("click", () => {
    showInlineNodeForm(null, rcaId, "why");
  });

  renderRcaDetail();
  renderWhyTree();
}

function renderRcaDetail(): void {
  const container = document.getElementById("rca-detail-header");
  if (!container || !currentRca) return;

  container.innerHTML = `
    <div class="card p-4 mb-3">
      <div class="d-flex justify-content-between align-items-start">
        <div>
          <h3 id="rca-detail-name">${escapeHtml(currentRca.name)}</h3>
          ${currentRca.description ? `<p class="mb-1"><strong>Description:</strong> ${escapeHtml(currentRca.description)}</p>` : ""}
          ${currentRca.timeline ? `<p class="mb-1"><strong>Timeline:</strong> ${escapeHtml(currentRca.timeline)}</p>` : ""}
          <small class="text-muted">Updated ${formatDate(currentRca.updated_at)}</small>
        </div>
        <button class="btn btn-sm btn-outline-primary" id="edit-rca-btn">Edit</button>
      </div>
      <div id="edit-rca-form-container" class="mt-3" style="display: none;"></div>
    </div>
  `;

  document.getElementById("edit-rca-btn")?.addEventListener("click", () => {
    showEditRcaForm();
  });
}

function showEditRcaForm(): void {
  const container = document.getElementById("edit-rca-form-container");
  if (!container || !currentRca) return;

  container.style.display = "block";
  container.innerHTML = "";

  const form = createRcaForm(currentRca);
  container.appendChild(form);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentRca) return;

    const formData = new FormData(e.target as HTMLFormElement);
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const timeline = formData.get("timeline") as string;

    try {
      const updated = await apiClient.updateRca(currentRca.id, {
        name,
        description,
        timeline,
      });
      currentRca = { ...currentRca, ...updated };
      showSuccess("RCA updated successfully");
      container.style.display = "none";
      renderRcaDetail();
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to update RCA");
    }
  });

  const cancelBtn = form.querySelector("#cancel-edit-rca");
  cancelBtn?.addEventListener("click", () => {
    container.style.display = "none";
  });
}

function renderWhyTree(): void {
  const container = document.getElementById("why-tree-container");
  if (!container || !currentRca) return;

  container.innerHTML = "";

  const nodes = currentRca.nodes ?? [];
  if (nodes.length === 0) {
    container.innerHTML = `<p class="text-muted">No why nodes yet. Click "Add Why" to start your analysis.</p>`;
    return;
  }

  const tree = createWhyTree(nodes, currentRca.id, true);
  container.appendChild(tree);
  setupTreeHandlers(container);
}

function setupTreeHandlers(container: HTMLElement): void {
  // Collapse/expand toggle
  container.querySelectorAll(".collapse-toggle").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const nodeId = (e.currentTarget as HTMLElement).dataset["nodeId"];
      const nodeEl = container.querySelector(`.why-node[data-node-id="${nodeId}"]`);
      if (!nodeEl) return;

      nodeEl.classList.toggle("collapsed");
      const icon = (e.currentTarget as HTMLElement).querySelector(".collapse-icon");
      if (icon) {
        icon.innerHTML = nodeEl.classList.contains("collapsed") ? "[+]" : "[&minus;]";
      }
    });
  });

  // Add Why child
  container.querySelectorAll(".add-why-child").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const el = e.currentTarget as HTMLElement;
      const parentId = parseInt(el.dataset["nodeId"] ?? "0");
      const rcaId = parseInt(el.dataset["rcaId"] ?? "0");
      showInlineNodeForm(parentId, rcaId, "why");
    });
  });

  // Add Root Cause child
  container.querySelectorAll(".add-rc-child").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const el = e.currentTarget as HTMLElement;
      const parentId = parseInt(el.dataset["nodeId"] ?? "0");
      const rcaId = parseInt(el.dataset["rcaId"] ?? "0");
      showInlineNodeForm(parentId, rcaId, "root_cause");
    });
  });

  // Edit node
  container.querySelectorAll(".edit-node").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const el = e.currentTarget as HTMLElement;
      const nodeId = parseInt(el.dataset["nodeId"] ?? "0");
      const nodeType = el.dataset["nodeType"] as "why" | "root_cause";
      const isTopLevel = el.dataset["isTopLevel"] === "true";
      showEditNodeForm(nodeId, nodeType, isTopLevel);
    });
  });

  // Delete node
  container.querySelectorAll(".delete-node").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      const nodeId = parseInt(
        (e.currentTarget as HTMLElement).dataset["nodeId"] ?? "0"
      );
      await handleDeleteNode(nodeId);
    });
  });
}

function showInlineNodeForm(
  parentId: number | null,
  rcaId: number,
  nodeType: "why" | "root_cause"
): void {
  // Remove any existing inline forms
  document.querySelectorAll(".inline-node-form").forEach((f) => f.remove());

  let insertTarget: Element | null;
  if (parentId !== null) {
    const parentNode = document.querySelector(`.why-node[data-node-id="${parentId}"]`);
    insertTarget = parentNode?.querySelector(":scope > .why-node-children") ?? null;
  } else {
    insertTarget = document.getElementById("why-tree-container");
  }
  if (!insertTarget) return;

  const formDiv = document.createElement("div");
  formDiv.className = "inline-node-form";
  formDiv.innerHTML = `
    <form class="d-flex gap-2 align-items-center">
      <span class="badge ${nodeType === "root_cause" ? "bg-danger" : "bg-primary"}">${nodeType === "root_cause" ? "Root Cause" : "Why"}</span>
      <input type="text" class="form-control form-control-sm" placeholder="Enter content..." name="content" required>
      <button type="submit" class="btn btn-sm btn-success">Save</button>
      <button type="button" class="btn btn-sm btn-secondary cancel-inline">Cancel</button>
    </form>
  `;

  insertTarget.insertBefore(formDiv, insertTarget.firstChild);

  const input = formDiv.querySelector("input");
  input?.focus();

  const form = formDiv.querySelector("form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const content = (formDiv.querySelector("input") as HTMLInputElement).value;
    try {
      await apiClient.createNode(rcaId, {
        parent_id: parentId,
        node_type: nodeType,
        content,
      });
      // Reload the RCA to get updated tree
      currentRca = await apiClient.getRca(rcaId);
      renderWhyTree();
      showSuccess("Node added");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to add node");
    }
  });

  formDiv.querySelector(".cancel-inline")?.addEventListener("click", () => {
    formDiv.remove();
  });
}

function showEditNodeForm(
  nodeId: number,
  nodeType: "why" | "root_cause",
  isTopLevel: boolean
): void {
  const nodeEl = document.querySelector(`.why-node[data-node-id="${nodeId}"]`);
  if (!nodeEl) return;

  const contentEl = nodeEl.querySelector(":scope > .why-node-header .why-node-content");
  const actionsEl = nodeEl.querySelector(
    ":scope > .why-node-actions"
  ) as HTMLElement | null;
  if (!contentEl || !actionsEl) return;

  const currentContent = contentEl.textContent ?? "";

  // Replace content and actions with edit form
  const editForm = document.createElement("div");
  editForm.className = "inline-node-form mt-1";
  editForm.innerHTML = `
    <form class="d-flex gap-2 align-items-center flex-wrap">
      <input type="text" class="form-control form-control-sm" name="content" value="${escapeAttr(currentContent)}" required>
      ${
        !isTopLevel
          ? `<select class="form-select form-select-sm" name="node_type" style="width: auto;">
              <option value="why" ${nodeType === "why" ? "selected" : ""}>Why</option>
              <option value="root_cause" ${nodeType === "root_cause" ? "selected" : ""}>Root Cause</option>
            </select>`
          : ""
      }
      <button type="submit" class="btn btn-sm btn-success">Save</button>
      <button type="button" class="btn btn-sm btn-secondary cancel-edit-node">Cancel</button>
    </form>
  `;

  actionsEl.style.display = "none";
  actionsEl.after(editForm);

  const input = editForm.querySelector("input");
  input?.focus();

  const form = editForm.querySelector("form");
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const content = formData.get("content") as string;
    const newType =
      (formData.get("node_type") as "why" | "root_cause" | null) ?? nodeType;

    try {
      await apiClient.updateNode(nodeId, { content, node_type: newType });
      // Reload
      if (currentRca) {
        currentRca = await apiClient.getRca(currentRca.id);
        renderWhyTree();
      }
      showSuccess("Node updated");
    } catch (error) {
      showError(error instanceof Error ? error.message : "Failed to update node");
    }
  });

  editForm.querySelector(".cancel-edit-node")?.addEventListener("click", () => {
    editForm.remove();
    actionsEl.style.display = "";
  });
}

async function handleDeleteNode(nodeId: number): Promise<void> {
  if (!confirm("Delete this node and all its children?")) return;

  try {
    await apiClient.deleteNode(nodeId);
    if (currentRca) {
      currentRca = await apiClient.getRca(currentRca.id);
      renderWhyTree();
    }
    showSuccess("Node deleted");
  } catch (error) {
    showError(error instanceof Error ? error.message : "Failed to delete node");
  }
}

function handleLogout(): void {
  logout();
}

// Helpers used directly in index.ts
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

// Initialize app when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  void init();
}
