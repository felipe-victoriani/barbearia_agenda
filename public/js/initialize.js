/**
 * Script de Inicialização
 * Cria usuários administradores padrão no Firebase
 */

import { auth, database } from "./firebase.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  set,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/**
 * Cria barbearias de exemplo
 */
async function initializeSampleBarbershops() {
  const sampleBarbershops = {
    "barbearia-centro": {
      name: "Barbearia Centro",
      description:
        "A melhor barbearia do centro da cidade. Cortes modernos e clássicos.",
      address: "Rua Principal, 123 - Centro",
      phone: "(11) 99999-9999",
      email: "contato@barbearia-centro.com",
      active: true,
      settings: {
        workingDays: {
          1: true, // Segunda
          2: true, // Terça
          3: true, // Quarta
          4: true, // Quinta
          5: true, // Sexta
          6: true, // Sábado
          0: false, // Domingo
        },
        workingHours: {
          1: { start: "08:00", end: "18:00" },
          2: { start: "08:00", end: "18:00" },
          3: { start: "08:00", end: "18:00" },
          4: { start: "08:00", end: "18:00" },
          5: { start: "08:00", end: "18:00" },
          6: { start: "08:00", end: "18:00" },
        },
        interval: 20, // 20 minutos entre agendamentos
        advanceBookingDays: 30,
        maxPerSlot: 1,
        isOpen: true,
        closedMessage: "",
      },
      barbers: {
        "barber-1": {
          name: "João Silva",
          phone: "(11) 99999-1111",
          email: "joao@barbearia-centro.com",
          specialties: ["Corte", "Barba", "Bigode"],
          active: true,
          createdAt: new Date().toISOString(),
        },
        "barber-2": {
          name: "Carlos Santos",
          phone: "(11) 99999-2222",
          email: "carlos@barbearia-centro.com",
          specialties: ["Corte", "Barba", "Sobrancelha"],
          active: true,
          createdAt: new Date().toISOString(),
        },
      },
      services: {
        "service-1": {
          name: "Corte de Cabelo",
          price: 2500, // R$ 25,00
          duration: 30, // 30 minutos
          description: "Corte moderno com acabamento profissional",
          active: true,
          createdAt: new Date().toISOString(),
        },
        "service-2": {
          name: "Barba Completa",
          price: 2000, // R$ 20,00
          duration: 20, // 20 minutos
          description: "Aparação e modelagem da barba",
          active: true,
          createdAt: new Date().toISOString(),
        },
        "service-3": {
          name: "Corte + Barba",
          price: 4000, // R$ 40,00
          duration: 45, // 45 minutos
          description: "Pacote completo: corte + barba",
          active: true,
          createdAt: new Date().toISOString(),
        },
      },
      createdAt: new Date().toISOString(),
    },
  };

  console.log("🏪 Criando barbearias de exemplo...");

  for (const [slug, barbershop] of Object.entries(sampleBarbershops)) {
    try {
      const barbershopRef = ref(database, `barbershops/${slug}`);
      await set(barbershopRef, barbershop);
      console.log(`✅ Barbearia criada: ${barbershop.name}`);
    } catch (error) {
      console.error(`❌ Erro ao criar barbearia ${barbershop.name}:`, error);
    }
  }
}

/**
 * Cria usuários administradores padrão
 */
export async function initializeDefaultUsers() {
  const defaultUsers = [
    {
      email: "admin@barbearia.com",
      password: "admin123",
      role: "ADMIN",
      name: "Administrador",
      barbershopId: null, // Pode gerenciar todas as barbearias
    },
  ];

  console.log("🔧 Inicializando usuários padrão...");

  for (const userData of defaultUsers) {
    try {
      // Cria usuário no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password,
      );

      const uid = userCredential.user.uid;

      // Salva dados do usuário no Realtime Database
      const userRef = ref(database, `users/${uid}`);
      await set(userRef, {
        email: userData.email,
        name: userData.name,
        role: userData.role,
        barbershopId: userData.barbershopId,
        active: true,
        createdAt: new Date().toISOString(),
      });

      console.log(`✅ Usuário criado: ${userData.email} (${userData.role})`);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        console.log(`⚠️ Usuário já existe: ${userData.email}`);
      } else {
        console.error(`❌ Erro ao criar usuário ${userData.email}:`, error);
      }
    }
  }

  // Cria barbearias de exemplo
  await initializeSampleBarbershops();

  console.log("🎉 Inicialização concluída!");
  console.log("");
  console.log("📋 Credenciais de acesso:");
  console.log("ADMIN: admin@barbearia.com / admin123");
}

// Executa automaticamente se este arquivo for carregado diretamente
if (typeof window !== "undefined" && window.location) {
  // Só executa se estiver em um navegador
  // initializeDefaultUsers().catch(console.error); // Desabilitado - usuário cria seu próprio admin
}
