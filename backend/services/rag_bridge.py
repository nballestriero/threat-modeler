#!/usr/bin/env python3
import os
os.environ["TQDM_DISABLE"] = "1"
os.environ["PYTHONUNBUFFERED"] = "1"
import sys
import json
import argparse
from pathlib import Path

try:
    import chromadb
except ImportError as e:
    print(json.dumps({"status": "error", "error": "chromadb non installato"}))
    sys.exit(1)

def run_health(persist_dir):
    try:
        p = Path(persist_dir).resolve()
        p.mkdir(parents=True, exist_ok=True)
        client = chromadb.PersistentClient(path=str(p))
        print(json.dumps({"status": "ok", "collections": len(client.list_collections()), "persist_dir": str(p)}))
        return 0
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        return 1

def run_query(persist_dir, payload_json):
    try:
        payload = json.loads(payload_json)
        query = payload.get("query", "")
        collection_name = payload.get("collection", "threatmodel_default")
        n_results = payload.get("n_results", 5)
        
        p = Path(persist_dir).resolve()
        client = chromadb.PersistentClient(path=str(p))
        collection = client.get_or_create_collection(name=collection_name)
        
        results = collection.query(query_texts=[query], n_results=n_results, include=["documents", "metadatas", "distances"])
        docs = results["documents"][0] if results["documents"] else []
        print(json.dumps({"status": "ok", "documents": docs, "metadatas": results["metadatas"][0] if results["metadatas"] else [], "count": len(docs)}))
        return 0
    except json.JSONDecodeError as e:
        print(json.dumps({"status": "error", "error": f"JSON non valido: {e}"}))
        return 1
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        return 1

def run_ingest(persist_dir, payload_json):
    try:
        payload = json.loads(payload_json)
        collection_name = payload.get("collection", "threatmodel_default")
        documents = payload.get("documents", [])  # [{id, text, metadata}]
        
        p = Path(persist_dir).resolve()
        client = chromadb.PersistentClient(path=str(p))
        collection = client.get_or_create_collection(name=collection_name)
        
        # Filtra testi vuoti e prepara dati
        valid = [(d.get("id", f"doc_{i}"), d["text"].strip(), d.get("metadata", {})) 
                 for i, d in enumerate(documents) if d.get("text", "").strip()]
        
        if not valid:
            print(json.dumps({"status": "ok", "indexed": 0}))
            return 0
            
        ids, texts, metas = zip(*valid)
        collection.add(ids=list(ids), documents=list(texts), metadatas=list(metas))
        
        print(json.dumps({"status": "ok", "indexed": len(texts)}))
        return 0
    except Exception as e:
        print(json.dumps({"status": "error", "error": str(e)}))
        return 1

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--persist-dir", default="./chroma_data")
    parser.add_argument("--health", action="store_true")
    parser.add_argument("--query", action="store_true")
    parser.add_argument("--ingest", action="store_true")
    parser.add_argument("--payload-file", default=None)
    args = parser.parse_args()
    
    payload = None
    if args.payload_file:
        with open(args.payload_file, 'r', encoding='utf-8') as f:
            payload = f.read()
            
    if args.health:
        sys.exit(run_health(args.persist_dir))
    elif (args.query or args.ingest) and payload:
        func = run_ingest if args.ingest else run_query
        sys.exit(func(args.persist_dir, payload))
    else:
        parser.print_help()
        sys.exit(1)

if __name__ == "__main__":
    main()