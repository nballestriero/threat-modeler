/**
 * @file Test unitari per useProjectStore
 * @description Verifica azioni store progetti con mock di projectsApi.
 * @module tests/store/useProjectStore
 * 
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useProjectStore } from '../../store/useProjectStore';
import { projectsApi } from '../../api/projectsApi';

// Mock dell'API layer
jest.mock('../../api/projectsApi');

describe('useProjectStore - Unit tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset dello store tra i test
        useProjectStore.setState({
            projects: [],
            activeProject: null,
            loading: false,
            error: null
        });
    });

    test('fetchProjects popola projects e activeProject', async () => {
        const mockProjects = [
            { id: 'p1', name: 'Proj 1', status: 'draft' },
            { id: 'p2', name: 'Proj 2', status: 'active' }
        ];
        projectsApi.getAll.mockResolvedValue(mockProjects);

        const { result } = renderHook(() => useProjectStore());

        await act(async () => {
            await result.current.fetchProjects();
        });

        expect(result.current.projects).toEqual(mockProjects);
        expect(result.current.activeProject).toEqual(mockProjects[1]); // Quello attivo
        expect(result.current.loading).toBe(false);
    });

    test('fetchProjects gestisce errore API', async () => {
        projectsApi.getAll.mockRejectedValue(new Error('Network error'));

        const { result } = renderHook(() => useProjectStore());

        await act(async () => {
            await result.current.fetchProjects();
        });

        expect(result.current.error).toBe('Network error');
        expect(result.current.loading).toBe(false);
    });

    test('setActiveProject aggiorna stato e dispatcha evento', async () => {
        const mockProjects = [
            { id: 'p1', status: 'active' },
            { id: 'p2', status: 'draft' }
        ];
        useProjectStore.setState({ projects: mockProjects });

        const updatedProject = { id: 'p2', status: 'active' };
        projectsApi.setStatus.mockResolvedValue(updatedProject);

        // Mock per CustomEvent
        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

        const { result } = renderHook(() => useProjectStore());

        await act(async () => {
            await result.current.setActiveProject('p2');
        });

        // Verifica aggiornamento stato
        expect(result.current.activeProject).toEqual(updatedProject);
        expect(result.current.projects.find(p => p.id === 'p1').status).toBe('draft');
        expect(result.current.projects.find(p => p.id === 'p2').status).toBe('active');

        // Verifica dispatch evento
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'projectChanged', detail: 'p2' })
        );

        dispatchSpy.mockRestore();
    });

    test('addProject aggiunge progetto e lo imposta come attivo', async () => {
        const newProject = { id: 'new-uuid', name: 'New Proj', status: 'active' };
        projectsApi.create.mockResolvedValue(newProject);

        const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

        const { result } = renderHook(() => useProjectStore());

        await act(async () => {
            await result.current.addProject({ name: 'New Proj' });
        });

        expect(result.current.projects).toContainEqual(newProject);
        expect(result.current.activeProject).toEqual(newProject);
        expect(dispatchSpy).toHaveBeenCalledWith(
            expect.objectContaining({ type: 'projectChanged', detail: 'new-uuid' })
        );

        dispatchSpy.mockRestore();
    });

    test('reset pulisce completamente lo stato', () => {
        useProjectStore.setState({
            projects: [{ id: 'p1' }],
            activeProject: { id: 'p1' },
            loading: true,
            error: 'Some error'
        });

        const { result } = renderHook(() => useProjectStore());

        act(() => {
            result.current.reset();
        });

        expect(result.current.projects).toEqual([]);
        expect(result.current.activeProject).toBeNull();
        expect(result.current.loading).toBe(false);
        expect(result.current.error).toBeNull();
    });
});