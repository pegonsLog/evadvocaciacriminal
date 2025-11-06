#!/bin/bash

# Script para executar todos os testes PWA e gerar relatório consolidado
# EV Advocacia Criminal - PWA Test Suite

set -e  # Exit on any error

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log colorido
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Header
echo "════════════════════════════════════════════════════════════════"
echo "  🚀 EV ADVOCACIA CRIMINAL - PWA TEST SUITE"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Verificar pré-requisitos
log_info "Verificando pré-requisitos..."

# Verificar Node.js
if ! command -v node &> /dev/null; then
    log_error "Node.js não encontrado. Instale Node.js 18+ para continuar."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    log_error "Node.js versão 18+ necessária. Versão atual: $(node --version)"
    exit 1
fi

log_success "Node.js $(node --version) ✓"

# Verificar npm
if ! command -v npm &> /dev/null; then
    log_error "npm não encontrado."
    exit 1
fi

log_success "npm $(npm --version) ✓"

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    log_error "package.json não encontrado. Execute este script na raiz do projeto."
    exit 1
fi

if [ ! -f "angular.json" ]; then
    log_error "angular.json não encontrado. Este não parece ser um projeto Angular."
    exit 1
fi

log_success "Projeto Angular detectado ✓"

# Instalar dependências se necessário
if [ ! -d "node_modules" ]; then
    log_info "Instalando dependências..."
    npm install
    log_success "Dependências instaladas ✓"
fi

# Verificar se puppeteer está instalado
if ! npm list puppeteer &> /dev/null; then
    log_warning "Puppeteer não encontrado. Instalando..."
    npm install puppeteer --save-dev
    log_success "Puppeteer instalado ✓"
fi

# Criar diretório para relatórios se não existir
mkdir -p reports
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_DIR="reports/pwa_tests_$TIMESTAMP"
mkdir -p "$REPORT_DIR"

log_info "Relatórios serão salvos em: $REPORT_DIR"

# Variáveis para tracking de resultados
VALIDATION_PASSED=false
INSTALLATION_PASSED=false
CACHE_PASSED=false
BUILD_PASSED=false

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  📋 FASE 1: BUILD DE PRODUÇÃO"
echo "────────────────────────────────────────────────────────────────"

log_info "Executando build de produção..."
if npm run build:prod > "$REPORT_DIR/build.log" 2>&1; then
    log_success "Build de produção concluído"
    BUILD_PASSED=true
else
    log_error "Falha no build de produção. Verifique $REPORT_DIR/build.log"
    cat "$REPORT_DIR/build.log"
    exit 1
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  🔍 FASE 2: VALIDAÇÃO ESTÁTICA"
echo "────────────────────────────────────────────────────────────────"

log_info "Executando validação estática..."
if npm run test:pwa-validation > "$REPORT_DIR/validation.log" 2>&1; then
    log_success "Validação estática passou"
    VALIDATION_PASSED=true
else
    log_warning "Validação estática falhou. Continuando com outros testes..."
    log_info "Verifique $REPORT_DIR/validation.log para detalhes"
fi

# Copiar relatório de validação se existir
if [ -f "pwa-validation-report.json" ]; then
    cp pwa-validation-report.json "$REPORT_DIR/"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  🖥️  FASE 3: INICIAR SERVIDOR DE TESTE"
echo "────────────────────────────────────────────────────────────────"

log_info "Verificando se aplicação está rodando..."

# Verificar se porta 4200 está em uso
if lsof -Pi :4200 -sTCP:LISTEN -t >/dev/null; then
    log_info "Aplicação já está rodando na porta 4200"
    SERVER_STARTED=false
else
    log_info "Iniciando servidor de desenvolvimento..."
    # Iniciar servidor em background
    npm start > "$REPORT_DIR/server.log" 2>&1 &
    SERVER_PID=$!
    SERVER_STARTED=true
    
    # Aguardar servidor inicializar
    log_info "Aguardando servidor inicializar..."
    for i in {1..30}; do
        if curl -s http://localhost:4200 > /dev/null 2>&1; then
            log_success "Servidor iniciado com sucesso"
            break
        fi
        if [ $i -eq 30 ]; then
            log_error "Timeout aguardando servidor inicializar"
            if [ "$SERVER_STARTED" = true ]; then
                kill $SERVER_PID 2>/dev/null || true
            fi
            exit 1
        fi
        sleep 2
    done
fi

# Função para cleanup
cleanup() {
    if [ "$SERVER_STARTED" = true ] && [ ! -z "$SERVER_PID" ]; then
        log_info "Parando servidor de teste..."
        kill $SERVER_PID 2>/dev/null || true
        wait $SERVER_PID 2>/dev/null || true
        log_success "Servidor parado"
    fi
}

# Registrar cleanup para execução ao sair
trap cleanup EXIT

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  📱 FASE 4: TESTES DE INSTALAÇÃO"
echo "────────────────────────────────────────────────────────────────"

log_info "Executando testes de instalação..."
if timeout 300 npm run test:pwa-installation > "$REPORT_DIR/installation.log" 2>&1; then
    log_success "Testes de instalação passaram"
    INSTALLATION_PASSED=true
else
    log_warning "Testes de instalação falharam ou timeout. Continuando..."
    log_info "Verifique $REPORT_DIR/installation.log para detalhes"
fi

