# 🎨 Configuração da Logo PWA - Eder Vale Advocacia Criminal

## Logo Fornecida

A logo circular com o design "EV" e martelo da justiça foi fornecida e precisa ser processada para gerar os ícones PWA.

## Cores da Identidade Visual

- **Cor Principal**: #2c5aa0 (azul da logo)
- **Cor de Fundo**: #f8f9fa (cinza claro)
- **Elementos**: Azul e cinza metálico

## Passos para Implementar a Logo

### 1. Salvar a Logo Original

- Salve a imagem fornecida como: `src/assets/logo-original.png`
- Recomendado: resolução mínima de 512x512px para melhor qualidade

### 2. Gerar os Ícones PWA

Execute o comando para gerar automaticamente todos os tamanhos:

```bash
node generate-icons.js
```

### 3. Usar Ferramenta Online (Recomendado)

1. Acesse: https://realfavicongenerator.net/
2. Faça upload da logo original
3. Configure as opções:
   - **iOS**: Usar a logo como está
   - **Android**: Usar a logo como está
   - **Windows**: Usar a logo como está
4. Baixe o pacote gerado
5. Substitua os arquivos em `src/assets/icons/`

### 4. Tamanhos Necessários

- 72x72px (Android)
- 96x96px (Android)
- 128x128px (Chrome)
- 144x144px (Windows)
- 152x152px (iOS)
- 192x192px (Android)
- 384x384px (Android)
- 512x512px (Android/Chrome)

### 5. Verificar Implementação

Após gerar os ícones, execute:

```bash
npm run build
```

E verifique se os novos ícones aparecem em `dist/evadvociacriminal/assets/icons/`

## Configurações Atualizadas

### Manifest (src/manifest.webmanifest)

- ✅ Nome: "Eder Vale Advocacia Criminal"
- ✅ Nome curto: "EV Advocacia"
- ✅ Cor do tema: #2c5aa0
- ✅ Cor de fundo: #f8f9fa

### HTML (src/index.html)

- ✅ Título: "Eder Vale Advocacia Criminal"
- ✅ Meta theme-color: #2c5aa0

## Resultado Final

Após a implementação, a PWA terá:

- Logo personalizada da Eder Vale Advocacia Criminal
- Cores consistentes com a identidade visual
- Ícones otimizados para todas as plataformas
- Experiência de instalação profissional
