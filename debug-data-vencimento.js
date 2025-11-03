// Debug para verificar o problema com a data de vencimento
console.log("🔍 Debugando problema com data de vencimento...\n");

// Simular exatamente o que acontece no sistema
function testarDataVencimento(dataString) {
  console.log(`📅 Testando data: ${dataString}`);

  // Simular como o Angular processa a data do input
  const dataInput = new Date(dataString);
  console.log(`   Data do input: ${dataInput.toISOString()}`);
  console.log(`   Data local: ${dataInput.toLocaleDateString("pt-BR")}`);
  console.log(`   Dia extraído: ${dataInput.getDate()}`);
  console.log(`   Mês: ${dataInput.getMonth() + 1}`);
  console.log(`   Ano: ${dataInput.getFullYear()}`);

  // Verificar fuso horário
  console.log(`   Timezone offset: ${dataInput.getTimezoneOffset()} minutos`);

  // Testar diferentes formas de criar a data
  console.log("\n   🧪 Testando diferentes formas de criar a data:");

  // Forma 1: new Date(string)
  const data1 = new Date(dataString);
  console.log(`   1. new Date('${dataString}'): dia ${data1.getDate()}`);

  // Forma 2: new Date(string + 'T00:00:00')
  const data2 = new Date(dataString + "T00:00:00");
  console.log(
    `   2. new Date('${dataString}T00:00:00'): dia ${data2.getDate()}`
  );

  // Forma 3: new Date(string + 'T12:00:00')
  const data3 = new Date(dataString + "T12:00:00");
  console.log(
    `   3. new Date('${dataString}T12:00:00'): dia ${data3.getDate()}`
  );

  // Forma 4: Construir manualmente
  const partes = dataString.split("-");
  const data4 = new Date(
    parseInt(partes[0]),
    parseInt(partes[1]) - 1,
    parseInt(partes[2])
  );
  console.log(
    `   4. new Date(${partes[0]}, ${parseInt(partes[1]) - 1}, ${
      partes[2]
    }): dia ${data4.getDate()}`
  );

  console.log("");
}

// Testar com a data problemática
testarDataVencimento("2026-05-09");

// Testar com outras datas para comparar
console.log("🔍 Testando outras datas para comparação:\n");
testarDataVencimento("2024-12-15");
testarDataVencimento("2025-01-31");
testarDataVencimento("2025-02-28");

// Simular o processo completo de geração de parcelas
console.log("🔍 Simulando processo completo de geração de parcelas:\n");

function simularGeracaoParcelas(dataString, numeroParcelas = 3) {
  console.log(
    `📋 Gerando ${numeroParcelas} parcelas com primeiro vencimento em ${dataString}`
  );

  // Simular exatamente a lógica do ParcelaService
  const dataPrimeiroVencimento = new Date(dataString);
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

  console.log("");
}

simularGeracaoParcelas("2026-05-09");

// Verificar se o problema está no fuso horário
console.log("🌍 Verificando informações de fuso horário:\n");
const agora = new Date();
console.log(`Data atual: ${agora.toISOString()}`);
console.log(
  `Fuso horário local: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`
);
console.log(`Offset UTC: ${agora.getTimezoneOffset()} minutos`);

// Testar com diferentes fusos
const dataProblematica = new Date("2026-05-09");
console.log(`\nData problemática em diferentes representações:`);
console.log(`ISO: ${dataProblematica.toISOString()}`);
console.log(`Local: ${dataProblematica.toLocaleDateString("pt-BR")}`);
console.log(`UTC: ${dataProblematica.toUTCString()}`);
console.log(`Dia local: ${dataProblematica.getDate()}`);
console.log(`Dia UTC: ${dataProblematica.getUTCDate()}`);
