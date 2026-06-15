const db = require('../backend');
const logger = require('../utils/logger');
const {
  ensureCanAccessPregnancy,
} = require('../utils/clinicalAccess');
const historyService = require('../services/clinicalHistoryService');

function handleError(res, error, context) {
  if (error instanceof historyService.HistoryValidationError) {
    return res.status(400).json({ error: error.message });
  }

  logger.error('Erro na API de historico clinico', {
    details: error.message,
    ...context,
  });
  return res.status(500).json({ error: 'Erro interno ao acessar historico' });
}

async function authorize(req, res) {
  const pregnancyId = historyService.validatePregnancyId(
    req.params.pregnancyId
  );
  return ensureCanAccessPregnancy(req, res, pregnancyId);
}

async function createFetalBiometry(req, res) {
  try {
    const pregnancy = await authorize(req, res);
    if (!pregnancy) return;

    const record = await historyService.createFetalBiometry(
      db,
      pregnancy.id,
      req.body,
      req.user.id
    );
    return res.status(201).json(record);
  } catch (error) {
    return handleError(res, error, {
      pregnancyId: req.params.pregnancyId,
    });
  }
}

async function getFetalBiometries(req, res) {
  try {
    const pregnancy = await authorize(req, res);
    if (!pregnancy) return;

    const records = await historyService.listFetalBiometries(
      db,
      pregnancy.id,
      req.query
    );
    return res.json(records);
  } catch (error) {
    return handleError(res, error, {
      pregnancyId: req.params.pregnancyId,
    });
  }
}

async function createMaternalWeight(req, res) {
  try {
    const pregnancy = await authorize(req, res);
    if (!pregnancy) return;

    const record = await historyService.createMaternalWeight(
      db,
      pregnancy.id,
      req.body,
      req.user.id
    );
    return res.status(201).json(record);
  } catch (error) {
    return handleError(res, error, {
      pregnancyId: req.params.pregnancyId,
    });
  }
}

async function getMaternalWeights(req, res) {
  try {
    const pregnancy = await authorize(req, res);
    if (!pregnancy) return;

    const records = await historyService.listMaternalWeights(
      db,
      pregnancy.id,
      req.query
    );
    return res.json(records);
  } catch (error) {
    return handleError(res, error, {
      pregnancyId: req.params.pregnancyId,
    });
  }
}

async function getClinicalHistory(req, res) {
  try {
    const pregnancy = await authorize(req, res);
    if (!pregnancy) return;

    const [fetalBiometries, maternalWeights] = await Promise.all([
      historyService.listFetalBiometries(db, pregnancy.id, req.query),
      historyService.listMaternalWeights(db, pregnancy.id, req.query),
    ]);

    return res.json({
      pregnancy_id: pregnancy.id,
      fetal_biometries: fetalBiometries,
      maternal_weights: maternalWeights,
    });
  } catch (error) {
    return handleError(res, error, {
      pregnancyId: req.params.pregnancyId,
    });
  }
}

module.exports = {
  createFetalBiometry,
  createMaternalWeight,
  getClinicalHistory,
  getFetalBiometries,
  getMaternalWeights,
};
