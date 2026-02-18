/**
 * Tests for UI components
 */

import {
  createLoginForm,
  createRegisterForm,
  createRcaForm,
  createRcaList,
  createWhyTree,
  showError,
  showSuccess,
} from "../components";
import type { Rca, WhyNode } from "../api";

describe("Components", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="app"></div>';
  });

  describe("createLoginForm", () => {
    it("creates a login form with email and password fields", () => {
      const form = createLoginForm();
      expect(form.tagName).toBe("FORM");
      expect(form.querySelector("#email")).toBeTruthy();
      expect(form.querySelector("#password")).toBeTruthy();
      expect(form.querySelector('button[type="submit"]')).toBeTruthy();
      expect(form.querySelector("#switch-to-register")).toBeTruthy();
    });

    it("has required attributes on inputs", () => {
      const form = createLoginForm();
      const emailInput = form.querySelector("#email") as HTMLInputElement;
      const passwordInput = form.querySelector("#password") as HTMLInputElement;
      expect(emailInput.required).toBe(true);
      expect(passwordInput.required).toBe(true);
      expect(emailInput.type).toBe("email");
      expect(passwordInput.type).toBe("password");
    });
  });

  describe("createRegisterForm", () => {
    it("creates a registration form with all required fields", () => {
      const form = createRegisterForm();
      expect(form.tagName).toBe("FORM");
      expect(form.querySelector("#username")).toBeTruthy();
      expect(form.querySelector("#email")).toBeTruthy();
      expect(form.querySelector("#password")).toBeTruthy();
      expect(form.querySelector('button[type="submit"]')).toBeTruthy();
      expect(form.querySelector("#switch-to-login")).toBeTruthy();
    });

    it("has validation constraints", () => {
      const form = createRegisterForm();
      const usernameInput = form.querySelector("#username") as HTMLInputElement;
      const passwordInput = form.querySelector("#password") as HTMLInputElement;
      expect(usernameInput.minLength).toBe(3);
      expect(passwordInput.minLength).toBe(8);
    });
  });

  describe("createRcaForm", () => {
    it("creates an empty form for new RCAs", () => {
      const form = createRcaForm();
      expect(form.tagName).toBe("FORM");
      expect(form.querySelector("#rca-name")).toBeTruthy();
      expect(form.querySelector("#rca-description")).toBeTruthy();
      expect(form.querySelector("#rca-timeline")).toBeTruthy();
      expect(form.textContent).toContain("Create New RCA");
    });

    it("populates form with existing RCA data", () => {
      const mockRca: Rca = {
        id: 1,
        name: "Outage RCA",
        description: "Production outage",
        timeline: "Monday 9am",
        owner: null,
        created_at: "2024-01-01T00:00:00Z",
        updated_at: "2024-01-01T00:00:00Z",
      };

      const form = createRcaForm(mockRca);
      const nameInput = form.querySelector("#rca-name") as HTMLInputElement;
      const descriptionInput = form.querySelector(
        "#rca-description"
      ) as HTMLTextAreaElement;
      const timelineInput = form.querySelector("#rca-timeline") as HTMLTextAreaElement;

      expect(nameInput.value).toBe("Outage RCA");
      expect(descriptionInput.value).toBe("Production outage");
      expect(timelineInput.value).toBe("Monday 9am");
      expect(form.textContent).toContain("Edit RCA");
      expect(form.querySelector("#cancel-edit-rca")).toBeTruthy();
    });

    it("has required attribute on name field", () => {
      const form = createRcaForm();
      const nameInput = form.querySelector("#rca-name") as HTMLInputElement;
      expect(nameInput.required).toBe(true);
    });
  });

  describe("createRcaList", () => {
    it("shows empty state when no RCAs", () => {
      const list = createRcaList([]);
      expect(list.textContent).toContain("No RCAs yet");
    });

    it("creates cards for each RCA", () => {
      const mockRcas: Rca[] = [
        {
          id: 1,
          name: "RCA 1",
          description: "First RCA",
          timeline: null,
          owner: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        {
          id: 2,
          name: "RCA 2",
          description: null,
          timeline: null,
          owner: null,
          created_at: "2024-01-02T00:00:00Z",
          updated_at: "2024-01-02T00:00:00Z",
        },
      ];

      const list = createRcaList(mockRcas);
      expect(list.querySelectorAll(".rca-card").length).toBe(2);
      expect(list.textContent).toContain("RCA 1");
      expect(list.textContent).toContain("RCA 2");
      expect(list.textContent).toContain("First RCA");
    });

    it("includes delete buttons for each RCA", () => {
      const mockRcas: Rca[] = [
        {
          id: 1,
          name: "RCA 1",
          description: null,
          timeline: null,
          owner: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const list = createRcaList(mockRcas);
      const deleteButton = list.querySelector(".delete-rca") as HTMLButtonElement;
      expect(deleteButton).toBeTruthy();
      expect(deleteButton.dataset.rcaId).toBe("1");
    });

    it("escapes HTML in RCA data", () => {
      const mockRcas: Rca[] = [
        {
          id: 1,
          name: "<script>alert('xss')</script>",
          description: "<b>Bold</b>",
          timeline: null,
          owner: null,
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const list = createRcaList(mockRcas);
      const html = list.innerHTML;

      expect(html).toContain("&lt;script&gt;");
      expect(html).toContain("&lt;b&gt;");
    });
  });

  describe("createWhyTree", () => {
    it("creates a tree container with nodes", () => {
      const mockNodes: WhyNode[] = [
        {
          id: 1,
          rca_id: 1,
          parent_id: null,
          node_type: "why",
          content: "Server crashed",
          order: 0,
          children: [],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const tree = createWhyTree(mockNodes, 1, true);
      expect(tree.className).toBe("why-thread");
      expect(tree.querySelectorAll(".why-node").length).toBe(1);
      expect(tree.textContent).toContain("Server crashed");
    });

    it("renders nested children", () => {
      const mockNodes: WhyNode[] = [
        {
          id: 1,
          rca_id: 1,
          parent_id: null,
          node_type: "why",
          content: "Why 1",
          order: 0,
          children: [
            {
              id: 2,
              rca_id: 1,
              parent_id: 1,
              node_type: "why",
              content: "Because X",
              order: 0,
              children: [],
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const tree = createWhyTree(mockNodes, 1, true);
      expect(tree.querySelectorAll(".why-node").length).toBe(2);
      expect(tree.textContent).toContain("Why 1");
      expect(tree.textContent).toContain("Because X");
    });

    it("shows correct badges for node types", () => {
      const mockNodes: WhyNode[] = [
        {
          id: 1,
          rca_id: 1,
          parent_id: null,
          node_type: "why",
          content: "A why",
          order: 0,
          children: [
            {
              id: 2,
              rca_id: 1,
              parent_id: 1,
              node_type: "root_cause",
              content: "The root cause",
              order: 0,
              children: [],
              created_at: "2024-01-01T00:00:00Z",
              updated_at: "2024-01-01T00:00:00Z",
            },
          ],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
      ];

      const tree = createWhyTree(mockNodes, 1, true);
      const badges = tree.querySelectorAll(".badge");
      expect(badges.length).toBe(2);
      expect(badges[0]?.textContent?.trim()).toBe("Why");
      expect(badges[1]?.textContent?.trim()).toBe("Root Cause");
    });
  });

  describe("showError", () => {
    it("displays error message in app container", () => {
      showError("Test error message");
      const app = document.getElementById("app");
      const alert = app?.querySelector(".alert-danger");

      expect(alert).toBeTruthy();
      expect(alert?.textContent).toContain("Test error message");
    });

    it("escapes HTML in error messages", () => {
      showError("<script>alert('xss')</script>");
      const app = document.getElementById("app");
      const alert = app?.querySelector(".alert-danger");

      expect(alert?.innerHTML).toContain("&lt;script&gt;");
    });

    it("does nothing if app container does not exist", () => {
      document.body.innerHTML = "";
      expect(() => showError("Test")).not.toThrow();
    });
  });

  describe("showSuccess", () => {
    it("displays success message in app container", () => {
      showSuccess("Test success message");
      const app = document.getElementById("app");
      const alert = app?.querySelector(".alert-success");

      expect(alert).toBeTruthy();
      expect(alert?.textContent).toContain("Test success message");
    });

    it("escapes HTML in success messages", () => {
      showSuccess("<b>Bold text</b>");
      const app = document.getElementById("app");
      const alert = app?.querySelector(".alert-success");

      expect(alert?.innerHTML).toContain("&lt;b&gt;");
    });

    it("does nothing if app container does not exist", () => {
      document.body.innerHTML = "";
      expect(() => showSuccess("Test")).not.toThrow();
    });
  });
});
