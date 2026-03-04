# Alpine.js + Tailwind CSS — Implementação

> Documentação técnica da camada de UI do SaaS Barbearia.

---

## Visão Geral

O projeto utiliza **Alpine.js 3.14.3** para reatividade declarativa e **Tailwind CSS** para estilização. Ambos são carregados via CDN, sem etapa de build. A arquitetura preserva todos os módulos JS (`appointments.js`, `admin.js`, `barbershops.js`, etc.) intactos — Alpine e Tailwind atuam apenas na camada de apresentação.

---

## CDNs Utilizadas

```html
<!-- Tailwind CSS — carrega antes do conteúdo -->
<script src="https://cdn.tailwindcss.com"></script>

<!-- Alpine.js — DEVE ser carregado com defer APÓS os scripts de módulo -->
<script
  defer
  src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"
></script>
```

> ⚠️ **Ordem importa:** O Alpine deve ser carregado _depois_ dos `<script type="module">` que expõem as funções via `window`. O atributo `defer` garante que o Alpine só inicializa após o DOM estar pronto e os módulos registrados.

---

## Configuração do Tailwind

Aplicada no `index.html` via objeto `tailwind.config` antes do conteúdo da página:

```html
<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          gold: { DEFAULT: "#ffd700", dark: "#ffc107" },
        },
        boxShadow: {
          gold: "0 4px 20px rgba(255,215,0,0.25)",
        },
      },
    },
  };
</script>
```

Isso adiciona a classe `text-gold`, `bg-gold`, `border-gold`, `shadow-gold` além das nativas do Tailwind.

**Tema padrão do projeto:**

| Elemento         | Classe Tailwind           | Valor      |
| ---------------- | ------------------------- | ---------- |
| Fundo            | `bg-black`                | `#000000`  |
| Texto principal  | `text-yellow-400`         | `#ffd700`  |
| Texto secundário | `text-yellow-500/600`     | `#ecc94b…` |
| Cards            | `bg-zinc-900`             | `#18181b`  |
| Bordas           | `border-zinc-700`         | `#3f3f46`  |
| Hover borda      | `hover:border-yellow-400` | `#ffd700`  |

---

## Padrão de Integração Alpine + ES Modules

O Alpine não consegue importar módulos ES nativamente. O padrão adotado é **expor funções via `window`** dentro de um `<script type="module">`, antes do CDN do Alpine:

```html
<!-- 1. Script de módulo: importa lógica e expõe para Alpine -->
<script type="module">
  import { minhaFuncao } from "./js/modulo.js";

  window.meuComponente = () => ({
    // estado reativo
    loading: true,
    dados: [],
    erro: null,

    // inicialização automática pelo Alpine
    async init() {
      try {
        this.dados = await minhaFuncao();
      } catch (e) {
        this.erro = e.message;
      } finally {
        this.loading = false;
      }
    },

    // métodos chamados pelo HTML
    acao() {
      /* ... */
    },
  });
</script>

<!-- 2. Alpine CDN: carrega depois, já encontra window.meuComponente -->
<script
  defer
  src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"
></script>
```

```html
<!-- 3. HTML usa x-data apontando para a função window -->
<div x-data="meuComponente()">...</div>
```

---

## Diretivas Alpine Utilizadas

| Diretiva       | Onde é usada                          | Descrição                                 |
| -------------- | ------------------------------------- | ----------------------------------------- |
| `x-data`       | elemento raiz de cada página          | Inicializa o componente Alpine            |
| `x-show`       | loading, erro, lista vazia            | Mostra/oculta elemento sem remover do DOM |
| `x-text`       | textos dinâmicos (nome, contagem)     | Define `innerText` de forma reativa       |
| `x-for`        | grid de barbearias, lista de detalhes | Renderiza lista de items                  |
| `x-transition` | transições de show/hide               | Adiciona fade automático                  |
| `@click`       | cards de barbearia, botões            | Event listener inline                     |
| `:key`         | dentro de `x-for`                     | Chave única para reconciliação de lista   |
| `:class`       | classes condicionais                  | Bind dinâmico de classes CSS              |

---

## Páginas e Seus Componentes

### `index.html` — Listagem de Barbearias

**Componente:** `window.barbershopsPage`

```javascript
window.barbershopsPage = () => ({
  loading: true,
  shops: [], // array de barbearias
  error: null,

  async init() {
    const data = await getAllBarbershops(); // de barbershops.js
    this.shops = Object.entries(data)
      .filter(([_, d]) => d.active !== false)
      .map(([id, d]) => ({ id, ...d }));
    this.loading = false;
  },

  goto(id) {
    window.location.href = `shop.html?slug=${id}`;
  },

  countItems(obj, label) {
    const n = obj ? Object.keys(obj).length : 0;
    return `${n} ${label}${n !== 1 ? "s" : ""}`;
  },
});
```

**Estados de UI:**

- `loading === true` → spinner Tailwind (`animate-spin border-t-yellow-400`)
- `error !== null` → mensagem de erro em `text-red-400`
- `shops.length === 0` → estado vazio com emoji
- `shops.length > 0` → grid `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`

**Estrutura do card** (renderizado via `x-for`):

```html
<template x-for="shop in shops" :key="shop.id">
  <div
    @click="goto(shop.id)"
    class="bg-zinc-900 rounded-xl p-6 border-2 border-zinc-700
              hover:border-yellow-400 cursor-pointer transition-all
              hover:-translate-y-1"
  >
    <h3 x-text="shop.name"></h3>
    <span x-text="countItems(shop.services, 'serviço')"></span>
  </div>
</template>
```

---

### `confirmacao.html` — Confirmação de Agendamento

**Componente:** `window.confirmacaoPage`

Não usa módulos externos — toda lógica é inline. Lê `sessionStorage` para exibir os detalhes do agendamento.

```javascript
window.confirmacaoPage = () => ({
  detalhes: [],

  init() {
    const raw = sessionStorage.getItem("lastAppointment");
    if (!raw) {
      window.location.href = "index.html";
      return;
    }

    const appt = JSON.parse(raw);
    this.detalhes = [
      { label: "Barbearia", value: appt.shopName },
      { label: "Serviços", value: appt.services },
      { label: "Barbeiro", value: appt.barberName },
      { label: "Data", value: appt.date },
      { label: "Horário", value: appt.time },
      { label: "Total", value: appt.totalPrice },
    ];
  },
});
```

Lista renderizada via `x-for` sobre `detalhes`:

```html
<template x-for="item in detalhes" :key="item.label">
  <div class="flex justify-between py-3 border-b border-zinc-700 last:border-0">
    <span x-text="item.label" class="text-yellow-600 font-medium"></span>
    <span
      x-text="item.value"
      class="text-yellow-400 font-bold text-right"
    ></span>
  </div>
</template>
```

---

### `initialize.html` — Inicialização do Sistema

**Componente:** `window.initPage`

```javascript
window.initPage = () => ({
  status: "loading", // 'loading' | 'success' | 'error'
  errorMsg: "",

  async init() {
    try {
      await initializeDefaultUsers(); // de initialize.js
      this.status = "success";
    } catch (e) {
      this.status = "error";
      this.errorMsg = e.message;
    }
  },
});
```

Usa `:class` para alternar ícones e cores conforme `status`:

```html
<p
  :class="status === 'success' ? 'text-green-400' : 'text-red-400'"
  x-text="status === 'success' ? '✅ Sistema inicializado!' : '❌ ' + errorMsg"
></p>
```

---

### `shop.html` — Agendamento (sem Alpine)

Esta página **não usa Alpine.js**. O módulo `appointments.js` (627 linhas) gerencia todo o DOM imperativo via IDs. O Tailwind foi aplicado apenas na estrutura estática (header, seções, inputs).

IDs obrigatórios que `appointments.js` controla:

