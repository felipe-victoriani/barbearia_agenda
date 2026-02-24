# 🪒 Sistema SaaS de Agendamento para Barbearias

Sistema completo de agendamento online para múltiplas barbearias, desenvolvido com HTML, CSS, JavaScript puro e Firebase.

## � **VERSÃO MOBILE DISPONÍVEL!**

✅ **Progressive Web App (PWA)** completa implementada!
✅ **Instalável** como app nativo no celular
✅ **Offline-first** - Funciona sem internet
✅ **Design responsivo** otimizado para mobile

📖 **[Leia o guia completo da versão mobile](README-MOBILE.md)**
🧪 **[Guia de testes PWA](TESTE-PWA.md)**

---

## �🚀 Funcionalidades

### Para Clientes

- ✅ Visualizar barbearias disponíveis
- ✅ Selecionar serviço, data, barbeiro e horário
- ✅ Sistema de slots de 50 minutos (30min serviço + 20min intervalo)
- ✅ Confirmação imediata do agendamento

### Para Administradores

- ✅ Login com Firebase Auth
- ✅ Painel administrativo completo
- ✅ Gerenciamento de agendamentos (confirmar/cancelar)
- ✅ Visualização de agenda do dia
- ✅ Gerenciamento completo de múltiplas barbearias
- ✅ CRUD completo: barbearias, serviços, barbeiros, configurações

## 📁 Estrutura do Projeto

```
SAAS_BARBEARIA/
├── public/
│   ├── index.html          # Página inicial (lista de barbearias)
│   ├── shop.html           # Página de agendamento
│   └── admin.html          # Painel administrativo
├── css/
│   └── style.css           # Estilos completos e responsivos
├── js/
│   ├── firebase.js         # Configuração Firebase e utilitários
│   ├── auth.js             # Autenticação e permissões
│   ├── barbershops.js      # Gerenciamento de barbearias
│   ├── appointments.js     # Sistema de agendamentos
│   └── admin.js            # Painel administrativo
└── README.md
```

## 🔧 Configuração

### 1. Firebase Setup

