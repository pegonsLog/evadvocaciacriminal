# EV Advocacia Criminal

Aplicação Angular para gestão de advocacia criminal.

## Requisitos

- Node.js (versão 18 ou superior)
- npm (versão 9 ou superior)

## Instalação

```bash
npm install
```

## ⚠️ Configuração de Ambiente

**IMPORTANTE**: Antes de executar o projeto, você precisa configurar as chaves do Firebase.

1. Leia o arquivo `CONFIGURACAO_AMBIENTE.md` para instruções detalhadas
2. Configure seus arquivos de ambiente com suas chaves do Firebase
3. Nunca commite chaves de API reais no repositório

```bash
# Copie os templates e configure suas chaves
copy "src\environments\environment.template.ts" "src\environments\environment.ts"
# Edite o arquivo copiado com suas chaves reais do Firebase
```

## Executar o projeto

```bash
npm start
```

A aplicação estará disponível em `http://localhost:4200/`

## Build para produção

```bash
npm run build
```

Os arquivos de build serão gerados no diretório `dist/`.

## Executar testes

```bash
npm test
```

## Estrutura do Projeto

```
evadvociacriminal/
├── src/
│   ├── app/
│   │   ├── app.component.ts
│   │   ├── app.component.html
│   │   ├── app.component.scss
│   │   ├── app.component.spec.ts
│   │   ├── app.config.ts
│   │   └── app.routes.ts
│   ├── assets/
│   ├── index.html
│   ├── main.ts
│   └── styles.scss
├── angular.json
├── package.json
├── tsconfig.json
└── README.md
```

## Tecnologias Utilizadas

- Angular 17 (Standalone Components)
- TypeScript
- SCSS
- RxJS

## Próximos Passos

1. Instalar as dependências: `npm install`
2. Iniciar o servidor de desenvolvimento: `npm start`
3. Começar a desenvolver suas funcionalidades!
