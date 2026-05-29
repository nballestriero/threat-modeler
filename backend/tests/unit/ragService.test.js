const { RagService } = require('../../services/ragService');
const axios = require('axios');
const { execFile } = require('child_process');
const fs = require('fs').promises;

jest.mock('axios');
jest.mock('child_process');
jest.mock('fs', () => ({
    promises: {
        writeFile: jest.fn(),
        unlink: jest.fn(),
        readFile: jest.fn()
    }
}));

describe('RagService', () => {
    let mockConfig;
    let execFileMock;

    beforeEach(() => {
        jest.clearAllMocks();
        mockConfig = {
            rag: {
                enabled: true,
                mode: 'python-client',
                persistDirectory: './test_chroma',
                baseUrl: 'http://localhost:8000',
                pythonBridge: {
                    scriptPath: './services/rag_bridge.py',
                    pythonCmd: 'python'
                }
            }
        };
        execFileMock = jest.spyOn(require('child_process'), 'execFile');
        fs.writeFile.mockResolvedValue();
        fs.unlink.mockResolvedValue();
    });

    afterEach(() => {
        execFileMock.mockRestore();
    });

    describe('costruttore', () => {
        test('lancia errore per modalità sconosciuta', () => {
            mockConfig.rag.mode = 'unknown';
            expect(() => new RagService(mockConfig)).toThrow('Modalità RAG non supportata');
        });
    });

    describe('modalità http-server', () => {
        beforeEach(() => {
            mockConfig.rag.mode = 'http-server';
        });

        test('health() esegue chiamata a /api/v2/heartbeat', async () => {
            axios.get.mockResolvedValue({ data: {} });
            const service = new RagService(mockConfig);
            const result = await service.health();
            expect(result).toEqual({ status: 'ok' });
            expect(axios.get).toHaveBeenCalledWith('http://localhost:8000/api/v2/heartbeat', expect.any(Object));
        });

        test('health() lancia errore se ChromaDB non risponde', async () => {
            axios.get.mockRejectedValue(new Error('Connection refused'));
            const service = new RagService(mockConfig);
            await expect(service.health()).rejects.toThrow('ChromaDB HTTP non raggiungibile');
        });

        test('query() chiama endpoint corretto e restituisce documenti', async () => {
            const mockResponse = { data: { documents: [['doc1', 'doc2']] } };
            axios.post.mockResolvedValue(mockResponse);
            const service = new RagService(mockConfig);
            // Nota: query(collection, queryText, taxonomy, nResults)
            const result = await service.query('test_coll', 'test query', null, 2);
            expect(result).toEqual({ documents: ['doc1', 'doc2'], count: 2 });
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:8000/api/v2/collections/test_coll/query',
                expect.objectContaining({ query_texts: ['test query'], n_results: 2 }),
                expect.any(Object)
            );
        });

        test('ingest() invia documenti e restituisce conteggio', async () => {
            const mockResponse = { data: { added: 2 } };
            axios.post.mockResolvedValue(mockResponse);
            const service = new RagService(mockConfig);
            const docs = [{ text: 'doc1', metadata: { a: 1 } }, { text: 'doc2' }];
            const result = await service.ingest('test_coll', docs);
            expect(result).toEqual({ indexed: 2 });
            expect(axios.post).toHaveBeenCalledWith(
                'http://localhost:8000/api/v2/collections/test_coll/add',
                expect.objectContaining({ documents: ['doc1', 'doc2'] }),
                expect.any(Object)
            );
        });
    });

    describe('modalità python-client', () => {
        test('health() esegue bridge con --health', async () => {
            execFileMock.mockImplementation((cmd, args, opts, cb) => {
                cb(null, JSON.stringify({ status: 'ok', collections: 2 }), '');
            });
            const service = new RagService(mockConfig);
            const result = await service.health();
            expect(result).toEqual({ status: 'ok', collections: 2 });
            expect(execFileMock).toHaveBeenCalledWith(
                expect.stringMatching(/python/),
                expect.arrayContaining(['--health']),
                expect.any(Object),
                expect.any(Function)
            );
        });

        test('query() scrive temp file e chiama bridge con --query', async () => {
            execFileMock.mockImplementation((cmd, args, opts, cb) => {
                // Verifica che esista l'argomento --payload-file
                const payloadIndex = args.indexOf('--payload-file');
                if (payloadIndex !== -1) {
                    cb(null, JSON.stringify({ status: 'ok', documents: ['doc1'], count: 1 }), '');
                } else {
                    cb(new Error('No payload file'), '', '');
                }
            });
            const service = new RagService(mockConfig);
            const result = await service.query('test_collection', 'test query', null, 3);
            expect(result).toEqual({ documents: ['doc1'], count: 1 });
            expect(fs.writeFile).toHaveBeenCalled();
            expect(execFileMock).toHaveBeenCalledWith(
                expect.stringMatching(/python/),
                expect.arrayContaining(['--query', '--payload-file', expect.any(String)]),
                expect.any(Object),
                expect.any(Function)
            );
            expect(fs.unlink).toHaveBeenCalled();
        });

        test('gestisce errore del bridge (codice di uscita non zero)', async () => {
            execFileMock.mockImplementation((cmd, args, opts, cb) => {
                cb(new Error('Command failed'), '', 'Error message');
            });
            const service = new RagService(mockConfig);
            await expect(service.health()).rejects.toThrow('Bridge Python fallito: Command failed');
        });

        test('gestisce output JSON non valido', async () => {
            execFileMock.mockImplementation((cmd, args, opts, cb) => {
                cb(null, 'Not a JSON', '');
            });
            const service = new RagService(mockConfig);
            await expect(service.health()).rejects.toThrow('Impossibile parsare output bridge');
        });
    });
});