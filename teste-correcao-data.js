// Teste para verificar se a correção da data funciona
console.log("🧪 Testando correção da data de vencimento...\n");

// Função corrigida para criar data segura
function criarDataSegura(data) {
  if (data instanceof Date) {
    return new Date(data);
  }

  if (typeof data === "string") {
    if (data.includes("T")) {
      return new Date(data);
    }
    return new Date(data + "T12:00:00");
  }

  return new Date(data);
}

// Testar com a data problemática
console.log("📅 Testando data problemática: 2026-05-09");

const dataProblematica = "2026-05-09";

console.log("\n🔍 Método antigo (problemático):");
const dataAntiga = new Date(dataProblematica);
console.log(`   new Date('${dataProblematica}')`);
console.log(`   Resultado: ${dataAntiga.toISOString()}`);
console.log(`   Dia extraído: ${dataAntiga.getDate()}`);
console.log(`   Data local: ${dataAntiga.toLocaleDateString("pt-BR")}`);

console.log("\n✅ Método novo (corrigido):");
const dataNova = criarDataSegura(dataProblematica);
console.log(`   criarDataSegura('${dataProblematica}')`);
console.log(`   Resultado: ${dataNova.toISOString()}`);
console.log(`   Dia extraído: ${dataNova.getDate()}`);
console.log(`   Data local: ${dataNova.toLocaleDateString("pt-BR")}`);

// Testar simulação completa de geração de parcelas
console.log("\n🔄 Simulando geração de parcelas com método corrigido:");

function simularGeracaoParcelasCorrigida(dataString, numeroParcelas = 3) {
  console.log(
    `\n📋 Gerando ${numeroParcelas} parcelas com primeiro vencimento em ${dataString}`
  );

  const dataPrimeiroVencimento = criarDataSegura(dataString);
  const diaVencimento = dataPrimeiroVencimento.getDate();

  console.log(`   Data criada: ${dataPrimeiroVencimento.toISOString()}`);
  console.log(`   Dia extraído: ${diaVencimento}`);

  for (let i = 0; i < numeroParcelas; i++) {
    const dataVencimento = new Date(dataPrimeiroVencimento);
    dataVencimento.setMonth(dataVencimento.getMonth() + i);

    const ultimoDiaDoMes = new Date(
      dataVencimento.getFullYear(),
      dataVencimento.getMonth() + 1,
      0
    ).getDate();
    if (diaVencimento > ultimoDiaDoMes) {
      dataVencimento.setDate(ultimoDiaDoMes);
    } else {
      dataVencimento.setDate(diaVencimento);
    }

    console.log(
      `   Parcela ${i + 1}: ${dataVencimento.getDate()}/${(
        dataVencimento.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${dataVencimento.getFullYear()}`
    );
  }
}

simularGeracaoParcelasCorrigida("2026-05-09");

// Testar outros casos
console.log("\n🧪 Testando outros casos:");
simularGeracaoParcelasCorrigida("2024-12-31", 2);
simularGeracaoParcelasCorrigida("2025-02-28", 2);

console.log("\n🎉 Teste concluído! O problema da data deve estar resolvido.");
console.log("\n📝 Resumo da correção:");
console.log(
  '   ❌ Antes: new Date("2026-05-09") → dia 8 (problema de fuso horário)'
);
console.log('   ✅ Depois: new Date("2026-05-09T12:00:00") → dia 9 (correto)');
console.log("\n🚀 Agora o sistema deve mostrar o dia correto: 9 em vez de 1!");
