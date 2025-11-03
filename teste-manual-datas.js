// Teste manual para verificar a lógica de datas
console.log("🧪 Testando lógica de geração de datas...\n");

function testarGeracaoDatas() {
  // Simular exatamente a lógica do ParcelaService
  const dataPrimeiroVencimento = new Date("2024-01-31T00:00:00.000Z");
  const diaVencimento = dataPrimeiroVencimento.getDate();
  const numeroParcelas = 3;

  console.log(`Data inicial: ${dataPrimeiroVencimento.toISOString()}`);
  console.log(`Dia de vencimento extraído: ${diaVencimento}`);
  console.log("");

  for (let i = 0; i < numeroParcelas; i++) {
    // Calcular data de vencimento para cada parcela
    const dataVencimento = new Date(dataPrimeiroVencimento);
    dataVencimento.setMonth(dataVencimento.getMonth() + i);

    console.log(`Parcela ${i + 1}:`);
    console.log(`  Data base: ${dataVencimento.toISOString()}`);
    console.log(
      `  Mês: ${
        dataVencimento.getMonth() + 1
      }, Ano: ${dataVencimento.getFullYear()}`
    );

    // Ajustar para o último dia do mês se o dia não existir
    const ultimoDiaDoMes = new Date(
      dataVencimento.getFullYear(),
      dataVencimento.getMonth() + 1,
      0
    ).getDate();
    console.log(`  Último dia do mês: ${ultimoDiaDoMes}`);

    if (diaVencimento > ultimoDiaDoMes) {
      dataVencimento.setDate(ultimoDiaDoMes);
      console.log(`  Ajustado para último dia: ${dataVencimento.getDate()}`);
    } else {
      dataVencimento.setDate(diaVencimento);
      console.log(`  Mantido dia original: ${dataVencimento.getDate()}`);
    }

    console.log(`  Data final: ${dataVencimento.toDateString()}`);
    console.log(
      `  Data formatada: ${dataVencimento.getDate()}/${(
        dataVencimento.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${dataVencimento.getFullYear()}`
    );
    console.log("");
  }
}

testarGeracaoDatas();

// Teste com diferentes cenários
console.log("🧪 Testando diferentes cenários...\n");

const cenarios = [
  { nome: "Dia 31 - Janeiro para Março", data: "2024-01-31", parcelas: 3 },
  { nome: "Dia 30 - Janeiro para Março", data: "2024-01-30", parcelas: 3 },
  { nome: "Dia 15 - Qualquer mês", data: "2024-01-15", parcelas: 4 },
  { nome: "Dia 29 - Fevereiro bissexto", data: "2024-02-29", parcelas: 2 },
];

cenarios.forEach((cenario) => {
  console.log(`📅 ${cenario.nome}:`);
  const dataInicial = new Date(cenario.data + "T00:00:00.000Z");
  const diaVencimento = dataInicial.getDate();

  for (let i = 0; i < cenario.parcelas; i++) {
    const dataVencimento = new Date(dataInicial);
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
});
