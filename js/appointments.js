/**
 * Módulo de Agendamentos
 * Gerencia todo o fluxo de agendamento de horários
 */

import {
  database,
  CONSTANTS,
  minutesToTime,
  timeToMinutes,
  formatDate,
  formatPrice,
} from "./firebase.js";
import {
  getBarbershop,
  getBarbershopServices,
  getBarbershopBarbers,
  getBarberAvailability,
} from "./barbershops.js";
import {
  ref,
  get,
  set,
  push,
  runTransaction,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Estado da página de agendamento
let state = {
  slug: null,
  barbershop: null,
  selectedServices: [], // Alterado para array
  selectedDate: null,
  selectedBarber: null,
  selectedSlot: null,
};

/**
 * Inicializa a página de agendamento
 */
export async function initShopPage() {
  // Obtém o slug da URL
  const urlParams = new URLSearchParams(window.location.search);
  state.slug = urlParams.get("slug");

  if (!state.slug) {
    alert("Barbearia não especificada");
    window.location.href = "index.html";
    return;
  }

  // Carrega dados da barbearia
  await loadBarbershopData();

  // Configura event listeners
  setupEventListeners();
}

/**
 * Carrega todos os dados da barbearia
 */
async function loadBarbershopData() {
  const loadingEl = document.getElementById("loading");
  const containerEl = document.getElementById("booking-container");

  try {
    // Busca dados da barbearia
    state.barbershop = await getBarbershop(state.slug);

    if (!state.barbershop || !state.barbershop.active) {
      alert("Barbearia não encontrada ou inativa");
      window.location.href = "index.html";
      return;
    }

    // Atualiza o nome da barbearia
    document.getElementById("shop-name").textContent = state.barbershop.name;

    // Carrega serviços
    const services = await getBarbershopServices(state.slug);
    renderServices(services);

    // Carrega barbeiros
    const barbers = await getBarbershopBarbers(state.slug);
    renderBarbers(barbers);

    // Configura data mínima (hoje)
    const today = new Date();
    document.getElementById("date-picker").min = formatDate(today);

    loadingEl.style.display = "none";
    containerEl.style.display = "block";
  } catch (error) {
    console.error("Erro ao carregar dados:", error);
    alert("Erro ao carregar dados da barbearia");
    window.location.href = "index.html";
  }
}

/**
 * Renderiza a lista de serviços
 */
function renderServices(services) {
  const container = document.getElementById("services-list");

  if (services.length === 0) {
    container.innerHTML =
      '<p style="color: #64748b;">Nenhum serviço disponível.</p>';
    return;
  }

  container.innerHTML = `
    <div class="services-grid">
      ${services
        .map(
          (service) => `
            <div class="service-item ${state.selectedServices.some((s) => s.id === service.id) ? "selected" : ""}" data-service-id="${service.id}">
                <span class="service-name">${service.name}</span>
                <span class="service-price">${formatPrice(service.price)}</span>
            </div>
        `,
        )
        .join("")}
    </div>
    <div class="selected-services" id="selected-services" style="display: ${state.selectedServices.length > 0 ? "block" : "none"}">
      <h3>Serviços Selecionados:</h3>
      <div id="selected-services-list"></div>
      <div class="total-price">
        <strong>Total: <span id="total-price">${formatPrice(0)}</span></strong>
      </div>
    </div>
  `;

  // Event listeners
  services.forEach((service) => {
    const el = container.querySelector(`[data-service-id="${service.id}"]`);
    el.addEventListener("click", () => selectService(service));
  });

  updateSelectedServicesDisplay();
}

/**
 * Renderiza a lista de barbeiros
 */
function renderBarbers(barbers) {
  const container = document.getElementById("barbers-list");

  if (barbers.length === 0) {
    container.innerHTML =
      '<p style="color: #64748b;">Nenhum barbeiro disponível.</p>';
    return;
  }

  container.innerHTML = barbers
    .map(
      (barber) => `
        <div class="barber-item" data-barber-id="${barber.id}">
            👨‍💼 ${barber.name}
        </div>
    `,
    )
    .join("");

  // Event listeners
  barbers.forEach((barber) => {
    const el = container.querySelector(`[data-barber-id="${barber.id}"]`);
    el.addEventListener("click", () => selectBarber(barber));
  });
}

/**
 * Configura os event listeners da página
 */
function setupEventListeners() {
  // Seleção de data
  document.getElementById("date-picker").addEventListener("change", (e) => {
    selectDate(e.target.value);
  });

  // Submit do formulário
  document
    .getElementById("booking-form")
    .addEventListener("submit", handleBookingSubmit);
}

/**
 * Seleciona/desseleciona um serviço (seleção múltipla)
 */
function selectService(service) {
  const existingIndex = state.selectedServices.findIndex(
    (s) => s.id === service.id,
  );

  if (existingIndex > -1) {
    // Remove o serviço se já estiver selecionado
    state.selectedServices.splice(existingIndex, 1);
  } else {
    // Adiciona o serviço se não estiver selecionado
    state.selectedServices.push(service);
  }

  // Atualiza UI
  const serviceEl = document.querySelector(`[data-service-id="${service.id}"]`);
  serviceEl.classList.toggle("selected");

  updateSelectedServicesDisplay();
  checkFormValidity();
}

/**
 * Atualiza a exibição dos serviços selecionados
 */
function updateSelectedServicesDisplay() {
  const selectedServicesEl = document.getElementById("selected-services");
  const selectedServicesListEl = document.getElementById(
    "selected-services-list",
  );
  const totalPriceEl = document.getElementById("total-price");

  if (state.selectedServices.length === 0) {
    selectedServicesEl.style.display = "none";
    return;
  }

  selectedServicesEl.style.display = "block";

  selectedServicesListEl.innerHTML = state.selectedServices
    .map(
      (service) => `
      <div class="selected-service-item">
        <span>${service.name}</span>
        <span>${formatPrice(service.price)}</span>
        <button type="button" class="remove-service" data-service-id="${service.id}">×</button>
      </div>
    `,
    )
    .join("");

  const totalPrice = state.selectedServices.reduce(
    (total, service) => total + service.price,
    0,
  );
  totalPriceEl.textContent = formatPrice(totalPrice);

  // Event listeners para remover serviços
  state.selectedServices.forEach((service) => {
    const removeBtn = selectedServicesListEl.querySelector(
      `[data-service-id="${service.id}"]`,
    );
    removeBtn.addEventListener("click", () => selectService(service));
  });
}

/**
 * Seleciona uma data
 */
function selectDate(dateStr) {
  state.selectedDate = dateStr;

  // Limpa seleção anterior
  state.selectedBarber = null;
  state.selectedSlot = null;
  document.getElementById("slots-list").innerHTML = "";

  checkFormValidity();
}

/**
 * Seleciona um barbeiro
 */
async function selectBarber(barber) {
  if (!state.selectedDate) {
    alert("Selecione uma data primeiro");
    return;
  }

  state.selectedBarber = barber;

  // Atualiza UI
  document.querySelectorAll(".barber-item").forEach((el) => {
    el.classList.remove("selected");
  });
  document
    .querySelector(`[data-barber-id="${barber.id}"]`)
    .classList.add("selected");

  // Carrega horários disponíveis
  await loadAvailableSlots();

  checkFormValidity();
}

/**
 * Carrega e exibe os horários disponíveis
 */
async function loadAvailableSlots() {
  const slotsContainer = document.getElementById("slots-list");
  const loadingEl = document.getElementById("slots-loading");

  slotsContainer.innerHTML = "";
  loadingEl.style.display = "block";

  try {
    // Obtém o dia da semana da data selecionada
    const date = new Date(state.selectedDate + "T00:00:00");
    const dayOfWeek = date.getDay();

    // Busca disponibilidade do barbeiro
    const availabilityData = await getBarberAvailability(
      state.slug,
      state.selectedBarber.id,
      dayOfWeek,
    );

    // Extrai períodos e intervalo da estrutura retornada
    const periods = availabilityData?.periods || availabilityData || [];
    const barberInterval = availabilityData?.interval || 20;

    if (!periods || periods.length === 0) {
      loadingEl.style.display = "none";
      slotsContainer.innerHTML =
        '<p style="color: #64748b;">Barbeiro não trabalha neste dia.</p>';
      return;
    }

    // Calcula duração total dos serviços selecionados
    const serviceDuration =
      state.selectedServices.reduce(
        (total, service) => total + (service.duration || 30),
        0,
      ) || 30;

    // Busca agendamentos existentes
    const existingAppointments = await getExistingAppointments(
      state.slug,
      state.selectedDate,
      state.selectedBarber.id,
    );

    // Gera slots disponíveis para todos os períodos
    let allSlots = [];
    periods.forEach((period) => {
      const slots = generateSlots(
        timeToMinutes(period.start),
        timeToMinutes(period.end),
        existingAppointments,
        serviceDuration,
        barberInterval,
      );
      allSlots = allSlots.concat(slots);
    });

    // Remove duplicatas e ordena
    allSlots = [...new Set(allSlots)].sort((a, b) => a - b);

    loadingEl.style.display = "none";

    if (allSlots.length === 0) {
      slotsContainer.innerHTML =
        '<p style="color: #64748b;">Nenhum horário disponível.</p>';
      return;
    }

    // Renderiza slots
    slotsContainer.innerHTML = allSlots
      .map(
        (slot) => `
            <div class="slot-item" data-slot="${slot}">
                ${minutesToTime(slot)}
            </div>
        `,
      )
      .join("");

    // Event listeners
    allSlots.forEach((slot) => {
      const el = slotsContainer.querySelector(`[data-slot="${slot}"]`);
      el.addEventListener("click", () => selectSlot(slot));
    });
  } catch (error) {
    console.error("Erro ao carregar horários:", error);
    loadingEl.style.display = "none";
    slotsContainer.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar horários.</p>';
  }
}

/**
 * Gera slots de horários disponíveis
 * @param {number} startMin - Início em minutos
 * @param {number} endMin - Fim em minutos
 * @param {Array} existingAppointments - Agendamentos existentes
 * @param {number} serviceDuration - Duração do serviço em minutos
 * @param {number} interval - Intervalo entre atendimentos em minutos
 * @returns {Array<number>} Lista de slots disponíveis
 */
export function generateSlots(
  startMin,
  endMin,
  existingAppointments = [],
  serviceDuration = 30,
  interval = 20,
) {
  const slots = [];
  const totalBlock = serviceDuration + interval;

  // Converte agendamentos existentes para array de minutos ocupados
  const occupiedSlots = existingAppointments.map((apt) => ({
    startMin: apt.startMin,
    endMin: apt.endMin || apt.startMin + serviceDuration,
  }));

  // Gera slots em intervalos de totalBlock minutos
  for (
    let time = startMin;
    time + serviceDuration <= endMin;
    time += totalBlock
  ) {
    // Verifica se há conflito com agendamentos existentes
    const hasConflict = occupiedSlots.some((occupied) => {
      // Verifica se há sobreposição
      const newEnd = time + serviceDuration;
      return (
        (time >= occupied.startMin && time < occupied.endMin) ||
        (newEnd > occupied.startMin && newEnd <= occupied.endMin) ||
        (time <= occupied.startMin && newEnd >= occupied.endMin)
      );
    });

    if (!hasConflict) {
      slots.push(time);
    }
  }

  return slots;
}

/**
 * Busca agendamentos existentes para uma data e barbeiro
 */
async function getExistingAppointments(slug, date, barberId) {
  const appointmentsRef = ref(
    database,
    `appointments/${slug}/${date}/${barberId}`,
  );
  const snapshot = await get(appointmentsRef);

  if (snapshot.exists()) {
    const appointments = snapshot.val();
    return Object.entries(appointments)
      .filter(([_, apt]) => apt.status !== CONSTANTS.STATUS.CANCELLED)
      .map(([startMin, apt]) => ({
        startMin: parseInt(startMin),
        ...apt,
      }));
  }
  return [];
}

/**
 * Seleciona um horário
 */
function selectSlot(slot) {
  state.selectedSlot = slot;

  // Atualiza UI
  document.querySelectorAll(".slot-item").forEach((el) => {
    el.classList.remove("selected");
  });
  document.querySelector(`[data-slot="${slot}"]`).classList.add("selected");

  checkFormValidity();
}

/**
 * Verifica se o formulário está válido
 */
function checkFormValidity() {
  const submitBtn = document.getElementById("submit-btn");
  const isValid =
    state.selectedServices.length > 0 &&
    state.selectedDate &&
    state.selectedBarber &&
    state.selectedSlot !== null;

  submitBtn.disabled = !isValid;
}

/**
 * Processa o envio do formulário de agendamento
 */
async function handleBookingSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Agendando...";

  try {
    // Coleta dados do formulário
    const clientName = document.getElementById("client-name").value.trim();
    const clientPhone = document.getElementById("client-phone").value.trim();

    // Calcula o tempo total necessário
    const totalDuration = state.selectedServices.reduce(
      (total, service) => total + CONSTANTS.SERVICE_DURATION,
      0,
    );
    const endTime = state.selectedSlot + totalDuration;

    // Verifica se há tempo suficiente até o fim do expediente
    const date = new Date(state.selectedDate + "T00:00:00");
    const dayOfWeek = date.getDay();
    const availability = await getBarberAvailability(
      state.slug,
      state.selectedBarber.id,
      dayOfWeek,
    );

    // Verifica se o horário cabe em algum período disponível
    const slotStart = state.selectedSlot;
    let isValidSlot = false;

    if (availability && availability.length > 0) {
      for (const period of availability) {
        const periodStart = timeToMinutes(period.start);
        const periodEnd = timeToMinutes(period.end);

        if (slotStart >= periodStart && endTime <= periodEnd) {
          isValidSlot = true;
          break;
        }
      }
    }

    if (!isValidSlot) {
      alert(
        "Os serviços selecionados não cabem no horário disponível. Tente escolher menos serviços ou um horário diferente.",
      );
      submitBtn.disabled = false;
      submitBtn.textContent = "Confirmar Agendamento";
      return;
    }

    // Cria agendamentos para cada serviço
    let currentSlot = state.selectedSlot;
    const appointments = [];

    for (const service of state.selectedServices) {
      const appointment = {
        barbershopId: state.slug,
        barbershopName: state.barbershop.name,
        serviceId: service.id,
        serviceName: service.name,
        servicePrice: service.price,
        barberId: state.selectedBarber.id,
        barberName: state.selectedBarber.name,
        date: state.selectedDate,
        startMin: currentSlot,
        endMin: currentSlot + CONSTANTS.SERVICE_DURATION,
        clientName,
        clientPhone,
        status: CONSTANTS.STATUS.PENDING,
        createdAt: Date.now(),
      };

      // Salva no Firebase usando transação para evitar conflitos
      const appointmentPath = `appointments/${state.slug}/${state.selectedDate}/${state.selectedBarber.id}/${currentSlot}`;
      const appointmentRef = ref(database, appointmentPath);

      const transactionResult = await runTransaction(
        appointmentRef,
        (currentData) => {
          // Se já existe agendamento, aborta a transação
          if (currentData !== null) {
            return; // Retorna undefined para abortar
          }
          // Slot disponível, cria o agendamento
          return appointment;
        },
      );

      // Verifica se a transação foi bem-sucedida
      if (!transactionResult.committed) {
        throw new Error(
          `Horário ${minutesToTime(currentSlot)} não está mais disponível. Por favor, escolha outro horário.`,
        );
      }

      appointments.push(appointment);
      currentSlot += CONSTANTS.SERVICE_DURATION;
    }

    // Agendamento salvo com sucesso
    // Salva dados do agendamento para exibir na página de confirmação
    const appointmentData = {
      barbershopName: state.barbershop.name,
      services: state.selectedServices.map((s) => s.name).join(" + "),
      barberName: state.selectedBarber.name,
      date: new Date(state.selectedDate + "T00:00:00").toLocaleDateString(
        "pt-BR",
      ),
      time: minutesToTime(state.selectedSlot),
      duration: `${state.selectedServices.length * 30} minutos`,
      totalPrice: formatPrice(
        state.selectedServices.reduce((total, s) => total + s.price, 0),
      ),
      clientName: clientName,
      clientPhone: clientPhone,
    };

    sessionStorage.setItem("lastAppointment", JSON.stringify(appointmentData));

    // Redireciona para a página de confirmação
    window.location.href = "confirmacao.html";
  } catch (error) {
    console.error("Erro ao criar agendamento:", error);
    alert("Erro ao criar agendamento. Tente novamente.");
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmar Agendamento";
  }
}
