# 🚀 Guia Rápido - Ver o Sistema Funcionando

## ⚡ Configuração Rápida (5 minutos)

### 1️⃣ Configure o Firebase

1. Acesse: https://console.firebase.google.com
2. Clique em **"Adicionar projeto"**
3. Dê um nome (ex: "barbershop-saas")
4. Desabilite Google Analytics (opcional)
5. Clique em **"Criar projeto"**

### 2️⃣ Ative os Serviços

#### Authentication:

1. No menu lateral, clique em **"Authentication"**
2. Clique em **"Começar"**
3. Na aba **"Sign-in method"**, ative **"E-mail/senha"**
4. Salve

#### Realtime Database:

1. No menu lateral, clique em **"Realtime Database"**
2. Clique em **"Criar banco de dados"**
3. Escolha a localização: **"United States (us-central1)"**
4. Modo: **"Iniciar no modo de teste"**
5. Clique em **"Ativar"**

### 3️⃣ Configure as Regras de Segurança

Na aba **"Regras"** do Realtime Database, cole:

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

Clique em **"Publicar"**.

### 4️⃣ Importe os Dados de Exemplo

1. Na aba **"Dados"** do Realtime Database
2. Clique no **ícone de três pontos** (⋮) ao lado da raiz
3. Selecione **"Importar JSON"**
4. Escolha o arquivo: **`firebase-example-data.json`**
5. Clique em **"Importar"**

✅ Agora você tem **3 barbearias** com serviços, barbeiros e horários configurados!

### 5️⃣ Crie o Usuário Administrador

Na seção **"Authentication > Users"**:

1. Clique em **"Adicionar usuário"**
2. Email: `admin@barbershop.com`
3. Senha: `admin123` (ou outra de sua escolha)
4. Clique em **"Adicionar usuário"**
5. ⚠️ **COPIE O UID** gerado (ex: `abc123xyz789`)

### 6️⃣ Atualize o UID no Realtime Database

1. Volte para **Realtime Database > Dados**
2. Expanda: `users`
3. Clique no nome da chave `SUBSTITUA_PELO_UID_DO_USUARIO_MASTER`
4. Cole o UID que você copiou
5. Pressione Enter

✅ Pronto! Agora você tem um usuário MASTER que controla todas as 3 barbearias!

### 7️⃣ Execute o Projeto

Abra o PowerShell nesta pasta e execute:

```powershell
# Opção 1: Python (se tiver instalado)
python -m http.server 8000

# Opção 2: Node.js (se tiver instalado)
npx http-server -p 8000

# Opção 3: PHP (se tiver instalado)
php -S localhost:8000
```

Acesse no navegador: **http://localhost:8000/public/**

## 🎉 Pronto! Agora você pode testar:

### 👥 Como Cliente:

1. Acesse: `http://localhost:8000/public/`
2. Veja as **3 barbearias** disponíveis
3. Clique em qualquer uma
4. Escolha serviço, data (hoje ou amanhã), barbeiro e horário
5. Preencha seus dados e confirme

### 🔐 Como Administrador:

1. Acesse: `http://localhost:8000/public/admin.html`
2. Faça login:
   - Email: `admin@barbershop.com`
   - Senha: `admin123` (ou a que você definiu)
3. Veja a **agenda do dia** com agendamentos de todas as barbearias
4. Confirme ou cancele agendamentos
5. Gerencie todas as 3 barbearias

## 📊 Dados de Exemplo Incluídos

### 🏪 Barber Centro

- **4 serviços**: Corte (R$ 35), Barba (R$ 25), Corte+Barba (R$ 50), Sobrancelha (R$ 15)
- **3 barbeiros**: João Silva, Pedro Santos, Carlos Oliveira
- **Horários**: Segunda a sexta 9h-18h, Sábado 8h-13h

### 🏪 Barber Vila Nova

- **4 serviços**: Corte Social (R$ 40), Degradê (R$ 45), Barba (R$ 30), Pacote Premium (R$ 65)
- **2 barbeiros**: Roberto Lima, Marcos Ferreira
- **Horários**: Segunda a sexta 8h-17h, Sábado 7h-12h

### 🏪 Elite Barbershop

- **4 serviços**: Corte Premium (R$ 60), Barba Luxury (R$ 45), Tratamento (R$ 80), VIP (R$ 120)
- **1 barbeiro**: André Costa
- **Horários**: Segunda a sexta 10h-19h, Sábado 9h-15h

### 📅 Agendamentos de Exemplo

Já inclusos **3 agendamentos** para hoje (14/02/2026) e 1 para amanhã para você testar a agenda!

## ❓ Problemas Comuns

**Erro: "Module not found"**

- Certifique-se de estar usando um servidor web (não abra o HTML diretamente)

**Erro ao carregar dados**

- Verifique se o `firebaseConfig` em `js/firebase.js` está correto
- Verifique se as regras do Realtime Database foram publicadas

**Não consigo fazer login**

- Verifique se criou os usuários no Authentication
- Confira se a senha está correta

**Página em branco**

- Abra o Console do navegador (F12) e veja os erros
- Verifique se o servidor está rodando

## 🎯 Próximos Passos

Agora que está funcionando:

- ✅ Teste fazer um agendamento como cliente
- ✅ Faça login como admin e gerencie agendamentos
- ✅ Explore o código e personalize conforme necessário
- ✅ Adicione novas barbearias, serviços e barbeiros

---

**Qualquer dúvida, verifique o console do navegador (F12) para ver mensagens de erro detalhadas!**
