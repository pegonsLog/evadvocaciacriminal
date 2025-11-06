#!/bin/bash

# Script para deploy PWA no Firebase com verificações
echo "🚀 Iniciando deploy PWA para Firebase..."

# Verificar se está logado no Firebase
echo "🔐 Verificando autenticação Firebase..."
if ! firebase projects:list > /dev/null 2>&1; then
    echo "❌ Não está logado no Firebase. Execute: firebase login"
    exit 1
fi

# Verificar se o projeto existe
echo "📋 Verificando projeto Firebase..."
if ! firebase use --project evac-contratos > /dev/null 2>&1; then
    echo "❌ Projeto 'evac-contratos' não encontrado ou sem acesso"
    echo "💡 Tente executar: firebase use --add"
    exit 1
fi

# Verificar se o build existe
if [ ! -d "dist/evadvociacriminal" ]; then
    echo "📦 Build não encontrado. Executando build..."
    npm run build
    if [ $? -ne 0 ]; then
        echo "❌ Falha no build"
        exit 1
    fi
fi

# Verificar arquivos PWA essenciais
echo "🔍 Verificando arquivos PWA..."
required_files=("dist/evadvociacriminal/ngsw-worker.js" "dist/evadvociacriminal/manifest.webmanifest" "dist/evadvociacriminal/ngsw.json")

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Arquivo PWA ausente: $file"
        exit 1
    fi
done

echo "✅ Todos os arquivos PWA estão presentes"

# Executar deploy apenas do hosting
echo "🌐 Executando deploy do hosting..."
firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo "🎉 Deploy concluído com sucesso!"
    echo ""
    echo "📱 Para testar a PWA:"
    echo "   1. Acesse o site no dispositivo móvel"
    echo "   2. Procure pelo prompt 'Instalar aplicativo'"
    echo "   3. Teste o funcionamento offline"
    echo ""
    echo "🔧 Para debug:"
    echo "   - Chrome DevTools > Application > Service Workers"
    echo "   - Chrome DevTools > Application > Manifest"
    echo "   - Lighthouse PWA audit"
else
    echo "❌ Falha no deploy"
    echo ""
    echo "🔧 Soluções possíveis:"
    echo "   1. Verificar autenticação: firebase login"
    echo "   2. Verificar projeto: firebase use evac-contratos"
    echo "   3. Verificar permissões no projeto Firebase"
    echo "   4. Tentar deploy específico: firebase deploy --only hosting:evac-contratos"
    exit 1
fi