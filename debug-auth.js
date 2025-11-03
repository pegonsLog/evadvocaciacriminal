// Script de diagnóstico para verificar autenticação
// Cole este código no console do navegador (F12) na sua aplicação

console.log("=== DIAGNÓSTICO DE AUTENTICAÇÃO ===");

// Verificar se Firebase está carregado
if (typeof firebase !== "undefined") {
  console.log("✅ Firebase carregado");

  // Verificar usuário atual
  const auth = firebase.auth();
  const user = auth.currentUser;

  if (user) {
    console.log("✅ Usuário logado:");
    console.log("- UID:", user.uid);
    console.log("- Email:", user.email);
    console.log("- Nome:", user.displayName);
    console.log("- Token válido:", user.accessToken ? "Sim" : "Não");
  } else {
    console.log("❌ Nenhum usuário logado");
  }
} else {
  console.log("❌ Firebase não carregado");
}

// Verificar se Angular está carregado
if (typeof ng !== "undefined") {
  console.log("✅ Angular carregado");
} else {
  console.log("❌ Angular não detectado");
}

console.log("=== FIM DO DIAGNÓSTICO ===");
