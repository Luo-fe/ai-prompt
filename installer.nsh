; Luo-fe Prompt Manager - NSIS custom installer script
; Data preservation: The "data" directory is created at runtime (not by the installer),
; so NSIS uninstallers will NOT remove it during upgrades. User data is preserved
; automatically across version upgrades.

!macro customInstall
  ; Ensure the data directory exists in the install location
  IfFileExists "$INSTDIR\data\*.*" LuofeDataExists 0
    CreateDirectory "$INSTDIR\data"
  LuofeDataExists:
    DetailPrint "Luofe: Data directory ready at: $INSTDIR\data"
!macroend

!macro customUnInstall
  ; Ask user whether to delete application data on uninstall
  IfFileExists "$INSTDIR\data\*.*" 0 LuofeNoData
    MessageBox MB_YESNO|MB_ICONQUESTION "是否删除应用数据（提示词、设置、缓存等）？$\n$\n选择'否'将保留数据以便下次安装时使用。" IDYES LuofeDeleteData IDNO LuofeKeepData

    LuofeDeleteData:
      RMDir /r "$INSTDIR\data"
      Goto LuofeDone

    LuofeKeepData:
      DetailPrint "Luofe: User chose to keep data at: $INSTDIR\data"

    LuofeDone:
  LuofeNoData:
!macroend
