; Luo-fe Prompt Manager - NSIS custom installer script
; 数据存储说明：
;   - 便携版：数据存储在 exe 同级目录的 data 文件夹（便携性，不在 C 盘）
;   - 安装版：数据默认存储在安装目录下，可在设置中更改到其他位置
;     数据目录路径记录在 userData/data-config.json 中（bootstrap 配置）
;     所有用户数据（分类、提示词、背景图、预览图、设置等）存储在用户选择的位置
; 更新/卸载时不会删除任何用户数据，data-config.json 由 deleteAppDataOnUninstall: false 保护
;
; 升级安装策略（v1.4.3+）：
;   1. customInit（文件复制前执行）：
;      a. 检测旧版本安装目录（HKCU/HKLM InstallLocation）
;      b. 将 $INSTDIR 默认设为旧安装目录
;      c. 删除旧版本的程序本体（exe/dll/pak/locales/resources），严格保留 data/ 文件夹
;      ⚠️ 删除必须在 customInit 中执行，因为 customInstall 在文件复制之后执行，
;         会导致刚复制的新文件被误删（v1.4.3 首版的 bug）
;   2. customInstall（文件复制后执行）：
;      a. 确保安装目录下存在 data 目录
;      b. 如旧安装目录与新目录不同，写入标记文件供应用启动时迁移数据
;   3. 删除旧版本注册表项，跳过 uninstallOldVersion，避免旧卸载程序的编码问题

!ifndef BUILD_UNINSTALLER
  Var OldInstallDir
!endif

; customInit：在 .onInit 中执行，早于 CHECK_APP_RUNNING 和 uninstallOldVersion
; ⚠️ 此 macro 在文件复制之前执行，是删除旧版本程序本体的正确时机
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

  ; 如果检测到旧安装目录，则将 $INSTDIR 默认设为旧目录
  ; 这样用户在安装界面看到的默认路径就是之前的安装位置
  ${if} $OldInstallDir != ""
  ${andIf} ${FileExists} "$OldInstallDir\*.*"
    StrCpy $INSTDIR "$OldInstallDir"
    DetailPrint "Luofe: Detected previous install location, defaulting to: $INSTDIR"

    ; ====== 删除旧版本程序本体（严格保留 data/ 和 userData/）======
    ; ⚠️ 必须在 customInit 中执行（文件复制前），否则会删除刚复制的新文件
    ; 安全检查：仅当旧目录存在且包含旧版本可执行文件时才清理
    ${if} ${FileExists} "$OldInstallDir\${APP_EXECUTABLE_FILENAME}"
      DetailPrint "Luofe: Cleaning up previous version program files in: $OldInstallDir"

      ; 删除主程序及 Electron 运行时文件
      Delete "$OldInstallDir\${APP_EXECUTABLE_FILENAME}"
      Delete "$OldInstallDir\*.dll"
      Delete "$OldInstallDir\*.exe"
      Delete "$OldInstallDir\*.pak"
      Delete "$OldInstallDir\*.bin"
      Delete "$OldInstallDir\*.dat"
      Delete "$OldInstallDir\icudtl.dat"
      Delete "$OldInstallDir\LICENSES.chromium.html"
      Delete "$OldInstallDir\v8_context_snapshot.bin"
      Delete "$OldInstallDir\vk_swiftshader.dll"
      Delete "$OldInstallDir\libGLESv2.dll"
      Delete "$OldInstallDir\libEGL.dll"
      Delete "$OldInstallDir\ffmpeg.dll"
      Delete "$OldInstallDir\chrome_100_percent.pak"
      Delete "$OldInstallDir\chrome_200_percent.pak"
      Delete "$OldInstallDir\resources.pak"
      Delete "$OldInstallDir\snapshot_blob.bin"

      ; 删除 locales 文件夹（语言包，会被新版本覆盖）
      RMDir /r "$OldInstallDir\locales"

      ; 删除 resources 文件夹（app.asar 等，会被新版本覆盖）
      ; 注意：userData/ 在 APPDATA 下，不在这里，所以安全
      RMDir /r "$OldInstallDir\resources"

      ; 删除旧版卸载程序
      Delete "$OldInstallDir\Uninstall ${APP_FILENAME}.exe"
      Delete "$OldInstallDir\${APP_FILENAME} Uninstaller.exe"

      DetailPrint "Luofe: Previous program files cleaned (data/ preserved)"
    ${endIf}
  ${endIf}

  ; 删除旧版本注册表项（HKCU + HKLM），跳过 uninstallOldVersion
  DeleteRegKey HKCU "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKCU "${INSTALL_REGISTRY_KEY}"
  DeleteRegKey HKLM "${UNINSTALL_REGISTRY_KEY}"
  DeleteRegKey HKLM "${INSTALL_REGISTRY_KEY}"
!macroend

; customInstall：在文件复制之后执行（新文件已就位）
; 此时不能再删除 $INSTDIR 下的文件，否则会删除刚复制的新版本
!macro customInstall
  ; ====== 确保数据目录存在 ======
  IfFileExists "$INSTDIR\data\*.*" LuofeDataExists 0
    CreateDirectory "$INSTDIR\data"
  LuofeDataExists:

  ; ====== 记录旧安装目录供数据迁移 ======
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
