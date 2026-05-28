#!/bin/bash
echo "🐍 Setup ambiente Python per RAG..."

if [ -d ".venv" ]; then
    echo "⚠️  La cartella .venv esiste già. Ricreare? (s/N)"
    read -r choice
    if [[ "$choice" =~ ^[Ss]$ ]]; then
        rm -rf .venv
    fi
fi

if [ ! -d ".venv" ]; then
    echo "✅ Creo ambiente virtuale..."
    python3 -m venv .venv
fi

echo "✅ Installo dipendenze..."
.venv/bin/pip install -r requirements.txt

echo "✅ Fatto! Ambiente pronto in backend/.venv"
echo "📌 Percorso Python da usare in config: $(pwd)/.venv/bin/python3"