# Abre el cliente NATIVO psql con un selector de las 73 tablas y sus conteos.
param([string]$Tabla)
$ErrorActionPreference = 'Stop'
$raizTicketTrade = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '../..')).Path
Push-Location -LiteralPath $raizTicketTrade
try {
  if ($Tabla) { npm run db:ver -- $Tabla }
  else { npm run db:ver }
} finally { Pop-Location }
