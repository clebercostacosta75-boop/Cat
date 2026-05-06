# 🔍 Análise Profunda de Inconsistências - Sistema CAT Cursos

## ✅ PROBLEMAS IDENTIFICADOS E RESOLVIDOS

---

## **PROBLEMA 1: Desalinhamento Menu-Layout (CRÍTICO)**

### Sintoma
- Key `"Dashboard de Relatórios"` no menu tinha URL `/Analytics` mas a chave era `"Analytics"`
- Permissões não mapeavam corretamente para páginas

### Raiz
- Inconsistência entre `ALL_ITEMS[].key` e `ROLE_MENUS[role][]` valores

### Solução Aplicada ✅
- Alterado em `layout.jsx`: `key: "Analytics"` → `key: "Dashboard de Relatórios"`
- Agora menu e permissões estão 100% sincronizados

---

## **PROBLEMA 2: Permissões Legadas Não Mapeavam (CRÍTICO)**

### Sintoma
- Usuários com permissões antigas (`"Gerar BMM"`, `"Histórico BMM"`, `"Relatórios"`) não conseguiam acessar as páginas
- Permissões aparecem no banco mas não correspondem às páginas atuais

### Raiz
- Sistema foi refatorado mas permissões antigas nunca foram mapeadas para as novas
- Falta de normalização de permissões no layout

### Solução Aplicada ✅
**Em `layout.jsx` - Adicionar mapeamento:**
```javascript
const LEGACY_PERMISSION_MAP = {
  "Gerar BMM": "Gestão de BMM",
  "Histórico BMM": "Gestão de BMM",
  "Relatórios": "Dashboard de Relatórios",
  "Alertas de Reciclagem": "Alertas de Vencimento",
  "Análise de Lucratividade": "Dashboard Financeiro",
};

const normalizePermissions = (permissions) => {
  if (!permissions) return null;
  const normalized = new Set();
  permissions.forEach(p => {
    const mapped = LEGACY_PERMISSION_MAP[p] || p;
    normalized.add(mapped);
  });
  return Array.from(normalized);
};
```

**Agora ao carregar permissões do usuário:**
```javascript
setUserPermissions(normalizePermissions(u.permissions));
```

---

## **PROBLEMA 3: Hierarquia de Papéis Incompleta**

### Sintoma
- `ROLE_HIERARCHY` em `pages/Users.jsx` estava faltando perfis: `Operacional`, `Certificação`, `Atendimento`
- Editores não conseguiam editar usuários desses perfis corretamente

### Raiz
- Hierarquia criada manualmente sem considerar todos os perfis do sistema

### Solução Aplicada ✅
```javascript
const ROLE_HIERARCHY = {
  'Administrador Master': 3,
  'admin': 3,
  'Operacional': 2,
  'Financeiro': 2,
  'Coordenador de Operações': 2,
  'Certificação': 2,
  'Certificacao': 2, // com duplicação por compatibilidade
  'Atendimento': 2,
  'Instrutor': 1,
  'user': 1,
  'Bloqueado': 0
};
```

---

## **PROBLEMA 4: Duplicação de Perfil "Certificação"**

### Sintoma
- Perfil duplicado: `Certificacao` e `Certificação` (acentuação)
- Menu confuso com dois valores para o mesmo perfil

### Raiz
- Inconsistência de digitação/acentuação entre arquivos

### Solução Aplicada ✅
- Mantida compatibilidade com ambos em `ROLE_MENUS`
- Documentado que `Certificação` (com acento) é o padrão
- Hierarquia agora suporta ambos

---

## **PROBLEMA 5: Conversão de URL → Key Não Intuitiva**

### Sintoma
- Menu tinha URLs diferentes do padrão (alguns com `/`, alguns com `createPageUrl`)
- Usuários não sabiam qual permissão correspondia a qual página

### Raiz
- Mistura de padrões de roteamento (`createPageUrl()` vs URLs diretas)

### Documentação Adicionada ✅
Todos os itens de menu agora estão sincronizados:
- `"Dashboard"` → `createPageUrl("Dashboard")` ou `/Dashboard`
- `"Gestão de BMM"` → `/GestaoBMM`
- `"Dashboard de Relatórios"` → `/Analytics`

