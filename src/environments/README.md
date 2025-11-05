# Configuração de Ambientes

## Como configurar

1. Copie os arquivos `.example.ts` removendo o `.example` do nome:
   ```bash
   cp environment.example.ts environment.ts
   cp environment.development.example.ts environment.development.ts
   cp environment.production.example.ts environment.production.ts
   ```

2. Configure suas credenciais do Firebase em cada arquivo

3. Os arquivos `environment.ts`, `environment.development.ts` e `environment.production.ts` estão no `.gitignore` e não serão enviados para o repositório

## Estrutura

- `environment.ts` - Configuração padrão
- `environment.development.ts` - Configuração para desenvolvimento
- `environment.production.ts` - Configuração para produção
- `*.example.ts` - Templates de exemplo (versionados no Git)