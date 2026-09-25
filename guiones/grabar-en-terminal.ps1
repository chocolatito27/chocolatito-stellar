# GRABAR LA DEMO COMO LA USA CUALQUIERA
#
# Con esto se grabó el video de la demo el 24 sep de 2026 (aquí con las rutas
# generalizadas). Abre Windows Terminal a pantalla completa en la carpeta de
# las facturas, teclea `chocolatito`, le escribe la orden al agente, espera a
# que termine, sale con /exit y lanza `npm run demo`, mientras ffmpeg graba la
# pantalla.
#
# LO QUE SE TECLEA LO TECLEA ESTE GUION, letra a letra, con SendInput: el mismo
# camino que sigue un teclado. Así la toma sale limpia. El README lo dice.
#
# Qué toca fuera del repositorio, y cómo lo deja:
#  - Un perfil oculto de Terminal (letra grande, fondo oscuro), como fragmento
#    en %LOCALAPPDATA%\Microsoft\Windows Terminal\Fragments. Para que Terminal
#    lo lea hay que hacerle recargar los ajustes, y al recargar escribe una
#    entrada en settings.json: se guarda una copia antes y se restaura al
#    final. Cada vez con un GUID nuevo, porque uno que ya se usó y se borró
#    Terminal no lo vuelve a cargar.
#  - El medidor (`medir-agente.ts --interactivo`) en segundo plano. Se para al final.
#
# Solo teclea si la ventana de delante es la de la demo, mirada por su título.
# Si alguien toca otra ventana, se para en vez de escribir donde no debe.
#
#   powershell -ExecutionPolicy Bypass -File guiones\grabar-en-terminal.ps1 [-Ensayo]
#
# -Ensayo: ni graba ni da la orden, así que no gasta nada. Comprueba el teclado
# y la salida con dos capturas en la carpeta de trabajo.
param([switch]$Ensayo)
$ErrorActionPreference = 'Stop'

$repo     = Split-Path $PSScriptRoot -Parent
$carpeta  = 'facturas-enero-marzo-2026'
$orden    = 'Lee todas las facturas .txt de esta carpeta y escribe balance.md con una tabla del total por mes y el total general. No preguntes, hazlo.'
$titulo   = 'Chocolatito Code'
$trabajo  = Join-Path $env:TEMP 'chocolatito-grabacion'
$settings = Join-Path $env:LOCALAPPDATA 'Packages\Microsoft.WindowsTerminal_8wekyb3d8bbwe\LocalState\settings.json'
$fragmento = Join-Path $env:LOCALAPPDATA 'Microsoft\Windows Terminal\Fragments\ChocolatitoDemo'
$copia    = Join-Path $trabajo 'settings.copia.json'
$uso      = Join-Path $repo 'datos\uso-real.json'
$log      = Join-Path $trabajo 'grabacion.log'
New-Item -ItemType Directory -Force $trabajo | Out-Null

function Anota($t) { $l = '{0:HH:mm:ss.fff} {1}' -f (Get-Date), $t; Add-Content -Path $log -Value $l -Encoding UTF8; $l }

Add-Type -TypeDefinition @'
using System;
using System.Runtime.InteropServices;
using System.Text;
public static class Teclado {
  [StructLayout(LayoutKind.Sequential)] public struct KEYBDINPUT { public ushort wVk; public ushort wScan; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx; public int dy; public uint mouseData; public uint dwFlags; public uint time; public IntPtr dwExtraInfo; }
  [StructLayout(LayoutKind.Explicit)] public struct UNION { [FieldOffset(0)] public MOUSEINPUT mi; [FieldOffset(0)] public KEYBDINPUT ki; }
  [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public UNION u; }
  [DllImport("user32.dll", SetLastError = true)] static extern uint SendInput(uint n, INPUT[] inputs, int size);
  [DllImport("user32.dll")] static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowTextW(IntPtr h, StringBuilder s, int n);
  static INPUT K(ushort vk, ushort scan, uint flags) { INPUT i = new INPUT(); i.type = 1; i.u.ki.wVk = vk; i.u.ki.wScan = scan; i.u.ki.dwFlags = flags; return i; }
  // KEYEVENTF_UNICODE (4): la letra tal cual, sin depender de la distribución del teclado.
  public static uint Letra(char c) { INPUT[] a = { K(0, c, 4), K(0, c, 6) }; return SendInput(2, a, Marshal.SizeOf(typeof(INPUT))); }
  public static uint Virtual(ushort vk) { INPUT[] a = { K(vk, 0, 0), K(vk, 0, 2) }; return SendInput(2, a, Marshal.SizeOf(typeof(INPUT))); }
  public static string Frente() { StringBuilder s = new StringBuilder(256); GetWindowTextW(GetForegroundWindow(), s, 256); return s.ToString(); }
}
'@

