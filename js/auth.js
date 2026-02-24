/**
 * Módulo de Autenticação
 * Gerencia login, logout e permissões de usuários
 */

import { auth, database } from "./firebase.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  ref,
  get,
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

/**
 * Faz login do usuário
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} Usuário autenticado
 */
export async function login(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );
    const user = userCredential.user;

    // Busca dados do usuário no Realtime Database
    const userData = await getUserData(user.uid);

    if (!userData) {
      throw new Error("Usuário não encontrado no banco de dados");
    }

    return {
      uid: user.uid,
      email: user.email,
      ...userData,
    };
  } catch (error) {
    console.error("Erro ao fazer login:", error);
    throw error;
  }
}

/**
 * Faz logout do usuário
 */
export async function logout() {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Erro ao fazer logout:", error);
    throw error;
  }
}

/**
 * Busca dados do usuário no Realtime Database
 * @param {string} uid
 * @returns {Promise<Object|null>}
 */
export async function getUserData(uid) {
  try {
    const userRef = ref(database, `users/${uid}`);
    const snapshot = await get(userRef);

    if (snapshot.exists()) {
      return snapshot.val();
    }
    return null;
  } catch (error) {
    console.error("Erro ao buscar dados do usuário:", error);
    return null;
  }
}

/**
 * Verifica se o usuário é administrador master
 * @param {Object} user
 * @returns {boolean}
 */
export function isMaster(user) {
  return user && (user.role === "MASTER" || user.role === "ADMIN");
}

/**
 * Verifica se o usuário é administrador
 * @param {Object} user
 * @returns {boolean}
 */
export function isAdmin(user) {
  return user && (user.role === "ADMIN" || user.role === "MASTER");
}

/**
 * Verifica se o usuário tem permissão para editar uma barbearia
 * @param {Object} user
 * @param {string} barbershopId
 * @returns {boolean}
 */
export function canEditBarbershop(user, barbershopId) {
  if (!user) return false;

  // ADMIN pode editar qualquer barbearia
  if (isAdmin(user)) return true;

  return false;
}

/**
 * Observa o estado de autenticação do usuário
 * @param {Function} callback
 */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userData = await getUserData(firebaseUser.uid);
      callback({
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        ...userData,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Obtém o usuário atualmente autenticado
 * @returns {Promise<Object|null>}
 */
export async function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      unsubscribe();

      if (firebaseUser) {
        const userData = await getUserData(firebaseUser.uid);
        resolve({
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          ...userData,
        });
      } else {
        resolve(null);
      }
    });
  });
}
