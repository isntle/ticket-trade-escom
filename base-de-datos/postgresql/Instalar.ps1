# Ejecutar en PowerShell desde la carpeta descomprimida.
param(
 [string]$RutaPostgres = 'C:\Program Files\PostgreSQL\18\bin',
 [string]$NombreBase = 'tickettrade',
 [string]$Usuario = 'postgres',
 [string]$Servidor = 'localhost',
 [int]$Puerto = 5432,
 [switch]$BaseYaCreada
)
$ErrorActionPreference = 'Stop'
$cliente = Join-Path $RutaPostgres 'psql.exe'
$crear = Join-Path $RutaPostgres 'createdb.exe'
if (!(Test-Path -LiteralPath $cliente)) { throw "No se encontró psql.exe en $RutaPostgres" }
if ($NombreBase -notmatch '^[a-z][a-z0-9_]*$') { throw 'Usa un nombre de base en minúsculas, sin espacios, por ejemplo tickettrade.' }
if (!$BaseYaCreada) {
 & $crear -h $Servidor -p $Puerto -U $Usuario -W -E UTF8 -T template0 $NombreBase
 if ($LASTEXITCODE -ne 0) { throw 'No se creó la base. No se borró ni sustituyó ninguna base existente.' }
}
$archivos = @('00_instalar_tickettrade.sql', '04_pruebas_integridad.sql')
foreach ($archivo in $archivos) {
 & $cliente -X -h $Servidor -p $Puerto -U $Usuario -W -d $NombreBase -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot $archivo)
 if ($LASTEXITCODE -ne 0) { throw "Falló $archivo. Revisa el primer ERROR antes de continuar." }
}
Write-Host 'Base construida y pruebas aprobadas. Los datos de prueba se revirtieron.'
