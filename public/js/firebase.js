/**
 * Configuração do Firebase
 * Firebase v9 Modular SDK
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDw28CcW-k1IZydJnNaO7APRjsUgGreZxM",
  authDomain: "barbearia-agenda-7b0da.firebaseapp.com",
  databaseURL: "https://barbearia-agenda-7b0da-default-rtdb.firebaseio.com",
  projectId: "barbearia-agenda-7b0da",
  storageBucket: "barbearia-agenda-7b0da.firebasestorage.app",
  messagingSenderId: "121528650976",
  appId: "1:121528650976:web:b83c16c0846c7ad32ed485",
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);

// Exporta instâncias
export const auth = getAuth(app);
export const database = getDatabase(app);

// Constantes do sistema
export const CONSTANTS = {
  SERVICE_DURATION: 30, // duração do serviço em minutos
  INTERVAL: 20, // intervalo entre atendimentos em minutos
  TOTAL_BLOCK: 50, // total bloqueado (30 + 20)

  // Dias da semana
  WEEKDAYS: {
    0: "Domingo",
    1: "Segunda-feira",
    2: "Terça-feira",
    3: "Quarta-feira",
    4: "Quinta-feira",
    5: "Sexta-feira",
    6: "Sábado",
  },

  // Status de agendamento
  STATUS: {
    PENDING: "pending",
    CONFIRMED: "confirmed",
    CANCELLED: "cancelled",
    COMPLETED: "completed", // Serviço realizado e pago
    NO_SHOW: "no_show", // Cliente não compareceu
  },
};

/**
 * Converte minutos em horário formatado
 * @param {number} minutes - Minutos desde a meia-noite
 * @returns {string} Horário formatado (HH:MM)
 */
export function minutesToTime(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

/**
 * Converte horário em minutos
 * @param {string} time - Horário formatado (HH:MM)
 * @returns {number} Minutos desde a meia-noite
 */
export function timeToMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * Formata data para YYYY-MM-DD
 * @param {Date} date - Data a ser formatada
 * @returns {string} Data formatada
 */
export function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Formata preço em reais
 * @param {number} cents - Valor em centavos
 * @returns {string} Preço formatado
 */
export function formatPrice(cents) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

/**
 * Valida slug (apenas letras minúsculas, números e hífens)
 * @param {string} slug - Slug a ser validado
 * @returns {boolean}
 */
export function isValidSlug(slug) {
  return /^[a-z0-9-]+$/.test(slug);
}

/**
 * Gera slug a partir de um nome
 * @param {string} name - Nome a ser convertido
 * @returns {string} Slug gerado
 */
export function generateSlug(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
