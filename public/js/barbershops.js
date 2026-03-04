/**
 * Módulo de Barbearias
 * Gerencia a listagem e exibição de barbearias
 */

import { database, formatPrice } from "./firebase.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/**
 * Carrega e exibe todas as barbearias ativas
 */
export async function loadBarbershops() {
  const loadingEl = document.getElementById("loading");
  const containerEl = document.getElementById("barbershops-container");
  const noDataEl = document.getElementById("no-barbershops");

  try {
    const barbershops = await getAllBarbershops();

    // Filtra apenas barbearias ativas (exibe tudo que não foi explicitamente desativado)
    const activeBarbershops = Object.entries(barbershops)
      .filter(([_, data]) => data.active !== false)
      .map(([id, data]) => ({ id, ...data }));

    loadingEl.style.display = "none";

    if (activeBarbershops.length === 0) {
      noDataEl.style.display = "block";
      return;
    }

    // Renderiza cada barbearia
    containerEl.innerHTML = activeBarbershops
      .map((barbershop) => createBarbershopCard(barbershop))
      .join("");

    // Adiciona event listeners
    activeBarbershops.forEach((barbershop) => {
      const card = document.getElementById(`barbershop-${barbershop.id}`);
      card.addEventListener("click", () => {
        window.location.href = `shop.html?slug=${barbershop.id}`;
      });
    });
  } catch (error) {
    console.error("Erro ao carregar barbearias:", error);
    loadingEl.innerHTML =
      '<p style="color: #ef4444;">Erro ao carregar barbearias. Tente novamente.</p>';
  }
}

/**
 * Busca todas as barbearias do banco de dados
 * @returns {Promise<Object>}
 */
export async function getAllBarbershops() {
  const barbershopsRef = ref(database, "barbershops");
  const snapshot = await get(barbershopsRef);

  if (snapshot.exists()) {
    return snapshot.val();
  }
  return {};
}

/**
 * Busca uma barbearia específica por slug
 * @param {string} slug
 * @returns {Promise<Object|null>}
 */
export async function getBarbershop(slug) {
  const barbershopRef = ref(database, `barbershops/${slug}`);
  const snapshot = await get(barbershopRef);

  if (snapshot.exists()) {
    return { id: slug, ...snapshot.val() };
  }
  return null;
}

/**
 * Busca os serviços ativos de uma barbearia
 * @param {string} slug
 * @returns {Promise<Array>}
 */
export async function getBarbershopServices(slug) {
  const servicesRef = ref(database, `barbershops/${slug}/services`);
  const snapshot = await get(servicesRef);

  if (snapshot.exists()) {
    const services = snapshot.val();
    return Object.entries(services)
      .filter(([_, service]) => service.active === true)
      .map(([id, service]) => ({ id, ...service }));
  }
  return [];
}

/**
 * Busca os barbeiros ativos de uma barbearia
 * @param {string} slug
 * @returns {Promise<Array>}
 */
export async function getBarbershopBarbers(slug) {
  const barbersRef = ref(database, `barbershops/${slug}/barbers`);
  const snapshot = await get(barbersRef);

  if (snapshot.exists()) {
    const barbers = snapshot.val();
    return Object.entries(barbers)
      .filter(([_, barber]) => barber.active === true)
      .map(([id, barber]) => ({ id, ...barber }));
  }
  return [];
}

/**
 * Busca a disponibilidade de um barbeiro em um dia específico
 * @param {string} slug
 * @param {string} barberId
 * @param {number} dayOfWeek (0-6)
 * @returns {Promise<{periods: Array, interval: number}|null>}
 */
export async function getBarberAvailability(slug, barberId, dayOfWeek) {
  const availabilityRef = ref(
    database,
    `barbershops/${slug}/availability/${barberId}`,
  );
  const snapshot = await get(availabilityRef);

  if (snapshot.exists()) {
    const barberAvailability = snapshot.val();
    const periods = barberAvailability[dayOfWeek] || null;
    const interval = barberAvailability.interval || 20; // Default 20 minutos

    // Retorna objeto com períodos e intervalo
    return {
      periods,
      interval,
    };
  }
  return null;
}

/**
 * Cria o HTML de um card de barbearia
 * @param {Object} barbershop
 * @returns {string}
 */
function createBarbershopCard(barbershop) {
  const servicesCount = barbershop.services
    ? Object.keys(barbershop.services).length
    : 0;

  const barbersCount = barbershop.barbers
    ? Object.keys(barbershop.barbers).length
    : 0;

  return `
        <div class="barbershop-card" id="barbershop-${barbershop.id}">
            <h3>${barbershop.name}</h3>
            <div class="barbershop-info">
                <span>✂️ ${servicesCount} serviço${servicesCount !== 1 ? "s" : ""}</span>
                <span>👨‍💼 ${barbersCount} barbeiro${barbersCount !== 1 ? "s" : ""}</span>
                <span>⏱️ Duração: ${barbershop.serviceDuration || 30} minutos</span>
                <span>📍 Clique para agendar</span>
            </div>
        </div>
    `;
}
