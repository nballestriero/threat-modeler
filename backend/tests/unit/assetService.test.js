const assetService = require('../../services/assetService');
const { loadModel, saveModel } = require('../../models/assetModel');

// Mock dei model per isolare il test (non toccare il file reale)
jest.mock('../../models/assetModel');

describe('Asset Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getAllAssets restituisce la lista di asset', async () => {
        const mockAssets = [{ id: '1', name: 'Test' }];
        loadModel.mockResolvedValue({ assets: mockAssets });

        const result = await assetService.getAllAssets();
        expect(result).toEqual(mockAssets);
        expect(loadModel).toHaveBeenCalledTimes(1);
    });

    test('createAsset aggiunge un nuovo asset', async () => {
        const mockModel = { assets: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const newAsset = { name: 'Nuovo', category: 'Process' };
        const created = await assetService.createAsset(newAsset);
        expect(created).toHaveProperty('id');
        expect(created.name).toBe('Nuovo');
        expect(saveModel).toHaveBeenCalled();
    });

    test('updateAsset modifica un asset esistente', async () => {
        const existingAsset = { id: 'abc', name: 'Vecchio', category: 'Process' };
        const mockModel = { assets: [existingAsset] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const updates = { name: 'Nuovo nome' };
        const updated = await assetService.updateAsset('abc', updates);
        expect(updated.name).toBe('Nuovo nome');
        expect(updated.id).toBe('abc');
    });

    test('updateAsset lancia errore se asset non trovato', async () => {
        const mockModel = { assets: [] };
        loadModel.mockResolvedValue(mockModel);
        await expect(assetService.updateAsset('inesistente', { name: 'x' }))
            .rejects.toThrow('Asset non trovato');
    });
});