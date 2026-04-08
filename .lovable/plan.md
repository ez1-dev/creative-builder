

# Autocomplete no campo "Código Modelo" da página BOM

## O que muda para o usuário
Ao digitar no campo "Código Modelo", o sistema buscará sugestões na API ERP em tempo real, mostrando uma lista suspensa com os códigos e descrições dos modelos que correspondem ao texto digitado.

## Implementação técnica

### 1. Criar endpoint de busca de modelos (verificar API)
O sistema já usa a API ERP (`/api/bom`). Será necessário consumir um endpoint de busca de modelos (ex: `/api/modelos` ou `/api/produtos?tipo=modelo`) que aceite um parâmetro de busca parcial. Se o endpoint não existir na API ERP, o ComboboxFilter será usado com digitação livre (sem sugestões automáticas da API).

### 2. Substituir `Input` por `ComboboxFilter` no campo Código Modelo (`src/pages/BomPage.tsx`)
- Trocar o `<Input>` do campo "Código Modelo" pelo componente `ComboboxFilter` já existente no projeto
- O `ComboboxFilter` já suporta digitação livre + seleção em dropdown
- Criar um hook ou estado local que faça fetch debounced para buscar modelos conforme o usuário digita (ex: chamando `/api/modelos?search=XXX`)
- Passar as opções retornadas como `options` do `ComboboxFilter`

### 3. Adicionar busca debounced de modelos
- No `BomPage.tsx`, adicionar estado para `modeloOptions` e `modeloLoading`
- Usar `useEffect` com debounce (300ms) no valor do filtro `codmod` para buscar sugestões via `api.get('/api/modelos', { search: codmod })`
- Mapear o retorno para o formato `ComboboxOption[]` (`{ value, label }`)

### Arquivos afetados
- `src/pages/BomPage.tsx` — substituir Input por ComboboxFilter + lógica de busca debounced

