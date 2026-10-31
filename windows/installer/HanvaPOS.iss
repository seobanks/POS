#define MyAppName "Hanva Fine Dine POS"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "Hanva Technologies"
#define MyAppURL "https://pos-lovat-nine.vercel.app"
#define MyAppExeName "HanvaPOSLauncher.exe"

[Setup]
AppId={{D81E73A5-52B2-4BC2-9A47-19B821A8EF24}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}
DefaultDirName={sd}\HanvaPOS
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir=C:\hp-dist
OutputBaseFilename=HanvaPOS-Setup-v1.0.0
SetupIconFile=C:\hp-stage\app.ico
Compression=lzma2/fast
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog
EnableDirDoesntExistWarning=no

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"
Name: "autostart"; Description: "Start Hanva POS automatically when Windows starts (Recommended for billing counters)"; GroupDescription: "System Startup:"

[Files]
Source: "C:\hp-stage\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"
Name: "{group}\Uninstall {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\app.ico"; Tasks: desktopicon

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "HanvaPOS"; ValueData: """{app}\{#MyAppExeName}"""; Flags: uninsdeletevalue; Tasks: autostart

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent
