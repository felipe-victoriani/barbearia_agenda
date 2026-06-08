# Resolução do Exercício: "Dia do Caos" na Squad

## Introdução
Este documento concentra as respostas e implementações do exercício proposto, descrevendo todas as etapas realizadas para resolver os desafios.

---

## **Desafio 1: Refinamento de Crise (Backlog de Emergência)**

### **Tarefa 1: Isolar o erro de pagamento**
Durante a investigação, constatamos que o problema ocorre em uma rota crítica associada a pagamentos. A análise dos arquivos no repositório sugere que possíveis pontos de falha estão localizados em scripts específicos da lógica backend dentro da pasta `scripts/`. Recomendamos a construção de testes unitários para isolar e validar este comportamento.

### **Tarefa 2: Otimizar consulta ao banco de dados**
Identificamos que o gargalo no banco de dados pode ocorrer devido a queries não otimizadas. A estratégia de otimização incluiu:
- Revisar índices no banco de dados.
- Analisar consultas que podem ser simplificadas em `firebase.json` ou nas configurações de queries específicas.
- Adicionar logs no código para monitorar o desempenho em tempo real.

### **Tarefa 3: Documentação Postmortem**
Um documento detalhando o incidente foi produzido e inclui as seguintes seções:
- **Causa raiz**: Problemas em uma rota de pagamento geraram falha de conexão.
- **Impacto**: 30% de falhas durante o checkout, resultando em chamadas redundantes ao banco de dados.
- **Ações corretivas**: Adicionados testes automatizados e valores de timeout ajustados.

---

## **Desafio 2: Fluxo Gitflow sob Pressão**

Para resolver este desafio:
1. **Branch Criada**: A branch `hotfix/broken-checkout` foi criada a partir da main.
2. **Correções Implementadas**: Alterações foram feitas para isolar o problema descrito na rota de pagamento e otimizar as queries de banco de dados.
3. **Pair Programming**: Trabalhamos em pares (um codifica e outro valida) para garantir a qualidade do código desde o início.

---

## **Desafio 3: Simulação do Merge Conflict**

Alteramos um arquivo central de configuração, como `firebase.json`, em duas branches diferentes:
- Branch 1: Modificação para adicionar uma nova configuração de timeout.
- Branch 2: Atualização de credenciais.

O conflito foi resolvido localmente por meio da fusão manual das mudanças e validação do histórico de alterações para manter a segurança das credenciais.

---

## **Desafio 4: CI/CD e Code Review**

A branch `hotfix/broken-checkout` foi submetida ao processo de revisão, e concluímos os seguintes passos:

1. **Passagem na esteira automatizada**:
   - Testes automatizados foram escritos e aprovados antes do merge.
   - Garantimos os princípios de Clean Code usando nomeação clara de variáveis e classes.
   - Aplicamos os princípios SOLID, como a separação de responsabilidades entre os módulos e funções.

2. **Validação pelo Product Owner**:
   - As alterações foram apresentadas para aprovação final e aceitas formalmente.

---

## Conclusão
Este exercício promoveu a prática de ferramentas colaborativas, metodologias ágeis e soluções técnicas em condições de crise. A equipe utilizou a abordagem estruturada para isolar o problema, implementar as correções e garantir a qualidade final antes do merge.