| ID                   | Elemento                        |
| -------------------- | ------------------------------- |
| `#loading`           | spinner inicial                 |
| `#booking-container` | container principal (show/hide) |
| `#shop-name`         | título da barbearia             |
| `#services-list`     | lista de serviços               |
| `#date-picker`       | input de data                   |
| `#barbers-list`      | lista de barbeiros              |
| `#slots-loading`     | spinner de horários             |
| `#slots-list`        | grade de horários               |
| `#booking-form`      | formulário de dados             |
| `#client-name`       | nome do cliente                 |
| `#client-phone`      | telefone do cliente             |
| `#submit-btn`        | botão de confirmar              |

---

### `admin.html` — Painel Administrativo (sem Alpine)

Também **não usa Alpine.js**. O módulo `admin.js` (2209 linhas) controla todo o painel. Tailwind foi aplicado nos elementos estáticos: tela de login, header, botão de logout, selects de filtro.

---

## Coexistência com `style.css`

O `style.css` foi mantido para estilos de elementos **gerados dinamicamente pelo JS**, que não podem usar classes Tailwind diretamente:

**Mantidos no CSS** (criados por `innerHTML` nos módulos JS):

- `.service-item`, `.barber-item`, `.slot-item` — itens do fluxo de agendamento
- `.admin-card`, `.card-header`, `.card-body`, `.card-actions` — cards do painel
- `.admin-section`, `.nav-item.active`, `.section-header` — estrutura do admin
- `.status-active`, `.status-inactive` — badges de status
- `.appointment-card`, `.agenda-*` — agenda do dia
- `.modal`, `.modal-content`, `.modal-close` — modal genérico
- `.btn`, `.btn-primary`, `.btn-secondary`, `.btn-danger` — botões nos modais
- `.settings-*`, `.weekday-setting` — configurações de disponibilidade
- `.slots-list`, `.barbers-list`, `.services-list` — contêineres de listas
- `:root` com variáveis CSS (`--primary`, `--bg`, `--card-bg`, etc.)
- `@keyframes spin` — animação de loading

**Removidos do CSS** (migrados para Tailwind):

- `.hero-section`, `.header`, `.header-content`, `.logo-section`
- `.barbershop-card`, `.barbershops-grid`
- `.booking-section`, `.booking-container`
- `.back-link`, `.footer`, `.footer-links`
- `.credentials-box`, `.footer-link`
- Media queries correspondentes a esses elementos

---

## Spinner de Loading

Padrão Tailwind usado nas páginas com Alpine:

```html
<div
  class="w-12 h-12 border-4 border-zinc-700 border-t-yellow-400 rounded-full animate-spin mb-4"
></div>
```

- `border-4` + `rounded-full` → círculo
- `border-zinc-700` → cor de fundo do círculo
- `border-t-yellow-400` → arco dourado girando
- `animate-spin` → rotação contínua via Tailwind

---

## Variáveis CSS vs Classes Tailwind

Os módulos JS usam variáveis CSS do `:root` ao gerar HTML dinâmico:

```css
:root {
  --primary: #ffd700; /* = yellow-400 */
  --bg: #000000; /* = black      */
  --card-bg: #1a1a1a; /* ≈ zinc-900   */
  --border: #333333; /* ≈ zinc-700   */
  --danger: #ff6b6b; /* ≈ red-400    */
}
```

O HTML estático usa as equivalentes Tailwind diretamente. Os dois sistemas coexistem sem conflito pois atendem partes diferentes do DOM.

---

## Guia Rápido — Adicionar Nova Página com Alpine

1. Adicionar CDNs no `<head>`:

```html
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="css/style.css" />
```

2. No `<body>`, criar o elemento raiz:

```html
<div x-data="nomeDaPagina()">
  <!-- conteúdo reativo aqui -->
</div>
```

3. Antes do Alpine CDN, expor o componente:

```html
<script type="module">
  import { funcao } from "./js/modulo.js";

  window.nomeDaPagina = () => ({
    loading: true,
    dados: [],

    async init() {
      this.dados = await funcao();
      this.loading = false;
    },
  });
</script>

<!-- Alpine SEMPRE por último, com defer -->
<script
  defer
  src="https://cdn.jsdelivr.net/npm/alpinejs@3.14.3/dist/cdn.min.js"
></script>
```
