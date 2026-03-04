/**
 * Módulo Administrativo
 * Gerencia o painel de administração para MASTER e ADMIN
 */

import {
  database,
  CONSTANTS,
  minutesToTime,
  formatDate,
  formatPrice,
  generateSlug,
} from "./firebase.js";
import {
  login,
  logout,
  onAuthStateChange,
  isMaster,
  isAdmin,
  canEditBarbershop,
} from "./auth.js";
import { getAllBarbershops } from "./barbershops.js";
import {
  ref,
  get,
  set,
  update,
  remove,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Estado global da aplicação admin
let adminState = {
  currentUser: null,
  currentSection: "agenda",
  currentBarbershopId: null,
  managedBarbershopId: null, // Barbearia sendo gerenciada atualmente
  financialFiltersInitialized: false, // Flag para inicializar filtros financeiros apenas uma vez
};

/**
 * Inicializa a página administrativa
 */
export function initAdminPage() {
  // Verifica estado de autenticação
  onAuthStateChange((user) => {
    console.log("Auth state changed:", user);
    if (user && (user.role === "ADMIN" || user.role === "MASTER")) {
      adminState.currentUser = user;
      showDashboard();
      loadDashboardData();
    } else {
      showLoginScreen();
      if (user) {
        // Usuário logado mas sem permissões admin
        const errorMsg = user.role
          ? `Acesso negado. Role "${user.role}" não é permitida.`
          : "Acesso negado. Usuário não possui role cadastrada no banco de dados. Verifique se existe um registro em users/" +
            user.uid;
        console.error("Login negado:", {
          uid: user.uid,
          email: user.email,
          role: user.role,
        });
        document.getElementById("login-error").textContent = errorMsg;
        logout(); // Faz logout automático
      }
    }
  });

  // Event listener para login
  document.getElementById("login-form").addEventListener("submit", handleLogin);

  // Configura event listeners para ações dos cards
  setupCardActions();
}

/**
 * Exibe a tela de login
 */
function showLoginScreen() {
  document.getElementById("login-screen").style.display = "flex";
  document.getElementById("admin-dashboard").style.display = "none";
}

/**
 * Exibe o dashboard
 */
function showDashboard() {
  document.getElementById("login-screen").style.display = "none";
  document.getElementById("admin-dashboard").style.display = "block";

  // Atualiza informações do usuário
  const userInfoEl = document.getElementById("user-info");
  userInfoEl.textContent = `${adminState.currentUser.email} (${adminState.currentUser.role})`;

  // Configura navegação
  setupNavigation();

  // Configura logout
  document.getElementById("logout-btn").addEventListener("click", handleLogout);
}

/**
 * Processa o login
 */
async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;
  const errorEl = document.getElementById("login-error");

  try {
    errorEl.textContent = "Entrando...";
    const user = await login(email, password);
    console.log("Login realizado:", user);
    // O onAuthStateChange vai redirecionar automaticamente
  } catch (error) {
    console.error("Erro no login:", error);
    // Mensagem de erro mais detalhada
    if (
      error.code === "auth/user-not-found" ||
      error.code === "auth/wrong-password" ||
      error.code === "auth/invalid-credential"
    ) {
      errorEl.textContent = "E-mail ou senha incorretos";
    } else if (error.code === "auth/too-many-requests") {
      errorEl.textContent = "Muitas tentativas. Aguarde alguns minutos.";
    } else if (error.message === "Usuário não encontrado no banco de dados") {
      errorEl.textContent =
        "Usuário autenticado, mas não cadastrado no sistema. Contate o administrador.";
    } else {
      errorEl.textContent = `Erro: ${error.message}`;
    }
  }
}

/**
 * Processa o logout
 */
async function handleLogout() {
  try {
    await logout();
    // O onAuthStateChange vai redirecionar automaticamente
  } catch (error) {
    console.error("Erro no logout:", error);
  }
}

/**
 * Configura a navegação entre seções
 */
function setupNavigation() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    item.addEventListener("click", () => {
      const section = item.dataset.section;

      // Atualiza estado
      adminState.currentSection = section;

      // Atualiza UI
      navItems.forEach((nav) => nav.classList.remove("active"));
      item.classList.add("active");

      document.querySelectorAll(".admin-section").forEach((sec) => {
        sec.classList.remove("active");
      });
      document.getElementById(`section-${section}`).classList.add("active");

      // Carrega dados da seção
      loadSectionData(section);
    });
  });
}

/**
 * Carrega dados iniciais do dashboard
 */
async function loadDashboardData() {
  // Configura data de hoje na agenda
  const today = formatDate(new Date());
  document.getElementById("agenda-date").value = today;
  document.getElementById("agenda-date").addEventListener("change", loadAgenda);

  // Popula seletor de barbearias
  await populateBarbershopSelector();
  document
    .getElementById("agenda-barbershop")
    .addEventListener("change", loadAgenda);

  // Carrega agenda do dia
  loadAgenda();
}

/**
 * Popula o seletor de barbearias na agenda
 */
async function populateBarbershopSelector() {
  const selector = document.getElementById("agenda-barbershop");
  const barbershops = await getAllBarbershops();

  selector.innerHTML = '<option value="">Todas as barbearias</option>';

  Object.entries(barbershops).forEach(([slug, shop]) => {
    const option = document.createElement("option");
    option.value = slug;
    option.textContent = shop.name;
    selector.appendChild(option);
  });
}

/**
 * Carrega dados de uma seção específica
 */
function loadSectionData(section) {
  switch (section) {
    case "agenda":
      loadAgenda();
      break;
    case "barbershops":
      loadBarbershopsAdmin();
      break;
    case "services":
      loadServicesAdmin();
      break;
    case "barbers":
      loadBarbersAdmin();
      break;
    case "availability":
      loadAvailabilityAdmin();
      break;
    case "financial":
      // Inicializa filtros apenas se ainda não foram configurados
      if (!adminState.financialFiltersInitialized) {
        setupFinancialFilters();
        adminState.financialFiltersInitialized = true;
      }
      loadFinancialAdmin();
      break;
  }
}

/**
 * Carrega a agenda de agendamentos
 */
