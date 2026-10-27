# MyFetus

Plataforma de acompanhamento gestacional conectando gestantes e médicos com monitoramento clínico, telemedicina e apoio à decisão.

## Operação e Observabilidade

**Liveness Probe**:
Checagem leve que valida exclusivamente se o processo HTTP do backend está em execução e respondendo requisições, sem consultar serviços externos.
_Avoid_: Healthcheck genérico, Ping clínico

**Readiness Probe**:
Checagem ativa com timeout das dependências necessárias para operação (banco de dados), determinando se a instância pode receber tráfego de produção/homologação.
_Avoid_: Uptime check raso

**Degradação Graciosa**:
Capacidade do sistema de preservar a disponibilidade (HTTP 200) das rotas clínicas e cadastrais essenciais quando serviços secundários (como Pinecone para busca vetorial) estão temporariamente inoperantes.
_Avoid_: Indisponibilidade total

**Registro Estruturado**:
Emissão de linhas de log exclusivamente no formato JSON padronizado (NDJSON), contendo nível, carimbo de tempo, mensagem e metadados sanitizados.
_Avoid_: Log textual puro, console.log livre

## Apoio à Decisão Clínica e Risco

**Alerta de Triagem Obstétrica**:
Sinalização automatizada de estratificação de risco (verde, amarelo ou vermelho) baseada em parâmetros clínicos e limiares normativos, destinada a chamar a atenção do profissional de saúde e orientar a gestante.
_Avoid_: Diagnóstico, Laudo automatizado, Parecer definitivo

**Diagnóstico Clínico**:
Ato médico privativo de identificação de patologias e definição de condutas terapêuticas, baseado na anamnese, exame físico e julgamento profissional.
_Avoid_: Classificação automática de doença, Veredito do sistema

