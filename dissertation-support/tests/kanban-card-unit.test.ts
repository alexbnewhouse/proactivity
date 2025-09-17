import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import { KanbanView } from '../src/kanban-view';
import { KanbanCard } from '../src/kanban-service';
import DissertationSupportPlugin from '../main';

// Mock the CardEditModal
jest.mock('../src/card-edit-modal', () => {
    return {
        CardEditModal: jest.fn().mockImplementation((plugin: any, card: any, onSave: any) => ({
            open: jest.fn(() => {
                // Simulate successful edit
                setTimeout(() => onSave({ ...card, title: `${card.title} (edited)` }), 0);
            })
        }))
    };
});

// Mock global functions
(global as any).confirm = jest.fn().mockReturnValue(true);

describe('Kanban Card Button Actions (Unit Tests)', () => {
    let kanbanView: KanbanView;
    let mockPlugin: any;
    let testCard: KanbanCard;

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Create mock plugin
        mockPlugin = {
            projectKanbanService: {
                saveBoard: jest.fn(),
                getBoard: jest.fn(),
                createQuickCard: jest.fn()
            }
        } as unknown as DissertationSupportPlugin;

        // Create test card
        testCard = {
            id: 'test-card-1',
            title: 'Test Card',
            description: 'Test description',
            columnId: 'todo',
            order: 0,
            status: 'not-started',
            energyLevel: 'medium',
            timeEstimate: { optimistic: 30, realistic: 60, pessimistic: 90 },
            actualTimeSpent: 0,
            subtasks: [],
            dependencies: [],
            blockers: [],
            tags: ['test'],
            priority: 'medium',
            completionPercentage: 0,
            estimatedPomodoros: 2,
            adhdTips: ['Take breaks'],
            focusNotes: '',
            created: Date.now(),
            updated: Date.now()
        };

        // Create KanbanView instance
        const leaf = {} as any;
        const mockApp = {
            workspace: {
                getLeaf: () => ({
                    openFile: jest.fn().mockResolvedValue(undefined as any)
                })
            },
            vault: {
                create: jest.fn().mockResolvedValue({ path: 'test.md' } as any),
                getAbstractFileByPath: jest.fn().mockReturnValue(null)
            }
        };

        kanbanView = new KanbanView(leaf, mockPlugin);
        (kanbanView as any).app = mockApp;
        
        // Mock containerEl to prevent renderBoard issues in tests
        (kanbanView as any).containerEl = {
            querySelector: jest.fn().mockReturnValue(null)
        };
        
        // Mock renderBoard to prevent DOM manipulation in tests
        kanbanView.renderBoard = jest.fn();
        
        // Set up current board with test card
        kanbanView.currentBoard = {
            id: 'test-board',
            projectId: 'test-project',
            title: 'Test Board',
            description: 'Test board',
            columns: [
                { id: 'todo', title: 'To Do', description: '', order: 0, color: '#fff', isCollapsed: false },
                { id: 'doing', title: 'Doing', description: '', order: 1, color: '#fff', isCollapsed: false },
                { id: 'done', title: 'Done', description: '', order: 2, color: '#fff', isCollapsed: false }
            ],
            cards: [testCard],
            settings: {
                showSubtasks: true,
                showTimeEstimates: true,
                showEnergyLevels: true,
                enableDragDrop: true,
                autoArchiveCompleted: false,
                maxCardsPerColumn: 10,
                focusMode: 'all'
            },
            totalCards: 1,
            completedCards: 0,
            totalEstimatedHours: 1,
            actualTimeSpent: 0,
            created: Date.now(),
            updated: Date.now()
        };
    });

    test('editCard method opens modal and saves changes', async () => {
        const editCardMethod = (kanbanView as any).editCard;
        expect(typeof editCardMethod).toBe('function');

        // Call editCard directly
        await editCardMethod.call(kanbanView, testCard);

        // Verify modal was opened
        const { CardEditModal } = await import('../src/card-edit-modal');
        expect(CardEditModal).toHaveBeenCalledWith(
            mockPlugin, 
            testCard, 
            expect.any(Function)
        );
    });

    test('completeCard method updates status and moves to completed column', async () => {
        const completeCardMethod = (kanbanView as any).completeCard;
        expect(typeof completeCardMethod).toBe('function');

        // Call completeCard directly
        await completeCardMethod.call(kanbanView, testCard);

        // Verify card was updated
        expect(kanbanView.currentBoard!.cards[0].status).toBe('completed');
        expect((kanbanView.currentBoard!.cards[0] as any).completed).toBeTruthy();
        expect(kanbanView.currentBoard!.cards[0].columnId).toBe('done');

        // Verify board was saved
        expect(mockPlugin.projectKanbanService.saveBoard).toHaveBeenCalledWith(kanbanView.currentBoard);
    });

    test('deleteCard method removes card after confirmation', async () => {
        const deleteCardMethod = (kanbanView as any).deleteCard;
        expect(typeof deleteCardMethod).toBe('function');

        // Call deleteCard directly
        await deleteCardMethod.call(kanbanView, testCard);

        // Verify confirmation was shown
        expect((global as any).confirm).toHaveBeenCalledWith(
            'Delete "Test Card"?\n\nThis action cannot be undone.'
        );

        // Verify card was removed
        expect(kanbanView.currentBoard!.cards.length).toBe(0);

        // Verify board was saved
        expect(mockPlugin.projectKanbanService.saveBoard).toHaveBeenCalledWith(kanbanView.currentBoard);
    });

    test('deleteCard method respects cancellation', async () => {
        // Mock user clicking cancel
        ((global as any).confirm as jest.Mock).mockReturnValueOnce(false);

        const deleteCardMethod = (kanbanView as any).deleteCard;

        // Call deleteCard directly
        await deleteCardMethod.call(kanbanView, testCard);

        // Verify card was NOT removed
        expect(kanbanView.currentBoard!.cards.length).toBe(1);

        // Verify board was NOT saved
        expect(mockPlugin.projectKanbanService.saveBoard).not.toHaveBeenCalled();
    });

    test('linkCardToNote method creates note and opens it', async () => {
        const linkCardToNoteMethod = (kanbanView as any).linkCardToNote;
        expect(typeof linkCardToNoteMethod).toBe('function');

        const mockApp = (kanbanView as any).app;
        const mockOpenFile = jest.fn();
        mockApp.workspace.getLeaf = jest.fn(() => ({ openFile: mockOpenFile }));

        // Call linkCardToNote directly
        await linkCardToNoteMethod.call(kanbanView, testCard);

        // Verify note creation was attempted
        expect(mockApp.vault.create).toHaveBeenCalledWith(
            'Test Card.md',
            expect.stringContaining('# Test Card')
        );

        // Verify file opening was attempted
        expect(mockOpenFile).toHaveBeenCalled();
    });

    test('completeCard finds appropriate completed column', async () => {
        // Test with different column names for completion
        const testCases = [
            { columnTitle: 'Done', expectedId: 'done' },
            { columnTitle: 'Complete', expectedId: 'complete' },
            { columnTitle: 'Completed', expectedId: 'completed' }
        ];

        for (const testCase of testCases) {
            // Reset card status
            testCard.status = 'not-started';
            testCard.columnId = 'todo';

            // Update board columns
            kanbanView.currentBoard!.columns = [
                { id: 'todo', title: 'To Do', description: '', order: 0, color: '#fff', isCollapsed: false },
                { id: testCase.expectedId, title: testCase.columnTitle, description: '', order: 1, color: '#fff', isCollapsed: false }
            ];

            const completeCardMethod = (kanbanView as any).completeCard;
            await completeCardMethod.call(kanbanView, testCard);

            expect(kanbanView.currentBoard!.cards[0].columnId).toBe(testCase.expectedId);
        }
    });

    test('All required card action methods exist', () => {
        // Verify all the button action methods exist
        expect(typeof (kanbanView as any).editCard).toBe('function');
        expect(typeof (kanbanView as any).linkCardToNote).toBe('function');
        expect(typeof (kanbanView as any).completeCard).toBe('function');
        expect(typeof (kanbanView as any).deleteCard).toBe('function');
    });

    test('Error handling in linkCardToNote', async () => {
        const mockApp = (kanbanView as any).app;
        
        // Mock vault.create to throw an error
        mockApp.vault.create.mockRejectedValueOnce(new Error('Vault error'));

        const linkCardToNoteMethod = (kanbanView as any).linkCardToNote;
        
        // Should not throw - should handle error gracefully
        await expect(linkCardToNoteMethod.call(kanbanView, testCard)).resolves.toBeUndefined();
    });
});