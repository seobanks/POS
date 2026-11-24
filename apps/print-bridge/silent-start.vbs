' Hanva POS Print Bridge - Silent Background Launcher
' Starts the print service silently without any command prompt window.

Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

NodePath = ScriptDir & "\node.exe"
BridgePath = ScriptDir & "\bridge.js"

If Not FSO.FileExists(NodePath) Then
    MsgBox "node.exe not found in " & ScriptDir & vbCrLf & "Please extract the full ZIP file.", vbCritical, "Hanva POS"
    WScript.Quit 1
End If

If Not FSO.FileExists(BridgePath) Then
    MsgBox "bridge.js not found in " & ScriptDir, vbCritical, "Hanva POS"
    WScript.Quit 1
End If

' Run hidden (0 = hide window, False = don't wait)
WshShell.CurrentDirectory = ScriptDir
WshShell.Run """" & NodePath & """ """ & BridgePath & """", 0, False

MsgBox "Hanva Print Service is now running silently in the background." & vbCrLf & vbCrLf & "Cashier and Kitchen print jobs will print automatically with 0 clicks.", vbInformation, "Hanva POS Print Service"
