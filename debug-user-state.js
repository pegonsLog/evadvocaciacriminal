// Script para diagnosticar o estado do usuário
// Cole no console do navegador (F12) na sua aplicação

console.log("=== DIAGNÓSTICO DO ESTADO DO USUÁRIO ===");

// Verificar Firebase Auth
if (window.firebase && window.firebase.auth) {
  const auth = window.firebase.auth();
  const currentUser = auth.currentUser;

  if (currentUser) {
    console.log("✅ Usuário Firebase Auth:");
    console.log("- UID:", currentUser.uid);
    console.log("- Email:", currentUser.email);
    console.log("- Nome:", currentUser.displayName);

    // Verificar documento no Firestore
    const firestore = window.firebase.firestore();
    firestore
      .collection("users")
      .doc(currentUser.uid)
      .get()
      .then((doc) => {
        if (doc.exists) {
          console.log("✅ Documento do usuário encontrado no Firestore:");
          console.log(doc.data());
        } else {
          console.log("❌ Documento do usuário NÃO encontrado no Firestore");
          console.log("Isso explica por que o header/footer não aparecem!");
        }
      })
      .catch((error) => {
        console.log("❌ Erro ao buscar documento do usuário:", error);
      });
  } else {
    console.log("❌ Nenhum usuário logado no Firebase Auth");
  }
} else {
  console.log("❌ Firebase não disponível");
}

console.log("=== FIM DO DIAGNÓSTICO ===");
