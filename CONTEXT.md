# Glossario de Dominio - MyFetus

Este documento define a Linguagem Ubiqua e os conceitos de dominio utilizados no projeto MyFetus. O vocabulario aqui definido deve ser adotado de forma estrita em codigo, testes, interfaces e documentacoes tecnicas.

---

### Entidades e Papeis Principais

- **Usuario (`User`)**: Entidade cadastral e de controle de acesso ao sistema, autenticada via credenciais protegidas e associada a um perfil de permissao especifico (`gestante`, `medico`, `admin`).
- **Gestante (`Pregnant`)**: Mulher em periodo gestacional acompanhada clinicamente pela solucao. Possui perfil clinico detalhado (biometria, historico obstetrico, antecedentes) e interage com o aplicativo mobile.
- **Medico (`Doctor`)**: Profissional de medicina obstetrica habilitado por registro profissional (CRM e UF), responsavel pela avaliacao clinica, solicitacao e revisao de exames e acompanhamento das pacientes vinculadas.
- **Vinculo Medico-Gestante (`DoctorPatientLink`)**: Relacionamento formal e autorizado que permite ao medico visualizar e interagir com o prontuario de uma gestante especifica.

---

### Conceitos Clinicos e Acompanhamento

- **Gestacao (`Pregnancy`)**: Episodio gestacional individual, demarcado clinicamente pela Data da Ultima Menstruacao (DUM), Data Provavel do Parto (DPP) e Idade Gestacional (IG) calculada em semanas.
- **Prontuario Pre-Natal**: Conjunto estruturado e confidencial de dados clinicos da gestante, abrangendo antecedentes familiares, condicoes pre-existentes, sinais vitais, ganho ponderal e registro de imunizacao.
- **Diario da Gestante (`DailyEntry`)**: Registro cotidiano realizado pela propria gestante sobre sintomas vivenciados, consumo de agua, afericoes e movimentos fetais.
- **Alerta Semaforico (`ClinicalAlert`)**: Classificacao de risco materno-fetal calculada a partir de regras clinicas baseadas em evidencias (Ministerio da Saude e FEBRASGO), estratificada em:
  - **Verde**: Parametro habitual / risco habitual.
  - **Amarelo**: Sinal de atencao / risco intermediario que requer monitoramento.
  - **Vermelho**: Alerta critico / alto risco que demanda intervencao medica imediata.

---

### Exames e Suporte a Decisao

- **Documento de Exame (`PregnantDocument`)**: Arquivo digital (PDF ou imagem) contendo laudo ou resultado de exame laboratorial/ultrassonografico submetido para processamento.
- **Resultado Estruturado (`LabResult`)**: Dado clinico parametrizado e extraido do documento, composto por analito, valor obtido, unidade de medida, intervalo de referencia e codificacao LOINC correspondente.
- **Revisao Medica de Exame**: Ato clinico pelo qual o medico valida, ajusta ou rejeita valores extraidos automaticamente antes de serem consolidados no prontuario e no motor de risco.
- **Devolutiva do Exame**: Parecer sintetico emitido pelo medico a respeito do exame analisado, disponibilizado para ciencia da gestante no aplicativo.
- **Chat Clinico (RAG)**: Ferramenta de apoio a decisao voltada a profissionais de saude, respondendo a consultas clinicas exclusivamente com base em diretrizes oficiais indexadas e citando trechos das fontes.