1. Crie um projeto no [Firebase Console](https://console.firebase.google.com)

2. Ative os seguintes serviços:
   - **Authentication** (Email/Password)
   - **Realtime Database**

3. Configure as regras do Realtime Database:

```json
{
  "rules": {
    "barbershops": {
      ".read": true,
      ".write": "auth != null"
    },
    "appointments": {
      ".read": true,
      ".write": true
    },
    "users": {
      "$uid": {
        ".read": "auth.uid === $uid",
        ".write": "auth.uid === $uid"
      }
    }
  }
}
```

4. Copie as credenciais do seu projeto Firebase

5. **IMPORTANTE**: Substitua as credenciais em `js/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // ← Substitua pela sua API Key
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com", // ← Substitua pelo seu Project ID
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.firebaseio.com", // ← Substitua
  projectId: "YOUR_PROJECT_ID", // ← Substitua pelo seu Project ID
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app", // ← Substitua
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // ← Substitua
  appId: "YOUR_APP_ID", // ← Substitua pela sua App ID
};
```

**Como obter as credenciais:**

- Acesse seu projeto no [Firebase Console](https://console.firebase.google.com)
- Vá em **Configurações do Projeto** (ícone de engrenagem)
- Role para baixo até **"Seus apps"**
- Clique no ícone **"</>"** (Web app)
- Copie os valores do `firebaseConfig`

### 2. Estrutura do Realtime Database

Importe esta estrutura inicial no seu Realtime Database:

```json
{
  "barbershops": {
    "barber-centro": {
      "name": "Barber Centro",
      "active": true,
      "serviceDuration": 30,
      "interval": 20,
      "services": {
        "service1": {
          "name": "Corte Masculino",
          "price": 3000,
          "active": true
        },
        "service2": {
          "name": "Barba",
          "price": 2500,
          "active": true
        }
      },
      "barbers": {
        "barber1": {
          "name": "João Silva",
          "active": true
        },
        "barber2": {
          "name": "Pedro Santos",
          "active": true
        }
      },
      "availability": {
        "barber1": {
          "1": { "start": 540, "end": 1080 },
          "2": { "start": 540, "end": 1080 },
          "3": { "start": 540, "end": 1080 },
          "4": { "start": 540, "end": 1080 },
          "5": { "start": 540, "end": 1080 },
          "6": { "start": 480, "end": 780 }
        },
        "barber2": {
          "1": { "start": 540, "end": 1080 },
          "2": { "start": 540, "end": 1080 },
          "3": { "start": 540, "end": 1080 },
          "4": { "start": 540, "end": 1080 },
          "5": { "start": 540, "end": 1080 }
        }
      }
    }
  },
  "users": {
    "uid-do-usuario-master": {
      "email": "master@example.com",
      "role": "MASTER",
      "name": "Administrador Master"
    },
    "uid-do-usuario-admin": {
      "email": "admin@barbershop.com",
      "role": "ADMIN",
      "name": "Gerente da Barbearia",
      "barbershopId": "barber-centro"
    }
  },
  "appointments": {}
}
```

### 3. Criar Usuário Administrador no Firebase Authentication

1. Acesse **Authentication > Users** no Firebase Console
2. Clique em **"Adicionar usuário"**
3. Crie seu usuário administrador:
   - **Email**: seu-email@exemplo.com
   - **Senha**: escolha uma senha segura
4. Anote o **UID** gerado após criar o usuário
5. No Realtime Database, crie uma entrada em `users/{UID}` com os dados:

```json
{
  "email": "seu-email@exemplo.com",
  "name": "Seu Nome",
  "role": "ADMIN",
  "barbershopId": null
}
```

**Nota**: O campo `barbershopId: null` permite que o administrador gerencie todas as barbearias do sistema.

### 4. Executar o Projeto

Como o projeto usa ES Modules, você precisa servir os arquivos através de um servidor web:

#### Opção 1: Live Server (VS Code)

1. Instale a extensão "Live Server"
2. Clique com botão direito em `public/index.html`
3. Selecione "Open with Live Server"

#### Opção 2: Python

```bash
# Python 3
python -m http.server 8000

# Acesse: http://localhost:8000/public/
```

#### Opção 3: Node.js (http-server)

```bash
npx http-server -p 8000

# Acesse: http://localhost:8000/public/
```

## 📊 Estrutura de Dados

### Horários (minutos desde meia-noite)

- 09:00 = 540 minutos
- 18:00 = 1080 minutos
- 13:00 = 780 minutos

### Agendamentos

Caminho: `appointments/{slug}/{YYYY-MM-DD}/{barberId}/{startMin}`

Exemplo:

```
appointments/barber-centro/2026-02-14/barber1/540
```

### Status de Agendamento

- `pending`: Aguardando confirmação
- `confirmed`: Confirmado pelo admin
- `cancelled`: Cancelado

### Roles de Usuário

- `MASTER`: Acesso total, gerencia múltiplas barbearias
- `ADMIN`: Gerencia apenas sua barbearia

## 🎨 Design

- 🎯 Layout moderno e responsivo
- 📱 Mobile-first
- 🎨 Paleta de cores profissional
- ✨ Animações suaves
- 💡 Feedback visual claro

## 🔐 Segurança

- Autenticação via Firebase Auth
- Sistema de permissões por role
- Validação de dados no frontend
- Regras de segurança no Firebase

## � Deploy da Versão Mobile (PWA)

### Pré-requisitos para PWA
- ✅ **HTTPS obrigatório** (Firebase Hosting já fornece)
- ✅ **Service Worker** registrado
- ✅ **Manifest válido** com ícones
- ✅ **Design responsivo**

### Como fazer deploy:
```bash
# 1. Instalar Firebase CLI (se não tiver)
npm install -g firebase-tools

# 2. Login no Firebase
firebase login

# 3. Inicializar projeto (se necessário)
firebase init hosting

# 4. Deploy
firebase deploy --only hosting
```

### Teste pós-deploy:
1. ✅ Acesse o site em HTTPS
2. ✅ Teste instalação no mobile
3. ✅ Teste funcionamento offline
4. ✅ Valide Lighthouse PWA score ≥90

### Arquivos PWA criados:
- `public/manifest.json` - Configuração da app
- `public/sw.js` - Service Worker offline
- `public/images/icon-*.svg` - Ícones da app
- CSS responsivo em `css/style.css`

---

## �📝 Próximas Melhorias

- [ ] Interface completa de CRUD para serviços
- [ ] Interface completa de CRUD para barbeiros
- [ ] Interface para definir horários de trabalho
- [ ] Notificações por email/SMS
- [ ] Histórico de agendamentos
- [ ] Relatórios e estatísticas
- [ ] Integração com WhatsApp
- [ ] Sistema de avaliações

## 📄 Licença

Projeto desenvolvido para fins educacionais.

## 🤝 Suporte

Para dúvidas ou problemas:

1. Verifique a configuração do Firebase
2. Confira o console do navegador para erros
3. Confirme que as regras do Realtime Database estão corretas

---

Desenvolvido com ❤️ e ☕
#   b a r b a r i a _ a g e n d a  
 