# Copiar relatório de instalação se existir
if [ -f "pwa-installation-report.json" ]; then
    cp pwa-installation-report.json "$REPORT_DIR/"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  💾 FASE 5: TESTES DE CACHE"
echo "────────────────────────────────────────────────────────────────"

log_info "Executando testes de cache..."
if timeout 300 npm run test:pwa-cache > "$REPORT_DIR/cache.log" 2>&1; then
    log_success "Testes de cache passaram"
    CACHE_PASSED=true
else
    log_warning "Testes de cache falharam ou timeout"
    log_info "Verifique $REPORT_DIR/cache.log para detalhes"
fi

# Copiar relatório de cache se existir
if [ -f "pwa-cache-report.json" ]; then
    cp pwa-cache-report.json "$REPORT_DIR/"
fi

echo ""
echo "────────────────────────────────────────────────────────────────"
echo "  📊 FASE 6: RELATÓRIO FINAL"
echo "────────────────────────────────────────────────────────────────"

# Gerar relatório consolidado
REPORT_FILE="$REPORT_DIR/consolidated_report.json"
cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")",
  "testSuite": "PWA Complete Test Suite",
  "version": "1.0",
  "project": "EV Advocacia Criminal",
  "results": {
    "build": $BUILD_PASSED,
    "validation": $VALIDATION_PASSED,
    "installation": $INSTALLATION_PASSED,
    "cache": $CACHE_PASSED
  },
  "summary": {
    "totalPhases": 4,
    "passedPhases": $((BUILD_PASSED + VALIDATION_PASSED + INSTALLATION_PASSED + CACHE_PASSED)),
    "overallSuccess": $([ "$BUILD_PASSED" = true ] && [ "$VALIDATION_PASSED" = true ] && echo true || echo false)
  },
  "reportDirectory": "$REPORT_DIR",
  "logs": {
    "build": "$REPORT_DIR/build.log",
    "validation": "$REPORT_DIR/validation.log",
    "installation": "$REPORT_DIR/installation.log",
    "cache": "$REPORT_DIR/cache.log"
  }
}
EOF

# Calcular score geral
TOTAL_SCORE=0
if [ "$BUILD_PASSED" = true ]; then TOTAL_SCORE=$((TOTAL_SCORE + 25)); fi
if [ "$VALIDATION_PASSED" = true ]; then TOTAL_SCORE=$((TOTAL_SCORE + 25)); fi
if [ "$INSTALLATION_PASSED" = true ]; then TOTAL_SCORE=$((TOTAL_SCORE + 25)); fi
if [ "$CACHE_PASSED" = true ]; then TOTAL_SCORE=$((TOTAL_SCORE + 25)); fi

echo ""
log_info "Gerando relatório consolidado..."

echo "════════════════════════════════════════════════════════════════"
echo "  📋 RESUMO DOS TESTES PWA"
echo "════════════════════════════════════════════════════════════════"
echo ""

# Mostrar resultados
echo "📊 RESULTADOS POR FASE:"
echo "────────────────────────────────────────────────────────────────"
if [ "$BUILD_PASSED" = true ]; then
    echo -e "✅ Build de Produção: ${GREEN}PASSOU${NC}"
else
    echo -e "❌ Build de Produção: ${RED}FALHOU${NC}"
fi

if [ "$VALIDATION_PASSED" = true ]; then
    echo -e "✅ Validação Estática: ${GREEN}PASSOU${NC}"
else
    echo -e "❌ Validação Estática: ${RED}FALHOU${NC}"
fi

if [ "$INSTALLATION_PASSED" = true ]; then
    echo -e "✅ Testes de Instalação: ${GREEN}PASSOU${NC}"
else
    echo -e "❌ Testes de Instalação: ${RED}FALHOU${NC}"
fi

if [ "$CACHE_PASSED" = true ]; then
    echo -e "✅ Testes de Cache: ${GREEN}PASSOU${NC}"
else
    echo -e "❌ Testes de Cache: ${RED}FALHOU${NC}"
fi

echo ""
echo "🏆 SCORE GERAL: $TOTAL_SCORE/100"

# Status final
echo ""
if [ "$TOTAL_SCORE" -ge 75 ]; then
    log_success "PWA PRONTO PARA PRODUÇÃO! 🎉"
    EXIT_CODE=0
elif [ "$TOTAL_SCORE" -ge 50 ]; then
    log_warning "PWA precisa de melhorias antes do deploy"
    EXIT_CODE=1
else
    log_error "PWA tem problemas críticos que precisam ser corrigidos"
    EXIT_CODE=1
fi

echo ""
echo "📁 RELATÓRIOS SALVOS EM:"
echo "   $REPORT_DIR/"
echo ""
echo "📄 ARQUIVOS GERADOS:"
ls -la "$REPORT_DIR/" | grep -E '\.(json|log)$' | awk '{print "   " $9 " (" $5 " bytes)"}'

echo ""
echo "🔍 PARA ANALISAR FALHAS:"
echo "   cat $REPORT_DIR/*.log"
echo ""
echo "📊 RELATÓRIO CONSOLIDADO:"
echo "   cat $REPORT_FILE"

# Copiar relatório final se existir
if [ -f "pwa-test-report-final.json" ]; then
    cp pwa-test-report-final.json "$REPORT_DIR/"
fi

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✨ TESTES PWA CONCLUÍDOS"
echo "════════════════════════════════════════════════════════════════"

exit $EXIT_CODE