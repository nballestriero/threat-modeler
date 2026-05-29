const flowService = require('../../services/flowService');
const { loadModel, saveModel } = require('../../models/assetModel');

jest.mock('../../models/assetModel');

describe('Flow Service', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('getAllFlows restituisce array', async () => {
        const mockFlows = [{ id: '1', name: 'Test Flow' }];
        loadModel.mockResolvedValue({ flows: mockFlows });

        const result = await flowService.getAllFlows();
        expect(result).toEqual(mockFlows);
    });

    test('createFlow aggiunge un nuovo flusso', async () => {
        const mockModel = { flows: [] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const newFlow = { name: 'Nuovo', source: 'A', target: 'B' };
        const created = await flowService.createFlow(newFlow);
        expect(created).toHaveProperty('id');
        expect(created.name).toBe('Nuovo');
        expect(saveModel).toHaveBeenCalled();
    });

    test('updateFlow modifica flusso esistente', async () => {
        const existing = { id: 'abc', name: 'Vecchio', source: 'A', target: 'B' };
        loadModel.mockResolvedValue({ flows: [existing] });
        saveModel.mockResolvedValue();

        const updated = await flowService.updateFlow('abc', { name: 'Nuovo nome' });
        expect(updated.name).toBe('Nuovo nome');
    });

    test('deleteFlow elimina flusso', async () => {
        const mockModel = { flows: [{ id: 'abc' }] };
        loadModel.mockResolvedValue(mockModel);
        saveModel.mockResolvedValue();

        const result = await flowService.deleteFlow('abc');
        expect(result.success).toBe(true);
        expect(saveModel).toHaveBeenCalled();
    });
});