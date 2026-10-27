# Política de Degradação Graciosa no Readiness Probe

Decidimos que o endpoint `GET /health` deve tratar o PostgreSQL como dependência bloqueante (retornando HTTP 503 quando indisponível) e o Pinecone (banco vetorial de diretrizes) como dependência não-bloqueante (retornando HTTP 200 com `status: "degraded"` quando indisponível ou não configurado).

O PostgreSQL é indispensável para autenticação, prontuários e registros clínicos fundamentais; sem ele, a aplicação não consegue operar. O Pinecone atende apenas a camada de apoio à decisão clínica via RAG; se a busca vetorial falhar temporariamente ou a chave de API não estiver provisionada em homologação, o sistema deve continuar operando para os fluxos clínicos essenciais sem disparar reinicializações desnecessárias de containers ou alarmes falsos de indisponibilidade total no Cloud Run e nos monitores de uptime.
