; Luo-fe Prompt Manager - NSIS custom installer script
; 数据存储说明：
;   - 便携版：数据存储在 exe 同级目录的 data 文件夹（便携性，不在 C 盘）
;   - 安装版：数据默认存储在安装目录下，可在设置中更改到其他位置
;     数据目录路径记录在 userData/data-config.json 中（bootstrap 配置）
;     所有用户数据（分类、提示词、背景图、预览图、设置等）存储在用户选择的位置
; 更新/卸载时不会删除任何用户数据，data-config.json 由 deleteAppDataOnUninstall: false 保护

!ifndef BUILD_UNINSTALLER
  Var OldInstallDir
!endif

; customInit：在 .onInit 中执行，早于 CHECK_APP_RUNNING 和 uninstallOldVersion
; 作用：
;   1. 强制关闭可能正在运行的应用进程（taskkill 全程 Unicode，正确处理中文文件名）
;   2. 读取旧版本安装目录（在删除注册表项之前），供 customInstall 写入标记文件
;   3. 删除旧版本的卸载程序注册表项，使 uninstallOldVersion 直接返回（$uninstallString 为空）
;      这样旧卸载程序根本不会运行，避免其内置的 CHECK_APP_RUNNING 因 cmd.exe 编码问题
;      误报进程正在运行 → 静默模式退出码非零 → 重试 5 次 → 弹出 appCannotBeClosed 对话框
!macro customInit
  ; 强制关闭应用进程
  nsExec::Exec `taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  Sleep 500

  ; 读取旧版本安装目录（在删除注册表项之前）
  StrCpy $OldInstallDir ""
  ReadRegStr $OldInstallDir HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${if} $OldInstallDir == ""
    ReadRegStr $OldInstallDir HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${endIf}

  ; 删除旧版本注册表项（HKCU + HKLM），跳过 uninstallOldVersion
  DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
  DeleteRegKey HKLM "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKLM "${INSTALL_REGISTRY_KEY}"
!macroend

!macro customInstall
  ; 确保安装目录下存在 data 目录
  IfFileExists "$INSTDIR\data\*.*" LuofeDataExists 0
    CreateDirectory "$INSTDIR\data"
  LuofeDataExists:

  ; 如果旧安装目录存在且不同于新安装目录，写入标记文件供应用启动时迁移数据
  ; 应用读取此文件后，会将旧安装目录下 data 文件夹的数据迁移到当前数据目录
  ${if} $OldInstallDir != ""
  ${andIf} $OldInstallDir != "$INSTDIR"
    CreateDirectory "$APPDATA\${APP_FILENAME}"
    FileOpen $0 "$APPDATA\${APP_FILENAME}\old-install-dir.txt" w
    FileWrite $0 "$OldInstallDir"
    FileClose $0
    DetailPrint "Luofe: Old install dir recorded for data migration: $OldInstallDir"
  ${endIf}

  DetailPrint "Luofe: Installation directory ready at: $INSTDIR"
!macroend

!macro customUnInstall
  ; 卸载前关闭正在运行的应用（直接关闭，不检测，原因同上）
  nsExec::Exec `taskkill /F /IM "${APP_EXECUTABLE_FILENAME}"`
  Pop $0
  Sleep 500
  ; 不删除任何用户数据
  DetailPrint "Luofe: User data preserved in custom data directory"
!macroend
