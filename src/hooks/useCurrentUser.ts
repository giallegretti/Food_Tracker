"use client";

// O app é usado só pela Giovanna. O perfil do Ricardo fica oculto, mas os
// dados dele continuam no Convex (userId "ricardo") caso precise voltar.
const USER_ID = "giovanna";

export function useCurrentUser() {
  return { userId: USER_ID };
}
