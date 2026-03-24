# KICK-OFF — SAAS BARBEARIA

**Data:** 16 de março de 2026

---

## O QUE É O PROJETO

Sistema **SaaS multi-tenant de agendamento online para barbearias**. Clientes agendam horários pelo navegador ou pelo app instalado no celular (PWA). Donos de barbearia gerenciam tudo via painel administrativo.

---

## STACK TECNOLÓGICA

| Camada         | Tecnologia                           |
| -------------- | ------------------------------------ |
| Frontend       | HTML5 + JavaScript puro (ES Modules) |
| CSS            | Tailwind CSS (CDN)                   |
| Reatividade    | Alpine.js                            |
| Banco de dados | Firebase Realtime Database           |
| Autenticação   | Firebase Authentication              |
| Hospedagem     | Firebase Hosting                     |
| Mobile         | PWA (Service Worker + Manifest)      |
| Notificação    | WhatsApp Web (`wa.me`)               |

---

## FUNCIONALIDADES EXISTENTES

### Para clientes

- Listagem de barbearias ativas
- Fluxo de agendamento em 5 etapas (serviço → data → barbeiro → horário → dados)
- Anti-double-booking com transação atômica no Firebase
- Confirmação automática via WhatsApp Web
- Instalável no celular como app (PWA)

### Para administradores

- Login com roles (`ADMIN` / `MASTER`)
- Agenda do dia, CRUD de barbearias, serviços, barbeiros e horários
- Gestão financeira com relatórios
- Ações nos agendamentos: confirmar, cancelar, concluir, registrar no-show

---

## STATUS ATUAL

O projeto está marcado como **PRODUCTION READY** (14/02/2026) com todos os bloqueadores críticos resolvidos.

Firebase já está configurado com projeto real:

- **Projeto:** `barbearia-agenda-7b0da`
- **Database:** `https://barbearia-agenda-7b0da-default-rtdb.firebaseio.com`
- **Auth domain:** `barbearia-agenda-7b0da.firebaseapp.com`

---

## RISCOS IDENTIFICADOS

| #   | Risco                                                               | Severidade |
| --- | ------------------------------------------------------------------- | ---------- |
| 1   | Regras de segurança permissivas no banco (`.read: true` global)     | **ALTA**   |
| 2   | Regras de produção (`database.rules.production.json`) não aplicadas | **ALTA**   |
| 3   | Sem testes automatizados (apenas testes manuais em `/tests/`)       | MÉDIA      |
| 4   | Sem sistema de pagamento integrado                                  | MÉDIA      |
| 5   | Sem painel para o cliente acompanhar seus agendamentos              | BAIXA      |

---

## PRÓXIMOS PASSOS SUGERIDOS

1. **Aplicar as regras de produção** no Firebase antes de qualquer uso real
2. **Definir modelo de negócio** — freemium? cobranças por barbearia? por agendamento?
3. **Validar com barbearias reais** — teste piloto com 1-2 estabelecimentos
4. **Decidir backlog da v1.1** — pagamento online, área do cliente, notificações push