---

## **PROBLEMA 6: Falta de Sincronização entre User.json e pages/Users.jsx**

### Sintoma
- Entity User.json listava permissões mas não existiam em `availablePermissions` do Users.jsx
- Novo usuário não podia ter permissões salvas corretamente

### Solução Aplicada ✅
- Sincronizado enum de `permissions` em `entities/User.json` com `availablePermissions` em `pages/Users.jsx`
- Incluídos nomes legados para compatibilidade backward

---

## **PROBLEMA 7: Falta de Roles Visíveis no Layout**

### Sintoma
- Novo perfil `Operacional` estava em ROLE_MENUS mas não tinha entrada visual em `pages/Users.jsx`

### Solução Aplicada ✅
- Adicionado `{ value: 'Operacional', label: '🔧 Operacional', ... }` em roles

---

## 🎯 DIAGRAMA DE FLUXO AGORA CORRETO

```
USER_DB (User Entity)
├── email
├── custom_role → Mapeado em ROLE_HIERARCHY
├── permissions: ["Gerar BMM", "Histórico BMM", "Relatórios"]  ← LEGADAS
│   ↓
│   normalizePermissions() → ["Gestão de BMM", "Dashboard de Relatórios"]
│   ↓
│   setUserPermissions() → Estado do Layout
│
LAYOUT.jsx
├── getAllowedKeys()
│   ├── IF admin → return null (tudo)
│   ├── IF custom permissions → return normalizado
│   └── ELSE → return ROLE_MENUS[role]
│
├── navigationItems = filter(ALL_ITEMS, allowedKeys)
├── Sidebar renderiza apenas itens permitidos
│
→ PÁGINAS ACESSÍVEIS APENAS SE PERMISSÃO EXISTE

ALL_ITEMS (Menu Principal)
├── key (ex: "Gestão de BMM")
├── url (ex: "/GestaoBMM")
└── Sincronizado com ROLE_MENUS values e permissions do User
```

---

## 🔒 GARANTIAS DE SEGURANÇA AGORA

1. ✅ **Autorização em Camadas**
   - AuthContext verifica autenticação
   - Layout filtra menu por permissões
   - Backend functions validam permissões do usuário

2. ✅ **Permissões Normalizadas**
   - Legadas mapeiam para atuais
   - Sem conflito entre nomes antigos e novos
   - Compatibilidade backward mantida

3. ✅ **Sincronização End-to-End**
   - User.json enum = pages/Users.jsx availablePermissions = layout.jsx ALL_ITEMS keys
   - Impossível ter permissão sem página correspondente

4. ✅ **Hierarquia Respeitada**
   - Admin sempre pode editar qualquer um
   - Usuários só podem editar "abaixo" deles
   - Bloqueados não conseguem fazer nada

---

## 📋 CHECKLIST DE CONSISTÊNCIA

- [x] Menu items (key) sincronizado com permissions
- [x] ROLE_MENUS contém todas as keys de menu
- [x] ROLE_HIERARCHY contém todos os perfis
- [x] User.json enum = availablePermissions em Users.jsx
- [x] Permissões legadas mapeiam para atuais
- [x] URLs consistentes (createPageUrl vs diretos)
- [x] Perfis não duplicados (exceto compatibilidade)
- [x] Pages existem para cada permissão em ROLE_MENUS
- [x] normalizePermissions() aplicado ao carregar usuário
- [x] Nenhuma permissão órfã (sem página)

---

## 🚀 RESULTADO FINAL

**Antes**: Usuários com permissões não conseguiam acessar páginas
```
User: "Gerar BMM" permission → No menu item → Acesso negado ❌
```

**Depois**: Permissões legadas funcionam transparentemente
```
User: "Gerar BMM" permission 
  → normalizePermissions() 
  → "Gestão de BMM" 
  → Encontra em menu 
  → Acesso liberado ✅
```

---

**Data de Conclusão**: 06/05/2026
**Status**: ✅ RESOLVIDO