!macro customHeader
!macroend

!macro customInstall
!macroend

!macro customUnInstall
  MessageBox MB_YESNO "Delete application data (prompts, settings, cache, etc.)?$\n$\nChoose 'No' to keep your data for next installation." IDYES deleteData IDNO keepData

  deleteData:
    RMDir /r "$INSTDIR\data"
    Goto done

  keepData:
    DetailPrint "User data kept at: $INSTDIR\data"

  done:
!macroend