async function loadAgenda() {
  const date = document.getElementById("agenda-date").value;
  const selectedBarbershop = document.getElementById("agenda-barbershop").value;
  const container = document.getElementById("agenda-content");

  container.innerHTML =
    '<div class="loading-small"><div class="spinner-small"></div><p>Carregando...</p></div>';

  try {
    let appointments = [];

    if (selectedBarbershop) {
      // Filtra por barbearia específica
      appointments = await getAppointmentsByDate(selectedBarbershop, date);
    } else {
      // ADMIN vê todos os agendamentos de todas as barbearias
      const allBarbershops = await getAllBarbershops();
      for (const [slug, _] of Object.entries(allBarbershops)) {
        const barbershopAppts = await getAppointmentsByDate(slug, date);
        appointments = appointments.concat(barbershopAppts);
      }
    }

    if (appointments.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhum agendamento para esta data.</p>';
      return;
    }

    // Ordena por horário
    appointments.sort((a, b) => a.startMin - b.startMin);

    // Calcular estatísticas
    const stats = {
      total: appointments.length,
      pending: appointments.filter((a) => a.status === "pending").length,
      confirmed: appointments.filter((a) => a.status === "confirmed").length,
      completed: appointments.filter((a) => a.status === "completed").length,
      cancelled: appointments.filter((a) => a.status === "cancelled").length,
      noShow: appointments.filter((a) => a.status === "no_show").length,
    };

    // Renderiza com resumo e grid de cards
    container.innerHTML = `
      <div class="agenda-summary" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; margin-bottom: 20px;">
        <div class="stat-card" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 3px 5px rgba(0,0,0,0.1);">
          <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 3px;">Total</div>
          <div style="font-size: 1.6rem; font-weight: bold;">${stats.total}</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 3px 5px rgba(0,0,0,0.1);">
          <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 3px;">⏳ Pendentes</div>
          <div style="font-size: 1.6rem; font-weight: bold;">${stats.pending}</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 3px 5px rgba(0,0,0,0.1);">
          <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 3px;">✅ Confirmados</div>
          <div style="font-size: 1.6rem; font-weight: bold;">${stats.confirmed}</div>
        </div>
        <div class="stat-card" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 3px 5px rgba(0,0,0,0.1);">
          <div style="font-size: 0.8rem; opacity: 0.9; margin-bottom: 3px;">💰 Finalizados</div>
          <div style="font-size: 1.6rem; font-weight: bold;">${stats.completed}</div>
        </div>
      </div>
      <div class="agenda-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 15px;">
        ${appointments.map((apt) => createAppointmentCard(apt)).join("")}
      </div>
    `;

    // Event listeners
    appointments.forEach((apt) => {
      setupAppointmentActions(apt);
    });
  } catch (error) {
    console.error("Erro ao carregar agenda:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar agenda.</p>';
  }
}

/**
 * Busca agendamentos por data
 */
async function getAppointmentsByDate(slug, date) {
  const appointmentsRef = ref(database, `appointments/${slug}/${date}`);
  const snapshot = await get(appointmentsRef);

  if (!snapshot.exists()) return [];

  const appointments = [];
  const barbers = snapshot.val();

  for (const [barberId, slots] of Object.entries(barbers)) {
    for (const [startMin, appointment] of Object.entries(slots)) {
      appointments.push({
        ...appointment,
        slug,
        barberId,
        startMin: parseInt(startMin),
      });
    }
  }

  return appointments;
}

/**
 * Cria o HTML de um card de agendamento
 */
function createAppointmentCard(appointment) {
  const statusClass = `status-${appointment.status}`;
  const statusText = {
    pending: "🕔 Pendente",
    confirmed: "✅ Confirmado",
    cancelled: "❌ Cancelado",
    completed: "💰 Serviço Feito",
    no_show: "👻 Cliente Faltou",
  }[appointment.status];

  const statusColor = {
    pending: "#f59e0b",
    confirmed: "#10b981",
    cancelled: "#ef4444",
    completed: "#059669",
    no_show: "#dc2626",
  }[appointment.status];

  return `
    <div class="admin-card appointment-card ${appointment.status}" data-apt-id="${appointment.slug}-${appointment.date}-${appointment.barberId}-${appointment.startMin}" style="border-left: 4px solid ${statusColor};">
      <div class="card-header" style="border-bottom: 1px solid #e2e8f0; padding-bottom: 12px; margin-bottom: 15px;">
        <div>
          <h3 style="font-size: 1.25rem; color: #f59e0b; margin: 0 0 5px 0; font-weight: 700;">
            🕐 ${minutesToTime(appointment.startMin)} - ${minutesToTime(appointment.endMin)}
          </h3>
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <span class="appointment-status ${statusClass}" style="display: inline-block; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px; font-weight: 600;">${statusText}</span>
            <span style="display: inline-block; font-size: 0.85rem; padding: 4px 12px; border-radius: 20px; font-weight: 600; background: #3b82f6; color: white;">🏪 ${appointment.barbershopName}</span>
          </div>
        </div>
      </div>
      <div class="card-body">
        <p style="margin: 8px 0;"><strong>👤 Cliente:</strong> ${appointment.clientName}</p>
        <p style="margin: 8px 0;"><strong>📞 Telefone:</strong> <a href="tel:${appointment.clientPhone}" style="color: #3b82f6; text-decoration: none;">${appointment.clientPhone}</a></p>
        <p style="margin: 8px 0;"><strong>✂️ Serviço:</strong> ${appointment.serviceName}</p>
        <p style="margin: 8px 0;"><strong>💵 Preço:</strong> <span style="color: #10b981; font-weight: 600;">${formatPrice(appointment.servicePrice)}</span></p>
        <p style="margin: 8px 0;"><strong>👨‍🤱 Barbeiro:</strong> ${appointment.barberName}</p>
      </div>
      ${
        appointment.status === CONSTANTS.STATUS.CANCELLED
          ? `
          <div style="text-align: center; padding: 15px; margin-top: 15px; background: #fee; border-radius: 8px;">
            <p style="margin: 0; color: #991b1b; font-size: 0.9rem;">❌ Este agendamento foi cancelado</p>
          </div>
        `
          : appointment.status === CONSTANTS.STATUS.COMPLETED
            ? `
          <div style="text-align: center; padding: 15px; margin-top: 15px; background: #d1fae5; border-radius: 8px;">
            <p style="margin: 0; color: #065f46; font-size: 0.9rem;">💰 Serviço realizado e pago</p>
          </div>
        `
            : appointment.status === CONSTANTS.STATUS.NO_SHOW
              ? `
          <div style="text-align: center; padding: 15px; margin-top: 15px; background: #fee2e2; border-radius: 8px;">
            <p style="margin: 0; color: #991b1b; font-size: 0.9rem;">👻 Cliente não compareceu</p>
          </div>
        `
              : `
          <div class="card-actions" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
            ${
              appointment.status === CONSTANTS.STATUS.PENDING
                ? `
                <button class="btn btn-success btn-small apt-confirm" data-slug="${appointment.slug}" data-date="${appointment.date}" data-barber="${appointment.barberId}" data-start="${appointment.startMin}">
                  ✅ Confirmar
                </button>
              `
                : ""
            }
            ${
              appointment.status === CONSTANTS.STATUS.CONFIRMED
                ? `
                <button class="btn btn-success btn-small apt-complete" data-slug="${appointment.slug}" data-date="${appointment.date}" data-barber="${appointment.barberId}" data-start="${appointment.startMin}" style="background: #059669;">
                  💰 Serviço Feito
                </button>
                <button class="btn btn-warning btn-small apt-no-show" data-slug="${appointment.slug}" data-date="${appointment.date}" data-barber="${appointment.barberId}" data-start="${appointment.startMin}" style="background: #ea580c; color: white;">
                  👻 Cliente Faltou
                </button>
              `
                : ""
            }
            <button class="btn btn-danger btn-small apt-cancel" data-slug="${appointment.slug}" data-date="${appointment.date}" data-barber="${appointment.barberId}" data-start="${appointment.startMin}">
              ❌ Cancelar
            </button>
          </div>
        `
      }
    </div>
  `;
}

/**
 * Configura ações dos agendamentos
 */
function setupAppointmentActions(appointment) {
  const appointmentPath = `appointments/${appointment.slug}/${appointment.date}/${appointment.barberId}/${appointment.startMin}`;

  // Botão confirmar
  const confirmBtn = document.querySelector(
    `.apt-confirm[data-slug="${appointment.slug}"][data-date="${appointment.date}"][data-barber="${appointment.barberId}"][data-start="${appointment.startMin}"]`,
  );
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      if (confirm("Confirmar este agendamento?")) {
        await update(ref(database, appointmentPath), {
          status: CONSTANTS.STATUS.CONFIRMED,
        });
        loadAgenda();
      }
    });
  }

  // Botão cancelar
  const cancelBtn = document.querySelector(
    `.apt-cancel[data-slug="${appointment.slug}"][data-date="${appointment.date}"][data-barber="${appointment.barberId}"][data-start="${appointment.startMin}"]`,
  );
  if (cancelBtn) {
    cancelBtn.addEventListener("click", async () => {
      if (confirm("Cancelar este agendamento?")) {
        await update(ref(database, appointmentPath), {
          status: CONSTANTS.STATUS.CANCELLED,
        });
        loadAgenda();
      }
    });
  }

  // Botão serviço feito
  const completeBtn = document.querySelector(
    `.apt-complete[data-slug="${appointment.slug}"][data-date="${appointment.date}"][data-barber="${appointment.barberId}"][data-start="${appointment.startMin}"]`,
  );
  if (completeBtn) {
    completeBtn.addEventListener("click", async () => {
      if (confirm("Marcar serviço como realizado e pago?")) {
        await update(ref(database, appointmentPath), {
          status: CONSTANTS.STATUS.COMPLETED,
          completedAt: new Date().toISOString(),
        });
        loadAgenda();
      }
    });
  }

  // Botão cliente faltou
  const noShowBtn = document.querySelector(
    `.apt-no-show[data-slug="${appointment.slug}"][data-date="${appointment.date}"][data-barber="${appointment.barberId}"][data-start="${appointment.startMin}"]`,
  );
  if (noShowBtn) {
    noShowBtn.addEventListener("click", async () => {
      if (confirm("Marcar que o cliente não compareceu?")) {
        await update(ref(database, appointmentPath), {
          status: CONSTANTS.STATUS.NO_SHOW,
          noShowAt: new Date().toISOString(),
        });
        loadAgenda();
      }
    });
  }
}

/**
 * Carrega gestão de barbearias (apenas MASTER)
 */
