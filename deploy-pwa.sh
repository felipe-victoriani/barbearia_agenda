#!/bin/bash

# 🚀 SCRIPT DE DEPLOY PWA - BARBEARIA SAAS
# Versão: 1.0.0-mobile
# Data: 14 de fevereiro de 2026

echo "🪒 DEPLOY BARBEARIA SAAS - VERSÃO PWA MOBILE"
echo "=============================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
    error "Execute este script na raiz do projeto (onde está o package.json)"
    exit 1
fi

log "Verificando arquivos PWA..."

# Verificar arquivos essenciais
files_to_check=(
    "public/manifest.json"
    "public/sw.js"
    "public/images/icon-192.svg"
    "public/images/icon-512.svg"
    "css/style.css"
    "public/index.html"
    "public/shop.html"
    "public/admin.html"
)

missing_files=()
for file in "${files_to_check[@]}"; do
    if [ ! -f "$file" ]; then
        missing_files+=("$file")
    fi
done

if [ ${#missing_files[@]} -ne 0 ]; then
    error "Arquivos PWA faltando:"
    for file in "${missing_files[@]}"; do
        echo "  ❌ $file"
    done
    exit 1
fi

success "Todos os arquivos PWA estão presentes"

# Verificar se Firebase CLI está instalado
if ! command -v firebase &> /dev/null; then
    warning "Firebase CLI não encontrado. Instalando..."
    npm install -g firebase-tools
    success "Firebase CLI instalado"
fi

# Verificar se está logado no Firebase
log "Verificando login no Firebase..."
if ! firebase projects:list &> /dev/null; then
    warning "Não está logado no Firebase. Execute: firebase login"
    firebase login
fi

# Verificar se há projeto Firebase configurado
if [ ! -f "firebase.json" ]; then
    warning "firebase.json não encontrado. Inicializando projeto..."
    firebase init hosting --yes
fi

# Fazer backup dos arquivos de configuração
log "Fazendo backup das configurações..."
timestamp=$(date +"%Y%m%d_%H%M%S")
backup_dir="backup_$timestamp"
mkdir -p "$backup_dir"

cp js/firebase.js "$backup_dir/" 2>/dev/null || true
cp firebase.json "$backup_dir/" 2>/dev/null || true
cp .firebaserc "$backup_dir/" 2>/dev/null || true

success "Backup criado em: $backup_dir"

# Validar manifest.json
log "Validando manifest.json..."
if command -v jq &> /dev/null; then
    if jq empty public/manifest.json 2>/dev/null; then
        success "manifest.json é válido"
    else
        error "manifest.json contém erros JSON"
        exit 1
    fi
else
    warning "jq não instalado - pulando validação JSON"
fi

# Verificar se o Service Worker tem sintaxe correta
log "Verificando Service Worker..."
if node -c public/sw.js 2>/dev/null; then
    success "sw.js sintaxe OK"
else
    error "sw.js contém erros de sintaxe"
    exit 1
fi

# Deploy
log "Iniciando deploy para Firebase Hosting..."
echo ""
warning "⚠️  ATENÇÃO: Este comando fará deploy da aplicação!"
warning "⚠️  Certifique-se de que as credenciais do Firebase estão corretas!"
echo ""

read -p "Continuar com o deploy? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    log "Deploy cancelado pelo usuário"
    exit 0
fi

# Executar deploy
log "Deploying..."
if firebase deploy --only hosting; then
    success "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
    echo ""
    log "Próximos passos:"
    echo "  1. ✅ Acesse seu site em HTTPS"
    echo "  2. 📱 Teste no celular (instalação PWA)"
    echo "  3. 🔄 Teste offline (DevTools → Offline)"
    echo "  4. 📊 Rode Lighthouse PWA audit"
    echo ""
    log "URLs importantes:"
    echo "  📖 README Mobile: README-MOBILE.md"
    echo "  🧪 Guia de Testes: TESTE-PWA.md"
    echo "  📱 PWA Config: package-mobile.json"
else
    error "❌ DEPLOY FALHOU!"
    log "Verifique os logs acima para detalhes"
    exit 1
fi

echo ""
echo "=============================================="
success "🚀 BARBEARIA SAAS PWA DEPLOYED!"
echo "=============================================="