function AlFrente { [Teclado]::Frente() -eq $titulo }
function Vigila { if (-not (AlFrente)) { throw "La ventana '$titulo' no esta al frente (esta '$([Teclado]::Frente())'): no tecleo nada" } }
function Escribe([string]$texto, [int]$ms = 70) {
  foreach ($c in $texto.ToCharArray()) {
    Vigila
    if ([Teclado]::Letra($c) -ne 2) { throw "SendInput no entrego la tecla '$c'" }
    Start-Sleep -Milliseconds ([Math]::Max(25, $ms + (Get-Random -Minimum -30 -Maximum 50)))
  }
}
function Intro { Vigila; [void][Teclado]::Virtual(0x0D) }
function Captura($nombre) { & ffmpeg -hide_banner -loglevel error -f gdigrab -framerate 5 -draw_mouse 0 -i desktop -frames:v 1 -y (Join-Path $trabajo "$nombre.png") }

Set-Content -Path $log -Value '' -Encoding UTF8
if (Get-NetTCPConnection -LocalPort 4791 -State Listen -ErrorAction SilentlyContinue) { throw 'El puerto 4791 ya esta ocupado' }

$medidor = $null
$grabador = $null
Copy-Item $settings $copia -Force
try {
  # --- El medidor, en segundo plano y sin ventana
  $psiM = New-Object System.Diagnostics.ProcessStartInfo
  $psiM.FileName = (Get-Command node).Source
  $psiM.Arguments = "--experimental-strip-types guiones/medir-agente.ts --interactivo --carpeta $carpeta --orden `"$orden`""
  $psiM.WorkingDirectory = $repo
  $psiM.UseShellExecute = $false; $psiM.CreateNoWindow = $true
  $medidor = [System.Diagnostics.Process]::Start($psiM)
  for ($i = 0; $i -lt 75 -and -not (Get-NetTCPConnection -LocalPort 4791 -State Listen -ErrorAction SilentlyContinue); $i++) { Start-Sleep -Milliseconds 200 }
  if (-not (Get-NetTCPConnection -LocalPort 4791 -State Listen -ErrorAction SilentlyContinue)) { throw 'El medidor no llego a escuchar en 4791' }
  Anota 'medidor escuchando'

  # --- El perfil de Terminal, con un GUID que no se haya usado nunca
  $guid = '{' + [guid]::NewGuid().ToString() + '}'
  $perfil = [ordered]@{ profiles = @([ordered]@{
    guid = $guid; name = 'Chocolatito Demo'; hidden = $true
    commandline = "powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -NoExit -Command `"`$env:CHOCOLATITO_ENGINE_URL='http://localhost:4791/v1'; Set-PSReadLineOption -HistorySaveStyle SaveNothing`""
    startingDirectory = (Join-Path $repo $carpeta)
    tabTitle = $titulo; suppressApplicationTitle = $true
    font = [ordered]@{ face = 'Cascadia Mono'; size = 20 }
    padding = '32'; scrollbarState = 'hidden'; cursorShape = 'bar'
    background = '#131110'; foreground = '#EDE6E0'; opacity = 100; useAcrylic = $false
    closeOnExit = 'always'; bellStyle = 'none'; antialiasingMode = 'grayscale'
  }) }
  New-Item -ItemType Directory -Force $fragmento | Out-Null
  # Sin BOM: el lector de JSON de Terminal no lo espera.
  [System.IO.File]::WriteAllText((Join-Path $fragmento 'demo.json'), ($perfil | ConvertTo-Json -Depth 5), (New-Object System.Text.UTF8Encoding $false))
  (Get-Item $settings).LastWriteTime = Get-Date
  for ($i = 0; $i -lt 75 -and -not (Select-String -Path $settings -Pattern $guid -SimpleMatch -Quiet); $i++) { Start-Sleep -Milliseconds 200 }
  if (-not (Select-String -Path $settings -Pattern $guid -SimpleMatch -Quiet)) { throw 'Terminal no cargo el perfil de la demo' }
  Start-Sleep -Seconds 1
  Anota 'perfil cargado'

  # --- La ventana
  Start-Process wt.exe -ArgumentList '-w new -F -p "Chocolatito Demo"'
  for ($i = 0; $i -lt 50 -and -not (AlFrente); $i++) { Start-Sleep -Milliseconds 200 }
  Vigila
  Start-Sleep -Seconds 3
  Anota 'ventana al frente'

  if (-not $Ensayo) {
    $psi = New-Object System.Diagnostics.ProcessStartInfo
    $psi.FileName = (Get-Command ffmpeg).Source
    $psi.Arguments = "-hide_banner -loglevel error -f gdigrab -framerate 30 -draw_mouse 0 -i desktop -c:v libx264 -preset ultrafast -crf 12 -pix_fmt yuv444p -y `"$(Join-Path $trabajo 'demo-en-terminal.mkv')`""
    $psi.UseShellExecute = $false; $psi.RedirectStandardInput = $true; $psi.CreateNoWindow = $true
    $grabador = [System.Diagnostics.Process]::Start($psi)
    Start-Sleep -Seconds 2
    Anota 'grabando'
  }

  # --- Abrir el agente
  Escribe 'chocolatito' 95
  Start-Sleep -Milliseconds 700
  Intro
  Anota 'chocolatito lanzado'
  Start-Sleep -Seconds 9

  if ($Ensayo) {
    $prueba = 'Prueba de teclado: ' + [char]0xE1 + [char]0xE9 + [char]0xED + [char]0xF3 + [char]0xFA + ' ' + [char]0xF1
    Escribe $prueba 40
    Start-Sleep -Seconds 2
    Captura 'ensayo-1'
    foreach ($c in $prueba.ToCharArray()) { Vigila; [void][Teclado]::Virtual(0x08); Start-Sleep -Milliseconds 15 }
    Start-Sleep -Milliseconds 500
  } else {
    $antes = (Get-Item $uso).LastWriteTime
    Escribe $orden 62
    Start-Sleep -Milliseconds 900
    Intro
    Anota 'orden enviada'
    $t0 = Get-Date
    do {
      Start-Sleep -Milliseconds 500
      $hecho = $false
      if ((Get-Item $uso).LastWriteTime -gt $antes) { $hecho = (Get-Content $uso -Raw | ConvertFrom-Json).terminado -eq $true }
    } until ($hecho -or ((Get-Date) - $t0).TotalSeconds -gt 240)
    if (-not $hecho) { throw 'El agente no termino en 4 minutos' }
    Anota 'agente terminado'
    Start-Sleep -Seconds 8
  }

  # --- Salir del agente
  Escribe '/exit' 110
  Start-Sleep -Milliseconds 800
  Intro
  Start-Sleep -Seconds 3

  if ($Ensayo) {
    Captura 'ensayo-2'
    Anota 'ensayo hecho'
  } else {
    Escribe 'cd ..' 110
    Start-Sleep -Milliseconds 500
    Intro
    Start-Sleep -Milliseconds 1500
    Escribe 'npm run demo' 100
    Start-Sleep -Milliseconds 700
    Intro
    Anota 'npm run demo'
    $t0 = Get-Date
    $visto = $false
    do {
      Start-Sleep -Milliseconds 500
      $vivo = @(Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -like '*guiones/demo.ts*' }).Count -gt 0
      if ($vivo) { $visto = $true }
    } until (($visto -and -not $vivo) -or ((Get-Date) - $t0).TotalSeconds -gt 300)
    if (-not $visto) { throw 'La demo no llego a arrancar' }
    Anota 'demo terminada'
    Start-Sleep -Seconds 10
  }
} finally {
  if ($grabador -and -not $grabador.HasExited) {
    $grabador.StandardInput.Write('q'); $grabador.StandardInput.Flush()
    if (-not $grabador.WaitForExit(20000)) { $grabador.Kill() }
    Anota "grabacion parada: $(Join-Path $trabajo 'demo-en-terminal.mkv')"
  }
  # Cerrar la ventana ya sin grabar, y solo si sigue siendo la de delante.
  Start-Sleep -Milliseconds 500
  if (AlFrente) { Escribe 'exit' 40; Intro }
  if ($medidor -and -not $medidor.HasExited) { $medidor.Kill() }
  # Dejar Terminal como estaba: sin el perfil y con su settings.json de antes.
  if (Test-Path $fragmento) { Remove-Item $fragmento -Recurse -Force }
  Start-Sleep -Seconds 2
  Copy-Item $copia $settings -Force
  if ((Get-FileHash $copia).Hash -ne (Get-FileHash $settings).Hash) { Anota 'OJO: settings.json no quedo igual que la copia' } else { Anota 'Terminal restaurado' }
}
