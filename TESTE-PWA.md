# 🧪 GUIA DE TESTES - PWA MOBILE

## 📱 **TESTE RÁPIDO DA PWA**

### **1. Teste Básico no Navegador**
```bash
# Abra o DevTools (F12)
# Vá em Application → Manifest
# Deve mostrar: "Barbearia SaaS" com ícones

# Vá em Application → Service Workers
# Deve mostrar: "sw.js" ativo e running
```

### **2. Teste Offline**
```bash
# DevTools → Network → ☑️ Offline
# Recarregue a página (F5)
# ✅ Deve carregar (dados em cache)
# ❌ Se erro: Service Worker não registrado
```

### **3. Teste Instalação**
```bash
# Chrome Desktop: 3 pontos → "Instalar Barbearia SaaS"
# ✅ Deve instalar como app
# ❌ Se não aparece: Verificar manifest.json
```

---

## 📊 **CHECKLIST DE VALIDAÇÃO PWA**

### **Manifest.json**
- [ ] `name`: "Barbearia SaaS"
- [ ] `short_name`: "Barbearia"
- [ ] `start_url`: "/"
- [ ] `display`: "standalone"
- [ ] `theme_color`: "#1a1a1a"
- [ ] `background_color`: "#ffffff"
- [ ] Ícones: 192x192 e 512x512 SVG

### **Service Worker**
- [ ] Registrado em todas as páginas principais
- [ ] Cache estático funcionando
- [ ] Firebase requests passam (network-first)
- [ ] Offline fallback funcionando

### **CSS Responsivo**
- [ ] Mobile-first design
- [ ] Touch targets ≥ 44px
- [ ] Font-size legível
- [ ] Dark mode funcionando
- [ ] PWA media queries aplicadas

### **Performance**
- [ ] Lighthouse PWA score ≥ 90
- [ ] First Contentful Paint < 2s
- [ ] Time to Interactive < 3s
- [ ] Bundle size otimizado

---

## 🛠️ **DEBUGGING PWA**

### **Problema: Não instala**
**Sintomas:** Botão "Instalar" não aparece
**Soluções:**
```javascript
// Verificar no Console:
navigator.serviceWorker.getRegistrations().then(registrations => {
  console.log('SWs registrados:', registrations.length);
});

// Verificar manifest:
fetch('/manifest.json').then(r => r.json()).then(console.log);
```

### **Problema: Offline não funciona**
**Sintomas:** Página em branco offline
**Soluções:**
```javascript
// Verificar cache:
caches.open('barbearia-v1.0.0').then(cache => {
  cache.keys().then(keys => console.log('Arquivos em cache:', keys));
});
```

### **Problema: Cache antigo**
**Sintomas:** Mudanças não aparecem
**Soluções:**
```bash
# Hard refresh
Ctrl + Shift + R

# Ou no DevTools:
Application → Storage → Clear storage
```

---

## 📱 **TESTE EM DISPOSITIVOS REAIS**

### **Android (Chrome)**
1. Abra site em Chrome
2. Toque nos 3 pontos → "Adicionar à tela inicial"
3. Deve aparecer ícone na home
4. Abra como app → Deve funcionar fullscreen

### **iOS (Safari)**
1. Abra site em Safari
2. Toque em "Compartilhar" → "Adicionar à tela inicial"
3. Deve aparecer ícone na home
4. Abra como app → Deve funcionar fullscreen

### **Windows (Edge)**
1. Abra site em Edge
2. Botão "Instalar app" na barra de endereço
3. Deve instalar como PWA

---

## 🔍 **FERRAMENTAS DE TESTE**

### **Lighthouse (Chrome DevTools)**
```bash
# Audits → Generate report
# Deve ter:
✅ PWA: ≥90
✅ Performance: ≥80
✅ Accessibility: ≥90
✅ Best Practices: ≥90
✅ SEO: ≥90
```

### **PWACompat**
```javascript
// Adicione ao HTML para debug:
<script src="https://unpkg.com/pwacompat@2.0.17/pwacompat.min.js" async></script>
```

### **Workbox DevTools**
```bash
# Para debug avançado do Service Worker
npm install -g workbox-cli
workbox wizard
```

---

## 🚨 **PROBLEMAS COMUNS E SOLUÇÕES**

### **1. HTTPS obrigatório**
**Erro:** PWA não funciona em HTTP
**Solução:** Deploy em HTTPS (Firebase hosting já é HTTPS)

### **2. Service Worker scope**
**Erro:** SW não registra
**Solução:** SW deve estar na raiz ou subpasta

### **3. Cache versioning**
**Erro:** Cache não atualiza
**Solução:** Mudar CACHE_NAME no sw.js

### **4. Manifest icons**
**Erro:** Ícones não aparecem
**Solução:** Caminhos corretos e arquivos existem

---

## 📈 **MÉTRICAS DE SUCESSO**

### **PWA Score (Lighthouse)**
- **Excelente:** 90-100
- **Bom:** 80-89
- **Precisa melhorar:** <80

### **Performance**
- **First Paint:** <1.5s
- **First Contentful Paint:** <2s
- **Time to Interactive:** <3s

### **Instalação**
- **Install prompt:** Aparece automaticamente
- **Standalone mode:** Funciona fullscreen
- **Offline:** Carrega em <2s

---

## 🎯 **CHECKLIST FINAL**

- [ ] PWA instalável em Android/iOS/Windows
- [ ] Funciona offline completamente
- [ ] Performance otimizada
- [ ] Design responsivo perfeito
- [ ] Lighthouse score ≥90
- [ ] Service Worker ativo
- [ ] Manifest válido
- [ ] Cache inteligente funcionando
- [ ] Touch interactions suaves
- [ ] Dark mode funcionando
- [ ] Acessibilidade OK

---

**✅ PRONTO PARA PRODUÇÃO QUANDO TODOS OS CHECKS PASSAREM!**