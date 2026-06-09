# VISION

VISION e um Centro de Comando Operacional: um digital twin navegavel para acompanhar ativos, pessoas, equipamentos, riscos e movimentacoes em tempo real.

## Como executar

```bash
npm run dev
```

Depois abra:

```text
http://127.0.0.1:4173
```

Tambem e possivel abrir `index.html` diretamente no navegador.

## MVP funcional

- Mapa operacional como tela principal
- Objetos visuais clicaveis: containers, equipamentos, veiculos, pessoas, portoes e sensores
- Busca global por ativo, area e destino
- Camadas por tipo de objeto operacional
- Painel de detalhes com local, responsavel, destino, coordenadas e dimensoes
- Movimentacao de ativo com atualizacao do mapa e da cadeia de custodia
- Indicadores de torre de controle
- Replay operacional por faixa de hora
- Layout responsivo para desktop e telas menores

## Proximo passo recomendado

Migrar este prototipo para a arquitetura enterprise planejada:

- Frontend: Next.js, React, TypeScript
- Backend: NestJS
- Banco: PostgreSQL + Prisma
- Tempo real: Socket.IO
- Cache: Redis
- Event sourcing para movimentacoes criticas
- Vision Spatial Engine como modulo proprio
