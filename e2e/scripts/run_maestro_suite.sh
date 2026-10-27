#!/usr/bin/env bash

set -euo pipefail

output_dir="${1:?Informe o diretório de saída}"

maestro --no-ansi test \
  --format=JUNIT \
  --output="$output_dir/maestro-results.xml" \
  --env="E2E_DOCTOR_EMAIL=${E2E_DOCTOR_EMAIL}" \
  --env="E2E_PATIENT_EMAIL=${E2E_PATIENT_EMAIL}" \
  --env="E2E_PASSWORD=${E2E_PASSWORD}" \
  --env="E2E_PREGNANT_ID=${E2E_PREGNANT_ID}" \
  --env="E2E_EXAM_NAME=${E2E_EXAM_NAME}" \
  --env="E2E_REPORT_TEXT=${E2E_REPORT_TEXT}" \
  e2e/maestro/exam-cycle.yaml

maestro --no-ansi test \
  --format=JUNIT \
  --output="$output_dir/maestro-smoke-results.xml" \
  --env="E2E_DOCTOR_EMAIL=${E2E_DOCTOR_EMAIL}" \
  --env="E2E_PATIENT_EMAIL=${E2E_PATIENT_EMAIL}" \
  --env="E2E_PASSWORD=${E2E_PASSWORD}" \
  --env="E2E_PREGNANT_ID=${E2E_PREGNANT_ID}" \
  --env="E2E_EXAM_NAME=${E2E_EXAM_NAME}" \
  --env="E2E_REPORT_TEXT=${E2E_REPORT_TEXT}" \
  e2e/maestro/mobile-smoke.yaml
