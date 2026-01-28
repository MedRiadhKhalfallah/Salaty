!macro customUnInstall
  ; Attempt to kill the application process to ensure files can be removed
  nsExec::Exec 'taskkill /F /IM "Salaty Time.exe"'
  nsExec::Exec 'taskkill /F /IM "Salaty Islamic Prayer Times.exe"'
  nsExec::Exec 'taskkill /F /IM "Salaty.exe"'

  ; Helper to kill any lingering electron processes started from this path (harder to identify accurately)
  ; So we rely on the specific executable names.

  Sleep 1000 ; Give the OS a moment to release file locks
!macroend
