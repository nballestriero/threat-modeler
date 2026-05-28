@echo off
echo 🐍 Setup ambiente Python per RAG...

if exist .venv (
    echo ⚠️  La cartella .venv esiste già. Vuoi ricrearla? (S/N)
    set /p choice=
    if /i "%choice%"=="S" rmdir /s /q .venv
)

if not exist .venv (
    echo ✅ Creo ambiente virtuale...
    python -m venv .venv
)

echo ✅ Installo dipendenze...
.venv\Scripts\pip.exe install -r requirements.txt

echo ✅ Fatto! Ambiente pronto in backend\.venv
echo 📌 Percorso Python da usare in config: %CD%\.venv\Scripts\python.exe
pause