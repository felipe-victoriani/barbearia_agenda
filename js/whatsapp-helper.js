/**
 * WhatsApp Helper - Confirmação Rápida de Agendamentos
 *
 * Esta é uma solução P1 (quick win) que não requer API paga.
 * Usa WhatsApp Web para enviar confirmação.
 *
 * Para implementação: copie a função abaixo para appointments.js
 * e chame após o sucesso do agendamento.
 */

/**
 * Envia confirmação via WhatsApp Web
 * @param {Object} appointmentData - Dados do agendamento
 */
export function sendWhatsAppConfirmation(appointmentData) {
  const {
    barbershopName,
    services,
    barberName,
    date,
    time,
    totalPrice,
    clientName,
    clientPhone,
  } = appointmentData;

  // Remove caracteres não numéricos do telefone
  const cleanPhone = clientPhone.replace(/\D/g, "");

  // Adiciona código do país se não tiver (55 para Brasil)
  const fullPhone = cleanPhone.startsWith("55")
    ? cleanPhone
    : `55${cleanPhone}`;

  // Monta mensagem formatada
  const message =
    `✅ *Agendamento Confirmado!*\n\n` +
    `Olá ${clientName}! 👋\n\n` +
    `Seu horário foi reservado com sucesso:\n\n` +
    `🏪 *Barbearia:* ${barbershopName}\n` +
    `💈 *Serviços:* ${services}\n` +
    `👨‍🦰 *Barbeiro:* ${barberName}\n` +
    `📅 *Data:* ${date}\n` +
    `⏰ *Horário:* ${time}\n` +
    `💰 *Valor:* ${totalPrice}\n\n` +
    `⚠️ *Importante:*\n` +
    `• Chegue com 5 minutos de antecedência\n` +
    `• Em caso de cancelamento, avise com 2h de antecedência\n\n` +
    `Nos vemos lá! 🤙`;

  // Codifica mensagem para URL
  const encodedMessage = encodeURIComponent(message);

  // Abre WhatsApp Web em nova aba
  const whatsappUrl = `https://wa.me/${fullPhone}?text=${encodedMessage}`;

  // Abre em nova aba e mantém foco na página atual
  const whatsappWindow = window.open(whatsappUrl, "_blank");

  // Se o popup foi bloqueado, oferece link manual
  if (
    !whatsappWindow ||
    whatsappWindow.closed ||
    typeof whatsappWindow.closed === "undefined"
  ) {
    const userChoice = confirm(
      "Para enviar a confirmação pelo WhatsApp, precisamos abrir uma nova janela.\n\n" +
        "Clique em OK para abrir o WhatsApp Web.",
    );

    if (userChoice) {
      window.location.href = whatsappUrl;
    }
  }
}

/**
 * Versão alternativa: Copia mensagem para clipboard
 * Útil quando o popup é bloqueado ou em dispositivos móveis
 */
export async function copyWhatsAppMessage(appointmentData) {
  const {
    barbershopName,
    services,
    barberName,
    date,
    time,
    totalPrice,
    clientName,
  } = appointmentData;

  const message =
    `✅ Agendamento Confirmado!\n\n` +
    `Olá ${clientName}! 👋\n\n` +
    `Seu horário foi reservado:\n\n` +
    `🏪 Barbearia: ${barbershopName}\n` +
    `💈 Serviços: ${services}\n` +
    `👨‍🦰 Barbeiro: ${barberName}\n` +
    `📅 Data: ${date}\n` +
    `⏰ Horário: ${time}\n` +
    `💰 Valor: ${totalPrice}\n\n` +
    `Nos vemos lá! 🤙`;

  try {
    await navigator.clipboard.writeText(message);
    alert("✅ Mensagem copiada! Cole no WhatsApp do cliente.");
    return true;
  } catch (error) {
    console.error("Erro ao copiar:", error);
    return false;
  }
}

/**
 * IMPLEMENTAÇÃO NO appointments.js:
 *
 * 1. Importe no topo do arquivo:
 *    import { sendWhatsAppConfirmation } from './whatsapp-helper.js';
 *
 * 2. Adicione após o sessionStorage.setItem (linha ~539):
 *
 *    // Envia confirmação via WhatsApp
 *    sendWhatsAppConfirmation(appointmentData);
 *
 *    sessionStorage.setItem("lastAppointment", JSON.stringify(appointmentData));
 *
 * 3. Para versão com cópia manual, adicione botão na confirmacao.html:
 *    <button onclick="copyToWhatsApp()">📱 Enviar Confirmação</button>
 */

// Função para adicionar na página de confirmação
window.copyToWhatsApp = function () {
  const appointmentData = JSON.parse(sessionStorage.getItem("lastAppointment"));
  if (appointmentData) {
    copyWhatsAppMessage(appointmentData);
  }
};
