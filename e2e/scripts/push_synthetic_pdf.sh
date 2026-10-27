#!/usr/bin/env bash

set -euo pipefail

pdf_path="${1:?Informe o caminho do PDF}"
pdf_name="${2:?Informe o nome do PDF}"

if adb push "$pdf_path" "/sdcard/Download/$pdf_name"; then
  exit 0
fi

echo "Direct push para /sdcard/Download bloqueado; usando MediaStore"
media_uri="$(adb shell content insert \
  --uri content://media/external/downloads \
  --bind "_display_name:s:$pdf_name" \
  --bind mime_type:s:application/pdf \
  --bind relative_path:s:Download/ | tr -d '\r')"

if [[ -z "$media_uri" ]]; then
  echo "Não foi possível criar o registro do PDF no MediaStore" >&2
  exit 1
fi

adb shell content write --uri "$media_uri" < "$pdf_path"
