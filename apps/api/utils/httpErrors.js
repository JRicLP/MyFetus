// Resposta padrão para falhas internas: nunca expõe err.message, stack ou dados do banco.
// O detalhe técnico deve ir apenas para o logger sanitizado.
function sendInternalError(res) {
  return res.status(500).json({ error: 'internal_error' });
}

module.exports = { sendInternalError };