async function loadBarbershopsAdmin() {
  const container = document.getElementById("barbershops-admin-list");

  // Configura botão adicionar PRIMEIRO (antes de qualquer return)
  document.getElementById("add-barbershop-btn").onclick = () => {
    console.log("Botão + Nova Barbearia clicado");
    showBarbershopModal();
  };

  container.innerHTML =
    '<div class="loading-small"><div class="spinner-small"></div><p>Carregando...</p></div>';

  try {
    const barbershops = await getAllBarbershops();
    const barbershopsList = Object.entries(barbershops).map(([id, data]) => ({
      id,
      ...data,
    }));

    if (barbershopsList.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b;">Nenhuma barbearia cadastrada.</p>';
      return;
    }

    container.innerHTML = barbershopsList
      .map((bs) => createBarbershopCard(bs))
      .join("");

    // Configurar eventos dos botões
    setupBarbershopActions();
  } catch (error) {
    console.error("Erro ao carregar barbearias:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar barbearias.</p>';
  }
}

/**
 * Cria card de barbearia
 */
function createBarbershopCard(barbershop) {
  return `
    <div class="admin-card barbershop-card" data-barbershop-id="${barbershop.id}">
      <div class="card-header">
        <h3>${barbershop.name}</h3>
        <div class="card-actions">
          <button class="btn btn-small btn-secondary edit-barbershop" data-barbershop-id="${barbershop.id}">
            ✏️ Editar
          </button>
          <button class="btn btn-small btn-danger delete-barbershop" data-barbershop-id="${barbershop.id}">
            🗑️ Excluir
          </button>
        </div>
      </div>
      <div class="card-body">
        <p><strong>📍 Endereço:</strong> ${barbershop.address || "Não informado"}</p>
        <p><strong>📞 Telefone:</strong> ${barbershop.phone || "Não informado"}</p>
        <p><strong>📧 E-mail:</strong> ${barbershop.email || "Não informado"}</p>
        <p><strong>🕐 Intervalo entre atendimentos:</strong> ${barbershop.settings?.interval || 20} minutos</p>
        <p><strong>Status:</strong> <span class="status-${barbershop.active ? "active" : "inactive"}">${barbershop.active ? "Ativa" : "Inativa"}</span></p>
      </div>
    </div>
  `;
}

/**
 * Configura eventos dos botões das barbearias
 */
function setupBarbershopActions() {
  // Botões de editar
  document.querySelectorAll(".edit-barbershop").forEach((btn) => {
    btn.onclick = () => {
      const barbershopId = btn.dataset.barbershopId;
      showBarbershopModal(barbershopId);
    };
  });

  // Botões de excluir
  document.querySelectorAll(".delete-barbershop").forEach((btn) => {
    btn.onclick = async () => {
      const barbershopId = btn.dataset.barbershopId;
      if (
        confirm(
          "Tem certeza que deseja excluir esta barbearia? Todos os dados relacionados serão perdidos.",
        )
      ) {
        await deleteBarbershop(barbershopId);
      }
    };
  });
}

/**
 * Mostra modal para adicionar/editar barbearia
 */
function showBarbershopModal(barbershopId = null) {
  console.log("showBarbershopModal chamado", { barbershopId });
  const modal = document.getElementById("modal");
  const isEditing = barbershopId !== null;

  if (isEditing) {
    // Carregar dados da barbearia existente
    get(ref(database, `barbershops/${barbershopId}`)).then((snapshot) => {
      if (snapshot.exists()) {
        const barbershopData = snapshot.val();
        renderBarbershopModal(isEditing, barbershopData, barbershopId);
      }
    });
  } else {
    renderBarbershopModal(isEditing, null, null);
  }

  modal.style.display = "block";
}

/**
 * Renderiza modal da barbearia
 */
function renderBarbershopModal(isEditing, barbershopData, barbershopId) {
  console.log("renderBarbershopModal chamado", {
    isEditing,
    barbershopData,
    barbershopId,
  });
  const modalBody = document.getElementById("modal-body");
  const settings = barbershopData?.settings || {};

  modalBody.innerHTML = `
    <h2>${isEditing ? "Editar Barbearia" : "Nova Barbearia"}</h2>
    <form id="barbershop-form" class="admin-form">
      <div class="form-group">
        <label for="barbershop-name">Nome da Barbearia *</label>
        <input type="text" id="barbershop-name" required value="${barbershopData?.name || ""}">
      </div>

      <div class="form-group">
        <label for="barbershop-description">Descrição</label>
        <textarea id="barbershop-description" rows="3" placeholder="Descrição da barbearia...">${barbershopData?.description || ""}</textarea>
      </div>

      <div class="form-group">
        <label for="barbershop-address">Endereço Completo *</label>
        <input type="text" id="barbershop-address" required value="${barbershopData?.address || ""}" placeholder="Rua, número, bairro, cidade">
      </div>

      <div class="form-group">
        <label for="barbershop-phone">Telefone *</label>
        <input type="tel" id="barbershop-phone" required value="${barbershopData?.phone || ""}" placeholder="(11) 99999-9999">
      </div>

      <div class="form-group">
        <label for="barbershop-email">E-mail</label>
        <input type="email" id="barbershop-email" value="${barbershopData?.email || ""}" placeholder="contato@barbearia.com">
      </div>

      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e2e8f0;">
      <h3 style="margin-bottom: 15px;">⚙️ Configurações de Atendimento</h3>

      <div class="form-group">
        <label for="barbershop-interval">Intervalo entre Atendimentos (minutos)</label>
        <input type="number" id="barbershop-interval" value="${settings.interval || 20}" min="0" max="60">
        <small>Tempo de pausa entre cada agendamento</small>
      </div>

      <div class="form-group">
        <label for="barbershop-advance-booking">Dias para Agendamento Antecipado</label>
        <input type="number" id="barbershop-advance-booking" value="${settings.advanceBookingDays || 30}" min="1" max="90">
        <small>Quantos dias no futuro os clientes podem agendar</small>
      </div>

      <div class="form-group">
        <label for="barbershop-max-per-slot">Máximo de Agendamentos por Horário</label>
        <input type="number" id="barbershop-max-per-slot" value="${settings.maxPerSlot || 1}" min="1" max="10">
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="barbershop-active" ${barbershopData?.active !== false ? "checked" : ""}>
          Barbearia ativa (aceita agendamentos)
        </label>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="barbershop-is-open" ${settings.isOpen !== false ? "checked" : ""}>
          Barbearia aberta no momento
        </label>
      </div>

      <div class="form-group">
        <label for="barbershop-closed-message">Mensagem quando fechada</label>
        <input type="text" id="barbershop-closed-message" value="${settings.closedMessage || ""}" placeholder="Ex: Fechado por reforma">
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          ${isEditing ? "💾 Salvar Alterações" : "➕ Adicionar Barbearia"}
        </button>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">
          Cancelar
        </button>
      </div>
    </form>
  `;

  // Configura submit do formulário
  const form = document.getElementById("barbershop-form");
  console.log("Formulário encontrado:", form);

  form.addEventListener("submit", async (e) => {
    console.log("Formulário submetido!");
    e.preventDefault();
    await saveBarbershop(isEditing, barbershopId);
  });
}

/**
 * Salva barbearia
 */
async function saveBarbershop(isEditing, barbershopId) {
  console.log("Salvando barbearia...", { isEditing, barbershopId });
  try {
    const name = document.getElementById("barbershop-name").value.trim();
    const description = document
      .getElementById("barbershop-description")
      .value.trim();
    const address = document.getElementById("barbershop-address").value.trim();
    const phone = document.getElementById("barbershop-phone").value.trim();
    const email = document.getElementById("barbershop-email").value.trim();
    const interval = parseInt(
      document.getElementById("barbershop-interval").value,
    );
    const advanceBookingDays = parseInt(
      document.getElementById("barbershop-advance-booking").value,
    );
    const maxPerSlot = parseInt(
      document.getElementById("barbershop-max-per-slot").value,
    );
    const active = document.getElementById("barbershop-active").checked;
    const isOpen = document.getElementById("barbershop-is-open").checked;
    const closedMessage = document
      .getElementById("barbershop-closed-message")
      .value.trim();

    if (!name || !address || !phone) {
      alert("Preencha todos os campos obrigatórios!");
      return;
    }

    const slug = isEditing ? barbershopId : generateSlug(name);

    const barbershopData = {
      name,
      description,
      address,
      phone,
      email,
      active,
      settings: {
        workingDays: isEditing
          ? (
              await get(
                ref(
                  database,
                  `barbershops/${barbershopId}/settings/workingDays`,
                ),
              )
            ).val() || {
              1: true,
              2: true,
              3: true,
              4: true,
              5: true,
              6: true,
              0: false,
            }
          : {
              1: true,
              2: true,
              3: true,
              4: true,
              5: true,
              6: true,
              0: false,
            },
        workingHours: isEditing
          ? (
              await get(
                ref(
                  database,
                  `barbershops/${barbershopId}/settings/workingHours`,
                ),
              )
            ).val() || {
              1: { start: "08:00", end: "18:00" },
              2: { start: "08:00", end: "18:00" },
              3: { start: "08:00", end: "18:00" },
              4: { start: "08:00", end: "18:00" },
              5: { start: "08:00", end: "18:00" },
              6: { start: "08:00", end: "18:00" },
            }
          : {
              1: { start: "08:00", end: "18:00" },
              2: { start: "08:00", end: "18:00" },
              3: { start: "08:00", end: "18:00" },
              4: { start: "08:00", end: "18:00" },
              5: { start: "08:00", end: "18:00" },
              6: { start: "08:00", end: "18:00" },
            },
        interval,
        advanceBookingDays,
        maxPerSlot,
        isOpen,
        closedMessage,
      },
      updatedAt: new Date().toISOString(),
    };

    if (!isEditing) {
      barbershopData.createdAt = new Date().toISOString();
      barbershopData.barbers = {};
      barbershopData.services = {};
    }

    console.log("Salvando em:", `barbershops/${slug}`, barbershopData);
    await set(ref(database, `barbershops/${slug}`), barbershopData);
    console.log("Barbearia salva com sucesso!");

    document.getElementById("modal").style.display = "none";
    loadBarbershopsAdmin();
    alert(`Barbearia ${isEditing ? "atualizada" : "adicionada"} com sucesso!`);
  } catch (error) {
    console.error("Erro ao salvar barbearia:", error);
    alert("Erro ao salvar barbearia. Tente novamente.");
  }
}

/**
 * Exclui barbearia
 */
async function deleteBarbershop(barbershopId) {
  try {
    await remove(ref(database, `barbershops/${barbershopId}`));
    loadBarbershopsAdmin();
    alert("Barbearia excluída com sucesso!");
  } catch (error) {
    console.error("Erro ao excluir barbearia:", error);
    alert("Erro ao excluir barbearia. Tente novamente.");
  }
}

/**
 * Carrega gestão de serviços
 */
async function loadServicesAdmin() {
  const container = document.getElementById("services-admin-list");

  // Configura botão adicionar PRIMEIRO (antes de qualquer return)
  document.getElementById("add-service-btn").onclick = () => {
    showServiceModal();
  };

  try {
    const barbershops = await getAllBarbershops();
    const barbershopSlugs = Object.keys(barbershops);

    if (barbershopSlugs.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhuma barbearia cadastrada.</p>';
      return;
    }

    // Criar seletor de barbearias
    const selectorHTML = `
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="barbershop-selector-services">Selecione a Barbearia:</label>
        <select id="barbershop-selector-services" class="form-control" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px;">
          <option value="all">Todas as Barbearias</option>
          ${barbershopSlugs.map((slug) => `<option value="${slug}">${barbershops[slug].name}</option>`).join("")}
        </select>
      </div>
      <div id="services-list-container"></div>
    `;

    container.innerHTML = selectorHTML;

    // Função para carregar serviços da barbearia selecionada
    const loadServicesByShop = (selectedSlug) => {
      const listContainer = document.getElementById("services-list-container");
      let allServices = [];

      if (selectedSlug === "all") {
        // Listar serviços de todas as barbearias
        barbershopSlugs.forEach((slug) => {
          const shop = barbershops[slug];
          if (shop && shop.services) {
            Object.entries(shop.services).forEach(([id, data]) => {
              allServices.push({
                id,
                ...data,
                barbershopSlug: slug,
                barbershopName: shop.name,
              });
            });
          }
        });
        adminState.managedBarbershopId = null;
      } else {
        // Listar serviços da barbearia selecionada
        const barbershop = barbershops[selectedSlug];
        adminState.managedBarbershopId = selectedSlug;

        if (barbershop && barbershop.services) {
          allServices = Object.entries(barbershop.services).map(
            ([id, data]) => ({
              id,
              ...data,
              barbershopSlug: selectedSlug,
              barbershopName: barbershop.name,
            }),
          );
        }
      }

      if (allServices.length === 0) {
        listContainer.innerHTML =
          '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhum serviço cadastrado.</p>';
        return;
      }

      listContainer.innerHTML = allServices
        .map((service) => createServiceCard(service))
        .join("");
    };

    // Carregar serviços inicialmente (todas as barbearias)
    loadServicesByShop("all");

    // Configurar evento de mudança no seletor
    document
      .getElementById("barbershop-selector-services")
      .addEventListener("change", (e) => {
        loadServicesByShop(e.target.value);
      });
  } catch (error) {
    console.error("Erro ao carregar serviços:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar serviços.</p>';
  }
}

/**
 * Carrega gestão de barbeiros
 */
async function loadBarbersAdmin() {
  const container = document.getElementById("barbers-admin-list");

  // Configura botão adicionar PRIMEIRO (antes de qualquer return)
  document.getElementById("add-barber-btn").onclick = () => {
    showBarberModal();
  };

  try {
    const barbershops = await getAllBarbershops();
    const barbershopSlugs = Object.keys(barbershops);

    if (barbershopSlugs.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhuma barbearia cadastrada.</p>';
      return;
    }

    // Criar seletor de barbearias
    const selectorHTML = `
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="barbershop-selector">Selecione a Barbearia:</label>
        <select id="barbershop-selector" class="form-control" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px;">
          <option value="all">Todas as Barbearias</option>
          ${barbershopSlugs.map((slug) => `<option value="${slug}">${barbershops[slug].name}</option>`).join("")}
        </select>
      </div>
      <div id="barbers-list-container"></div>
    `;

    container.innerHTML = selectorHTML;

    // Função para carregar barbeiros da barbearia selecionada
    const loadBarbersByShop = (selectedSlug) => {
      const listContainer = document.getElementById("barbers-list-container");
      let allBarbers = [];

      if (selectedSlug === "all") {
        // Listar barbeiros de todas as barbearias
        barbershopSlugs.forEach((slug) => {
          const shop = barbershops[slug];
          if (shop && shop.barbers) {
            Object.entries(shop.barbers).forEach(([id, data]) => {
              allBarbers.push({
                id,
                ...data,
                barbershopSlug: slug,
                barbershopName: shop.name,
              });
            });
          }
        });
        adminState.managedBarbershopId = null;
      } else {
        // Listar barbeiros da barbearia selecionada
        const barbershop = barbershops[selectedSlug];
        adminState.managedBarbershopId = selectedSlug;

        if (barbershop && barbershop.barbers) {
          allBarbers = Object.entries(barbershop.barbers).map(([id, data]) => ({
            id,
            ...data,
            barbershopSlug: selectedSlug,
            barbershopName: barbershop.name,
          }));
        }
      }

      if (allBarbers.length === 0) {
        listContainer.innerHTML =
          '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhum barbeiro cadastrado.</p>';
        return;
      }

      listContainer.innerHTML = allBarbers
        .map((barber) => createBarberCard(barber))
        .join("");
    };

    // Carregar barbeiros inicialmente (todas as barbearias)
    loadBarbersByShop("all");

    // Configurar evento de mudança no seletor
    document
      .getElementById("barbershop-selector")
      .addEventListener("change", (e) => {
        loadBarbersByShop(e.target.value);
      });
  } catch (error) {
    console.error("Erro ao carregar barbeiros:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar barbeiros.</p>';
  }
}

/**
 * Cria card de barbeiro
 */
function createBarberCard(barber) {
  return `
    <div class="admin-card barber-card" data-barber-id="${barber.id}" data-barbershop-slug="${barber.barbershopSlug}">
      <div class="card-header">
        <h3>${barber.name}</h3>
        <div class="card-actions">
          <button class="btn btn-small btn-secondary edit-barber" data-barber-id="${barber.id}" data-barbershop-slug="${barber.barbershopSlug}">
            ✏️ Editar
          </button>
          <button class="btn btn-small btn-danger delete-barber" data-barber-id="${barber.id}" data-barbershop-slug="${barber.barbershopSlug}">
            🗑️ Excluir
          </button>
        </div>
      </div>
      <div class="card-body">
        <p><strong>Barbearia:</strong> <span style="color: #3b82f6; font-weight: 600;">${barber.barbershopName}</span></p>
        <p><strong>Telefone:</strong> ${barber.phone || "Não informado"}</p>
        <p><strong>E-mail:</strong> ${barber.email || "Não informado"}</p>
        <p><strong>Especialidades:</strong> ${barber.specialties ? barber.specialties.join(", ") : "Nenhuma"}</p>
        <p><strong>Status:</strong> <span class="status-${barber.active ? "active" : "inactive"}">${barber.active ? "Ativo" : "Inativo"}</span></p>
      </div>
    </div>
  `;
}

/**
 * Cria card de serviço
 */
function createServiceCard(service) {
  return `
    <div class="admin-card service-card" data-service-id="${service.id}" data-barbershop-slug="${service.barbershopSlug}">
      <div class="card-header">
        <h3>${service.name}</h3>
        <div class="card-actions">
          <button class="btn btn-small btn-secondary edit-service" data-service-id="${service.id}" data-barbershop-slug="${service.barbershopSlug}">
            ✏️ Editar
          </button>
          <button class="btn btn-small btn-danger delete-service" data-service-id="${service.id}" data-barbershop-slug="${service.barbershopSlug}">
            🗑️ Excluir
          </button>
        </div>
      </div>
      <div class="card-body">
        <p><strong>Barbearia:</strong> <span style="color: #3b82f6; font-weight: 600;">${service.barbershopName}</span></p>
        <p><strong>Preço:</strong> ${formatPrice(service.price)}</p>
        <p><strong>Duração:</strong> ${service.duration} minutos</p>
        <p><strong>Descrição:</strong> ${service.description || "Sem descrição"}</p>
        <p><strong>Status:</strong> <span class="status-${service.active ? "active" : "inactive"}">${service.active ? "Ativo" : "Inativo"}</span></p>
      </div>
    </div>
  `;
}

/**
 * Carrega disponibilidade de um barbeiro específico
 */
async function loadBarberAvailability(barberId) {
  const container = document.getElementById("barber-availability-content");

  try {
    // Buscar configurações de disponibilidade do barbeiro
    const availabilityRef = ref(
      database,
      `barbershops/${adminState.managedBarbershopId}/availability/${barberId}`,
    );
    const snapshot = await get(availabilityRef);
    const barberAvailability = snapshot.val() || {};

    // Buscar configurações gerais da barbearia para valores padrão
    const settingsRef = ref(
      database,
      `barbershops/${adminState.managedBarbershopId}/settings`,
    );
    const settingsSnapshot = await get(settingsRef);
    const generalSettings = settingsSnapshot.val() || {};

    container.innerHTML = `
      <div class="settings-section">
        <h3>🕐 Horários de Trabalho Individuais</h3>
        <p style="color: #64748b; margin-bottom: 20px;">Configure os horários específicos deste barbeiro. Você pode adicionar múltiplos períodos por dia.</p>

        <div class="settings-grid">
          ${Object.entries(CONSTANTS.WEEKDAYS)
            .map(([dayNum, dayName]) => {
              const dayAvailability = barberAvailability[dayNum] || [];
              return `
                <div class="weekday-setting">
                  <label style="font-weight: bold; margin-bottom: 10px; display: block;">
                    <input type="checkbox" class="weekday-toggle" data-day="${dayNum}" ${dayAvailability.length > 0 ? "checked" : ""}>
                    ${dayName}
                  </label>
                  <div class="time-periods" data-day="${dayNum}" style="display: ${dayAvailability.length > 0 ? "block" : "none"}">
                    ${
                      dayAvailability.length > 0
                        ? dayAvailability
                            .map(
                              (period, index) => `
                        <div class="time-period" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                          <input type="time" class="start-time" data-day="${dayNum}" data-index="${index}" value="${period.start || "09:00"}">
                          <span>às</span>
                          <input type="time" class="end-time" data-day="${dayNum}" data-index="${index}" value="${period.end || "18:00"}">
                          <button type="button" class="btn btn-small btn-danger remove-period" data-day="${dayNum}" data-index="${index}">❌</button>
                        </div>
                      `,
                            )
                            .join("")
                        : `<div class="time-period" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                        <input type="time" class="start-time" data-day="${dayNum}" data-index="0" value="09:00">
                        <span>às</span>
                        <input type="time" class="end-time" data-day="${dayNum}" data-index="0" value="18:00">
                        <button type="button" class="btn btn-small btn-danger remove-period" data-day="${dayNum}" data-index="0">❌</button>
                      </div>`
                    }
                    <button type="button" class="btn btn-small btn-secondary add-period" data-day="${dayNum}" style="margin-top: 8px;">➕ Adicionar Período</button>
                  </div>
                </div>
              `;
            })
            .join("")}
        </div>
      </div>

      <div class="settings-section">
        <h3>⚙️ Configurações do Barbeiro</h3>
        <div class="settings-grid">
          <div class="setting-item">
            <label for="barber-interval">Intervalo entre agendamentos (minutos):</label>
            <input type="number" id="barber-interval" min="0" max="120" value="${barberAvailability.interval || generalSettings.interval || CONSTANTS.INTERVAL}">
            <small>Ex: 20 minutos entre um cliente e outro</small>
          </div>
          <div class="setting-item">
            <label for="barber-active">
              <input type="checkbox" id="barber-active" ${barberAvailability.active !== false ? "checked" : ""}>
              Barbeiro ativo para agendamentos
            </label>
          </div>
        </div>
      </div>

      <div class="settings-actions">
        <button class="btn btn-primary" id="save-barber-availability-btn">💾 Salvar Configurações do Barbeiro</button>
      </div>
    `;

    // Configura event listeners
    setupBarberAvailabilityListeners();
  } catch (error) {
    console.error("Erro ao carregar disponibilidade do barbeiro:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar configurações do barbeiro.</p>';
  }
}

/**
 * Carrega gestão de disponibilidade/horários
 */
async function loadAvailabilityAdmin() {
  const container = document.getElementById("availability-content");

  try {
    const barbershops = await getAllBarbershops();
    const barbershopSlugs = Object.keys(barbershops);

    if (barbershopSlugs.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhuma barbearia cadastrada.</p>';
      return;
    }

    // Criar seletor de barbearias e barbeiros
    const selectorHTML = `
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="availability-barbershop-selector">Selecione a Barbearia:</label>
        <select id="availability-barbershop-selector" class="form-control" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; width: 100%;">
          ${barbershopSlugs.map((slug) => `<option value="${slug}">${barbershops[slug].name}</option>`).join("")}
        </select>
      </div>
      <div class="form-group" style="margin-bottom: 20px;">
        <label for="barber-selector">Selecione o Barbeiro:</label>
        <select id="barber-selector" class="form-control" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; width: 100%;">
          <option value="">Selecione uma barbearia primeiro...</option>
        </select>
      </div>
      <div id="barber-availability-content"></div>
    `;

    container.innerHTML = selectorHTML;

    // Função para carregar barbeiros de uma barbearia específica
    const loadBarbersForAvailability = (barbershopSlug) => {
      const barberSelect = document.getElementById("barber-selector");
      const barbershop = barbershops[barbershopSlug];
      adminState.managedBarbershopId = barbershopSlug;

      if (!barbershop) {
        barberSelect.innerHTML =
          '<option value="">Barbearia não encontrada</option>';
        document.getElementById("barber-availability-content").innerHTML = "";
        return;
      }

      const barbers = barbershop.barbers || {};
      const barberList = Object.entries(barbers)
        .filter(([_, data]) => data.active !== false)
        .map(([id, data]) => ({ id, ...data }));

      if (barberList.length === 0) {
        barberSelect.innerHTML =
          '<option value="">Nenhum barbeiro ativo nesta barbearia</option>';
        document.getElementById("barber-availability-content").innerHTML =
          '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhum barbeiro ativo cadastrado nesta barbearia. Adicione um barbeiro primeiro na seção "Barbeiros".</p>';
        return;
      }

      barberSelect.innerHTML = barberList
        .map((barber) => `<option value="${barber.id}">${barber.name}</option>`)
        .join("");

      // Carregar disponibilidade do primeiro barbeiro
      loadBarberAvailability(barberList[0].id);
    };

    // Carregar barbeiros da primeira barbearia
    loadBarbersForAvailability(barbershopSlugs[0]);

    // Event listener para mudança de barbearia
    document
      .getElementById("availability-barbershop-selector")
      .addEventListener("change", (e) => {
        loadBarbersForAvailability(e.target.value);
      });

    // Event listener para mudança de barbeiro
    document
      .getElementById("barber-selector")
      .addEventListener("change", (e) => {
        if (e.target.value) {
          loadBarberAvailability(e.target.value);
        }
      });
  } catch (error) {
    console.error("Erro ao carregar configurações:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar configurações.</p>';
  }
}

/**
 * Configura listeners para disponibilidade do barbeiro
 */
function setupBarberAvailabilityListeners() {
  // Toggle dias da semana
  document.querySelectorAll(".weekday-toggle").forEach((toggle) => {
    toggle.addEventListener("change", (e) => {
      const day = e.target.dataset.day;
      const timePeriods = e.target
        .closest(".weekday-setting")
        .querySelector(".time-periods");
      timePeriods.style.display = e.target.checked ? "block" : "none";
    });
  });

  // Adicionar período
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("add-period")) {
      const day = e.target.dataset.day;
      const timePeriods = e.target.closest(".time-periods");
      const periodCount = timePeriods.querySelectorAll(".time-period").length;

      const newPeriod = document.createElement("div");
      newPeriod.className = "time-period";
      newPeriod.style.display = "flex";
      newPeriod.style.alignItems = "center";
      newPeriod.style.gap = "10px";
      newPeriod.style.marginBottom = "8px";
      newPeriod.innerHTML = `
        <input type="time" class="start-time" data-day="${day}" data-index="${periodCount}" value="09:00">
        <span>às</span>
        <input type="time" class="end-time" data-day="${day}" data-index="${periodCount}" value="18:00">
        <button type="button" class="btn btn-small btn-danger remove-period" data-day="${day}" data-index="${periodCount}">❌</button>
      `;

      timePeriods.insertBefore(newPeriod, e.target);
    }

    // Remover período
    if (e.target.classList.contains("remove-period")) {
      const timePeriod = e.target.closest(".time-period");
      if (timePeriod) {
        timePeriod.remove();
      }
    }
  });

  // Salvar configurações do barbeiro
  const saveBtn = document.getElementById("save-barber-availability-btn");
  if (saveBtn) {
    saveBtn.addEventListener("click", saveBarberAvailabilitySettings);
  }
}

/**
 * Salva configurações de disponibilidade do barbeiro
 */
async function saveBarberAvailabilitySettings() {
  try {
    const barberId = document.getElementById("barber-selector").value;
    const availability = {};

    // Coletar períodos de cada dia
    document.querySelectorAll(".weekday-toggle").forEach((toggle) => {
      const day = toggle.dataset.day;
      if (toggle.checked) {
        const timePeriods = toggle
          .closest(".weekday-setting")
          .querySelectorAll(".time-period");
        const periods = [];

        timePeriods.forEach((period, index) => {
          const startTime = period.querySelector(".start-time").value;
          const endTime = period.querySelector(".end-time").value;

          if (startTime && endTime) {
            periods.push({
              start: startTime,
              end: endTime,
            });
          }
        });

        if (periods.length > 0) {
          availability[day] = periods;
        }
      }
    });

    // Configurações adicionais do barbeiro
    const interval =
      parseInt(document.getElementById("barber-interval").value) || 20;
    const active = document.getElementById("barber-active").checked;

    const barberSettings = {
      ...availability,
      interval,
      active,
      updatedAt: new Date().toISOString(),
    };

    // Salvar no Firebase
    const availabilityRef = ref(
      database,
      `barbershops/${adminState.managedBarbershopId}/availability/${barberId}`,
    );
    await set(availabilityRef, barberSettings);

    alert("Configurações do barbeiro salvas com sucesso!");
  } catch (error) {
    console.error("Erro ao salvar configurações do barbeiro:", error);
    alert("Erro ao salvar configurações. Tente novamente.");
  }
}

// =====================================================
// GESTÃO FINANCEIRA
// =====================================================

/**
 * Inicializa filtros da gestão financeira
 */
function setupFinancialFilters() {
  const periodSelector = document.getElementById("financial-period");
  const customDates = document.getElementById("custom-dates");
  const barbershopSelector = document.getElementById("financial-barbershop");

  // Popula seletor de barbearias
  populateFinancialBarbershopSelector();

  // Listener para mudança de período
  periodSelector?.addEventListener("change", (e) => {
    if (e.target.value === "custom") {
      customDates.style.display = "flex";
    } else {
      customDates.style.display = "none";
      loadFinancialAdmin();
    }
  });

  // Listeners para datas personalizadas
  document
    .getElementById("financial-start-date")
    ?.addEventListener("change", loadFinancialAdmin);
  document
    .getElementById("financial-end-date")
    ?.addEventListener("change", loadFinancialAdmin);

  // Listener para mudança de barbearia
  barbershopSelector?.addEventListener("change", loadFinancialAdmin);
}

/**
 * Popula seletor de barbearias no financeiro
 */
async function populateFinancialBarbershopSelector() {
  const selector = document.getElementById("financial-barbershop");
  if (!selector) return;

  const barbershops = await getAllBarbershops();
  selector.innerHTML = '<option value="">Todas as barbearias</option>';

  Object.entries(barbershops).forEach(([slug, shop]) => {
    const option = document.createElement("option");
    option.value = slug;
    option.textContent = shop.name;
    selector.appendChild(option);
  });
}

/**
 * Carrega dados financeiros
 */
async function loadFinancialAdmin() {
  const container = document.getElementById("financial-content");
  const period = document.getElementById("financial-period")?.value || "month";
  const selectedBarbershop =
    document.getElementById("financial-barbershop")?.value || "";

  if (!container) return;

  container.innerHTML =
    '<div class="loading-small"><div class="spinner-small"></div><p>Carregando dados financeiros...</p></div>';

  try {
    // Calcula período
    const { startDate, endDate } = calculatePeriod(period);

    // Busca agendamentos do período
    const appointments = await getAppointmentsByPeriod(
      startDate,
      endDate,
      selectedBarbershop,
    );

    if (appointments.length === 0) {
      container.innerHTML =
        '<p style="color: #64748b; text-align: center; padding: 40px;">Nenhum agendamento neste período.</p>';
      return;
    }

    // Calcula métricas
    const metrics = calculateFinancialMetrics(appointments);

    // Renderiza dashboard financeiro
    renderFinancialDashboard(container, metrics, startDate, endDate);
  } catch (error) {
    console.error("Erro ao carregar dados financeiros:", error);
    container.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar dados financeiros.</p>';
  }
}

/**
 * Calcula período baseado na seleção
 */
function calculatePeriod(period) {
  const today = new Date();
  let startDate, endDate;

  switch (period) {
    case "today":
      startDate = endDate = formatDate(today);
      break;

    case "week":
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      startDate = formatDate(weekStart);
      endDate = formatDate(weekEnd);
      break;

    case "month":
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      startDate = formatDate(monthStart);
      endDate = formatDate(monthEnd);
      break;

    case "custom":
      startDate =
        document.getElementById("financial-start-date")?.value ||
        formatDate(today);
      endDate =
        document.getElementById("financial-end-date")?.value ||
        formatDate(today);
      break;

    default:
      startDate = endDate = formatDate(today);
  }

  return { startDate, endDate };
}

/**
 * Busca agendamentos por período
 */
async function getAppointmentsByPeriod(
  startDate,
  endDate,
  barbershopSlug = "",
) {
  const appointments = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Busca barbearias
  const barbershops = await getAllBarbershops();
  const shopSlugs = barbershopSlug
    ? [barbershopSlug]
    : Object.keys(barbershops);

  // Itera sobre cada dia do período
  for (
    let date = new Date(start);
    date <= end;
    date.setDate(date.getDate() + 1)
  ) {
    const dateStr = formatDate(date);

    for (const slug of shopSlugs) {
      const dayAppointments = await getAppointmentsByDate(slug, dateStr);
      // Adiciona informações da barbearia
      dayAppointments.forEach((apt) => {
        apt.barbershopName = barbershops[slug]?.name || slug;
      });
      appointments.push(...dayAppointments);
    }
  }

  return appointments;
}

/**
 * Calcula métricas financeiras
 */
function calculateFinancialMetrics(appointments) {
  const metrics = {
    total: appointments.length,
    totalPrevisto: 0,
    totalConfirmado: 0,
    totalRecebido: 0,
    totalPerdido: 0,
    cancelados: 0,
    pendentes: 0,
    confirmados: 0,
    completados: 0,
    faltosos: 0,
    byBarbershop: {},
    byBarber: {},
    byService: {},
  };

  appointments.forEach((apt) => {
    const price = apt.servicePrice || 0;

    // Por status
    if (apt.status === "cancelled") {
      metrics.cancelados++;
    } else if (apt.status === "pending") {
      metrics.pendentes++;
      metrics.totalPrevisto += price;
    } else if (apt.status === "confirmed") {
      metrics.confirmados++;
      metrics.totalPrevisto += price;
      metrics.totalConfirmado += price;
    } else if (apt.status === "completed") {
      metrics.completados++;
      metrics.totalPrevisto += price;
      metrics.totalConfirmado += price;
      metrics.totalRecebido += price;
    } else if (apt.status === "no_show") {
      metrics.faltosos++;
      metrics.totalPerdido += price;
    }

    // Por barbearia
    const shopName = apt.barbershopName || "Sem barbearia";
    if (!metrics.byBarbershop[shopName]) {
      metrics.byBarbershop[shopName] = { count: 0, total: 0, received: 0 };
    }
    if (apt.status !== "cancelled" && apt.status !== "no_show") {
      metrics.byBarbershop[shopName].count++;
      metrics.byBarbershop[shopName].total += price;
      if (apt.status === "completed") {
        metrics.byBarbershop[shopName].received += price;
      }
    }

    // Por barbeiro
    const barberName = apt.barberName || "Sem barbeiro";
    if (!metrics.byBarber[barberName]) {
      metrics.byBarber[barberName] = { count: 0, total: 0, received: 0 };
    }
    if (apt.status !== "cancelled" && apt.status !== "no_show") {
      metrics.byBarber[barberName].count++;
      metrics.byBarber[barberName].total += price;
      if (apt.status === "completed") {
        metrics.byBarber[barberName].received += price;
      }
    }

    // Por serviço
    const serviceName = apt.serviceName || "Sem serviço";
    if (!metrics.byService[serviceName]) {
      metrics.byService[serviceName] = { count: 0, total: 0 };
    }
    if (apt.status !== "cancelled" && apt.status !== "no_show") {
      metrics.byService[serviceName].count++;
      metrics.byService[serviceName].total += price;
    }
  });

  return metrics;
}

/**
 * Renderiza dashboard financeiro
 */
function renderFinancialDashboard(container, metrics, startDate, endDate) {
  const formatPeriod = () => {
    if (startDate === endDate) return startDate;
    return `${startDate} até ${endDate}`;
  };

  container.innerHTML = `
    <div style="margin-bottom: 20px; padding: 15px; background: #f8fafc; border-radius: 10px;">
      <p style="margin: 0; color: #64748b; font-size: 0.9rem;">
        📊 Período: <strong>${formatPeriod()}</strong> | Total de agendamentos: <strong>${metrics.total}</strong>
      </p>
    </div>

    <!-- Cards de Resumo Financeiro -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 25px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">💰 Faturamento Previsto</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatPrice(metrics.totalPrevisto)}</div>
        <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 5px;">Todos os agendamentos</div>
      </div>

      <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">✅ Faturamento Confirmado</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatPrice(metrics.totalConfirmado)}</div>
        <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 5px;">${metrics.confirmados + metrics.completados} confirmados</div>
      </div>

      <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">💵 Recebido</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatPrice(metrics.totalRecebido)}</div>
        <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 5px;">${metrics.completados} serviços feitos</div>
      </div>

      <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">⏳ A Receber</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatPrice(metrics.totalConfirmado - metrics.totalRecebido)}</div>
        <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 5px;">${metrics.pendentes + metrics.confirmados} pendentes</div>
      </div>

      <div style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">👻 Perdido (Faltas)</div>
        <div style="font-size: 1.8rem; font-weight: bold;">${formatPrice(metrics.totalPerdido)}</div>
        <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 5px;">${metrics.faltosos} clientes faltaram</div>
      </div>
    </div>

    <!-- Faturamento por Barbearia -->
    ${
      Object.keys(metrics.byBarbershop).length > 1
        ? `
    <div style="margin-bottom: 25px;">
      <h3 style="margin-bottom: 15px; color: #1e293b;">🏪 Faturamento por Barbearia</h3>
      <div style="display: grid; gap: 12px;">
        ${Object.entries(metrics.byBarbershop)
          .sort((a, b) => b[1].total - a[1].total)
          .map(
            ([name, data]) => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 3px;">${name}</div>
                <div style="font-size: 0.85rem; color: #64748b;">${data.count} agendamentos</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.3rem; font-weight: bold; color: #10b981;">${formatPrice(data.received)}</div>
                <div style="font-size: 0.75rem; color: #64748b;">de ${formatPrice(data.total)} previsto</div>
              </div>
            </div>
          `,
          )
          .join("")}
      </div>
    </div>
    `
        : ""
    }

    <!-- Faturamento por Barbeiro -->
    <div style="margin-bottom: 25px;">
      <h3 style="margin-bottom: 15px; color: #f59e0b;">👨‍💼 Faturamento por Barbeiro</h3>
      <div style="display: grid; gap: 12px;">
        ${Object.entries(metrics.byBarber)
          .sort((a, b) => b[1].total - a[1].total)
          .map(
            ([name, data]) => `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center;">
              <div>
                <div style="font-weight: 600; color: #1e293b; margin-bottom: 3px;">${name}</div>
                <div style="font-size: 0.85rem; color: #64748b;">${data.count} atendimentos</div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 1.3rem; font-weight: bold; color: #10b981;">${formatPrice(data.received)}</div>
                <div style="font-size: 0.75rem; color: #64748b;">de ${formatPrice(data.total)} previsto</div>
              </div>
            </div>
          `,
          )
          .join("")}
      </div>
    </div>

    <!-- Faturamento por Serviço -->
    <div style="margin-bottom: 25px;">
      <h3 style="margin-bottom: 15px; color: #f59e0b;">✂️ Faturamento por Serviço</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px;">
        ${Object.entries(metrics.byService)
          .sort((a, b) => b[1].total - a[1].total)
          .map(
            ([name, data]) => `
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); color: white; padding: 15px; border-radius: 10px; box-shadow: 0 3px 5px rgba(0,0,0,0.1);">
              <div style="font-size: 0.85rem; opacity: 0.9; margin-bottom: 5px;">${name}</div>
              <div style="font-size: 1.4rem; font-weight: bold;">${formatPrice(data.total)}</div>
              <div style="font-size: 0.75rem; opacity: 0.8; margin-top: 3px;">${data.count} atendimentos</div>
            </div>
          `,
          )
          .join("")}
      </div>
    </div>
  `;
}

// =====================================================
// BARBEIROS
// =====================================================

/**
 * Mostra modal para adicionar/editar barbeiro
 */
async function showBarberModal(barberId = null) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");

  const isEditing = barberId !== null;
  let barberData = null;

  // Buscar todas as barbearias
  const barbershops = await getAllBarbershops();

  if (isEditing) {
    // Carregar dados do barbeiro existente
    get(
      ref(
        database,
        `barbershops/${adminState.managedBarbershopId}/barbers/${barberId}`,
      ),
    ).then((snapshot) => {
      if (snapshot.exists()) {
        barberData = snapshot.val();
        renderBarberModal(isEditing, barberData, barberId, barbershops);
      }
    });
  } else {
    renderBarberModal(isEditing, barberData, barberId, barbershops);
  }

  modal.style.display = "block";
}

/**
 * Renderiza modal do barbeiro
 */
function renderBarberModal(isEditing, barberData, barberId, barbershops) {
  const modalBody = document.getElementById("modal-body");
  const barbershopsList = Object.entries(barbershops);

  modalBody.innerHTML = `
    <h2>${isEditing ? "Editar Barbeiro" : "Novo Barbeiro"}</h2>
    <form id="barber-form" class="admin-form">
      <div class="form-group">
        <label for="barber-barbershop">Barbearia *</label>
        <select id="barber-barbershop" required style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; width: 100%;">
          <option value="">Selecione a barbearia...</option>
          ${barbershopsList
            .map(
              ([slug, shop]) => `
            <option value="${slug}" ${adminState.managedBarbershopId === slug ? "selected" : ""}>
              ${shop.name}
            </option>
          `,
            )
            .join("")}
        </select>
      </div>

      <div class="form-group">
        <label for="barber-name">Nome *</label>
        <input type="text" id="barber-name" required value="${barberData?.name || ""}">
      </div>

      <div class="form-group">
        <label for="barber-phone">Telefone</label>
        <input type="tel" id="barber-phone" value="${barberData?.phone || ""}">
      </div>

      <div class="form-group">
        <label for="barber-email">E-mail</label>
        <input type="email" id="barber-email" value="${barberData?.email || ""}">
      </div>

      <div class="form-group">
        <label for="barber-specialties">Especialidades (separadas por vírgula)</label>
        <input type="text" id="barber-specialties" value="${barberData?.specialties ? barberData.specialties.join(", ") : ""}" placeholder="Ex: Corte, Barba, Bigode">
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="barber-active" ${barberData?.active !== false ? "checked" : ""}>
          Barbeiro ativo
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          ${isEditing ? "💾 Salvar Alterações" : "➕ Adicionar Barbeiro"}
        </button>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">
          Cancelar
        </button>
      </div>
    </form>
  `;

  // Configura submit do formulário
  document
    .getElementById("barber-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveBarber(isEditing, barberId);
    });
}

/**
 * Salva barbeiro
 */
async function saveBarber(isEditing, barberId) {
  console.log("Salvando barbeiro...", { isEditing, barberId });
  try {
    const barbershopSlug = document
      .getElementById("barber-barbershop")
      .value.trim();
    const name = document.getElementById("barber-name").value.trim();
    const phone = document.getElementById("barber-phone").value.trim();
    const email = document.getElementById("barber-email").value.trim();
    const specialtiesText = document
      .getElementById("barber-specialties")
      .value.trim();
    const active = document.getElementById("barber-active").checked;

    if (!barbershopSlug) {
      alert("Selecione uma barbearia!");
      return;
    }

    if (!name) {
      alert("Nome do barbeiro é obrigatório!");
      return;
    }

    const specialties = specialtiesText
      ? specialtiesText
          .split(",")
          .map((s) => s.trim())
          .filter((s) => s)
      : [];

    const barberData = {
      name,
      phone,
      email,
      specialties,
      active,
      updatedAt: new Date().toISOString(),
    };

    if (!isEditing) {
      barberData.createdAt = new Date().toISOString();
    }

    const path = `barbershops/${barbershopSlug}/barbers/${isEditing ? barberId : generateSlug(name)}`;
    await set(ref(database, path), barberData);

    document.getElementById("modal").style.display = "none";
    loadBarbersAdmin();
    alert(`Barbeiro ${isEditing ? "atualizado" : "adicionado"} com sucesso!`);
  } catch (error) {
    console.error("Erro ao salvar barbeiro:", error);
    alert("Erro ao salvar barbeiro. Tente novamente.");
  }
}

/**
 * Mostra modal para adicionar/editar serviço
 */
function showServiceModal(serviceId = null) {
  const modal = document.getElementById("modal");
  const modalBody = document.getElementById("modal-body");

  const isEditing = serviceId !== null;
  let serviceData = null;

  if (isEditing) {
    // Carregar dados do serviço existente
    get(
      ref(
        database,
        `barbershops/${adminState.managedBarbershopId}/services/${serviceId}`,
      ),
    ).then((snapshot) => {
      if (snapshot.exists()) {
        serviceData = snapshot.val();
        serviceData.barbershopSlug = adminState.managedBarbershopId; // Adicionar a barbearia
        renderServiceModal(isEditing, serviceData, serviceId);
      }
    });
  } else {
    renderServiceModal(isEditing, serviceData, serviceId);
  }

  modal.style.display = "block";
}

/**
 * Renderiza modal do serviço
 */
async function renderServiceModal(isEditing, serviceData, serviceId) {
  const modalBody = document.getElementById("modal-body");

  // Carregar barbearias para o seletor
  const barbershops = await getAllBarbershops();
  const barbershopOptions = Object.entries(barbershops)
    .map(
      ([slug, data]) =>
        `<option value="${slug}" ${serviceData?.barbershopSlug === slug ? "selected" : adminState.managedBarbershopId === slug && !isEditing ? "selected" : ""}>${data.name}</option>`,
    )
    .join("");

  modalBody.innerHTML = `
    <h2>${isEditing ? "Editar Serviço" : "Novo Serviço"}</h2>
    <form id="service-form" class="admin-form">
      <div class="form-group">
        <label for="service-barbershop">Barbearia *</label>
        <select id="service-barbershop" required>
          <option value="">Selecione uma barbearia</option>
          ${barbershopOptions}
        </select>
      </div>

      <div class="form-group">
        <label for="service-name">Nome do Serviço *</label>
        <input type="text" id="service-name" required value="${serviceData?.name || ""}">
      </div>

      <div class="form-group">
        <label for="service-price">Preço (R$) *</label>
        <input type="number" id="service-price" min="0" step="0.01" required value="${serviceData ? (serviceData.price / 100).toFixed(2) : ""}" placeholder="Ex: 25.00">
        <small>Ex: 25.00 = R$ 25,00</small>
      </div>

      <div class="form-group">
        <label for="service-duration">Duração (minutos) *</label>
        <input type="number" id="service-duration" min="15" max="480" required value="${serviceData?.duration || 30}">
      </div>

      <div class="form-group">
        <label for="service-description">Descrição</label>
        <textarea id="service-description" rows="3" placeholder="Descrição do serviço">${serviceData?.description || ""}</textarea>
      </div>

      <div class="form-group">
        <label>
          <input type="checkbox" id="service-active" ${serviceData?.active !== false ? "checked" : ""}>
          Serviço ativo
        </label>
      </div>

      <div class="form-actions">
        <button type="submit" class="btn btn-primary">
          ${isEditing ? "💾 Salvar Alterações" : "➕ Adicionar Serviço"}
        </button>
        <button type="button" class="btn btn-secondary" onclick="document.getElementById('modal').style.display='none'">
          Cancelar
        </button>
      </div>
    </form>
  `;

  // Configura submit do formulário
  document
    .getElementById("service-form")
    .addEventListener("submit", async (e) => {
      e.preventDefault();
      await saveService(isEditing, serviceId);
    });
}

/**
 * Salva serviço
 */
async function saveService(isEditing, serviceId) {
  console.log("Salvando serviço...", { isEditing, serviceId });
  try {
    const barbershopSlug = document.getElementById("service-barbershop").value;
    const name = document.getElementById("service-name").value.trim();
    const priceInput = parseFloat(
      document.getElementById("service-price").value,
    );
    const price = Math.round(priceInput * 100); // Converter para centavos
    const duration = parseInt(
      document.getElementById("service-duration").value,
    );
    const description = document
      .getElementById("service-description")
      .value.trim();
    const active = document.getElementById("service-active").checked;

    if (!barbershopSlug || !name || isNaN(price) || !duration) {
      alert("Barbearia, nome, preço e duração são obrigatórios!");
      return;
    }

    const serviceData = {
      name,
      price,
      duration,
      description,
      active,
      updatedAt: new Date().toISOString(),
    };

    if (!isEditing) {
      serviceData.createdAt = new Date().toISOString();
    }

    const path = `barbershops/${barbershopSlug}/services/${isEditing ? serviceId : generateSlug(name)}`;
    await set(ref(database, path), serviceData);

    document.getElementById("modal").style.display = "none";
    loadServicesAdmin();
    alert(`Serviço ${isEditing ? "atualizado" : "adicionado"} com sucesso!`);
  } catch (error) {
    console.error("Erro ao salvar serviço:", error);
    alert("Erro ao salvar serviço. Tente novamente.");
  }
}

/**
 * Configura event listeners para ações dos cards
 */
function setupCardActions() {
  // Fechar modal
  document.querySelector(".modal-close")?.addEventListener("click", () => {
    document.getElementById("modal").style.display = "none";
  });

  // Fechar modal clicando fora
  window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal");
    if (e.target === modal) {
      modal.style.display = "none";
    }
  });

  // Ações de barbeiros e serviços
  document.addEventListener("click", async (e) => {
    if (e.target.classList.contains("edit-barber")) {
      const barberId = e.target.dataset.barberId;
      const barbershopSlug = e.target.dataset.barbershopSlug;
      adminState.managedBarbershopId = barbershopSlug;
      showBarberModal(barberId);
    } else if (e.target.classList.contains("delete-barber")) {
      const barberId = e.target.dataset.barberId;
      const barbershopSlug = e.target.dataset.barbershopSlug;
      if (confirm("Tem certeza que deseja excluir este barbeiro?")) {
        try {
          await remove(
            ref(database, `barbershops/${barbershopSlug}/barbers/${barberId}`),
          );
          loadBarbersAdmin();
          alert("Barbeiro excluído com sucesso!");
        } catch (error) {
          console.error("Erro ao excluir barbeiro:", error);
          alert("Erro ao excluir barbeiro. Tente novamente.");
        }
      }
    } else if (e.target.classList.contains("edit-service")) {
      const serviceId = e.target.dataset.serviceId;
      const barbershopSlug = e.target.dataset.barbershopSlug;
      adminState.managedBarbershopId = barbershopSlug;
      showServiceModal(serviceId);
    } else if (e.target.classList.contains("delete-service")) {
      const serviceId = e.target.dataset.serviceId;
      const barbershopSlug = e.target.dataset.barbershopSlug;
      if (confirm("Tem certeza que deseja excluir este serviço?")) {
        try {
          await remove(
            ref(
              database,
              `barbershops/${barbershopSlug}/services/${serviceId}`,
            ),
          );
          loadServicesAdmin();
          alert("Serviço excluído com sucesso!");
        } catch (error) {
          console.error("Erro ao excluir serviço:", error);
          alert("Erro ao excluir serviço. Tente novamente.");
        }
      }
    }
  });
}
