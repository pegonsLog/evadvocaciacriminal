const fs = require("fs");
const path = require("path");

// Script para gerar ícones PWA a partir da logo
// Este script requer uma ferramenta de redimensionamento de imagem

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const inputLogo = "src/assets/logo-original.png";
const outputDir = "src/assets/icons";

console.log("🎨 Gerador de Ícones PWA - Eder Vale Advocacia Criminal");
console.log("");
console.log("Para gerar os ícones, você precisa:");
console.log("1. Salvar a logo fornecida como: src/assets/logo-original.png");
console.log(
  "2. Usar uma ferramenta como ImageMagick, GIMP, ou online converter"
);
console.log("3. Redimensionar para os seguintes tamanhos:");
console.log("");

sizes.forEach((size) => {
  console.log(
    `   - ${size}x${size}px → src/assets/icons/icon-${size}x${size}.png`
  );
});

console.log("");
console.log("💡 Dica: Use ferramentas online como:");
console.log("   - https://realfavicongenerator.net/");
console.log("   - https://www.favicon-generator.org/");
console.log("   - https://favicon.io/favicon-converter/");
console.log("");
console.log("Ou use ImageMagick via linha de comando:");
sizes.forEach((size) => {
  console.log(
    `magick convert ${inputLogo} -resize ${size}x${size} src/assets/icons/icon-${size}x${size}.png`
  );
});
