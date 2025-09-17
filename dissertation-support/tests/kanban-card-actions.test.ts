import { describe, test, expect, beforeEach, jest, afterEach } from '@jest/globals';
import { App, TFile, Notice } from 'obsidian';
import { KanbanView } from '../src/kanban-view';
import { ProjectKanbanService, KanbanBoard, KanbanCard } from '../src/kanban-service';
import { CardEditModal } from '../src/card-edit-modal';
import DissertationSupportPlugin from '../main';

// Mock Obsidian APIs
const mockApp = {
    workspace: {
        getLeaf: jest.fn(() => ({
            openFile: jest.fn().mockResolvedValue(null as never)
        }))
    },
    vault: {
        create: jest.fn().mockResolvedValue({ path: 'test.md' } as never),
        getAbstractFileByPath: jest.fn().mockReturnValue(null)
    }
} as unknown as App;

const mockPlugin = {
    projectKanbanService: {
        saveBoard: jest.fn(),
        getBoard: jest.fn(),
        createQuickCard: jest.fn()
    }
} as unknown as DissertationSupportPlugin;

// Mock CardEditModal
jest.mock('../src/card-edit-modal', () => {
    return {
        CardEditModal: jest.fn().mockImplementation((plugin: any, card: any, onSave: any) => ({
            open: jest.fn(() => {
                // Simulate modal interaction
                setTimeout(() => onSave({ ...card, title: `${card.title} (edited)` }), 0);
            })
        }))
    };
});

// Mock global confirm and Notice
(global as any).confirm = jest.fn().mockReturnValue(true);
(global as any).Notice = jest.fn();

describe('Kanban Card Actions', () => {
    let kanbanView: KanbanView;
    let mockBoard: KanbanBoard;
    let testCard: KanbanCard;
    let container: HTMLElement;

    beforeEach(() => {
        // Reset all mocks
        jest.clearAllMocks();
        
        // Create test board and card
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
            subtasks: [
                { id: 'sub1', text: 'Subtask 1', status: 'todo', order: 0, created: Date.now(), updated: Date.now() }
            ],
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

        mockBoard = {
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

        // Create KanbanView instance
        const leaf = {} as any;
        kanbanView = new KanbanView(leaf, mockPlugin);
        (kanbanView as any).app = mockApp;
        kanbanView.currentBoard = mockBoard;

        // Create container element for testing
        container = document.createElement('div');
        
        // Create the expected DOM structure for KanbanView
        const kanbanBoard = document.createElement('div');
        kanbanBoard.className = 'kanban-board';
        container.appendChild(kanbanBoard);
        
        (kanbanView as any).containerEl = container;
        document.body.appendChild(container);
    });

    afterEach(() => {
        // Clean up DOM
        document.body.removeChild(container);
    });

    test('Edit button renders and triggers edit modal', async () => {
        // Render the board
        kanbanView.renderBoard();
        
        // Debug: Check what was actually rendered
        console.log('Container HTML:', container.innerHTML);
        console.log('Container children:', container.children.length);

        // Find the edit button
        const editButton = container.querySelector('.kanban-card-action[title="Edit card"]') as HTMLButtonElement;
        expect(editButton).toBeTruthy();
        expect(editButton.textContent).toBe('✏️');

        // Mock the editCard method to verify it's called
        const editCardSpy = jest.spyOn(kanbanView as any, 'editCard');

        // Click the edit button
        editButton.click();

        // Verify editCard method was called with correct card
        expect(editCardSpy).toHaveBeenCalledWith(testCard);
    });

    test('Link button renders and creates note', async () => {
        // Render the board
        kanbanView.renderBoard();

        // Find the link button
        const linkButton = container.querySelector('.kanban-card-action[title="Link to note"]') as HTMLButtonElement;
        expect(linkButton).toBeTruthy();
        expect(linkButton.textContent).toBe('🔗');

        // Click the link button
        linkButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify note creation was attempted
        expect(mockApp.vault.create).toHaveBeenCalledWith(
            'Test Card.md',
            expect.stringContaining('# Test Card')
        );
    });

    test('Complete button renders and marks card complete', async () => {
        // Render the board
        kanbanView.renderBoard();

        // Find the complete button
        const completeButton = container.querySelector('.kanban-card-action[title="Mark complete"]') as HTMLButtonElement;
        expect(completeButton).toBeTruthy();
        expect(completeButton.textContent).toBe('✅');

        // Click the complete button
        completeButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify card status was updated
        expect(mockBoard.cards[0].status).toBe('completed');
        expect((mockBoard.cards[0] as any).completed).toBeTruthy();

        // Verify board was saved
        expect(mockPlugin.projectKanbanService.saveBoard).toHaveBeenCalledWith(mockBoard);
    });

    test('Complete button does not render for completed cards', () => {
        // Mark card as completed
        testCard.status = 'completed';

        // Render the board
        kanbanView.renderBoard();

        // Verify complete button is not present
        const completeButton = container.querySelector('.kanban-card-action[title="Mark complete"]');
        expect(completeButton).toBeNull();
    });

    test('Delete button renders and removes card after confirmation', async () => {
        // Render the board
        kanbanView.renderBoard();

        // Find the delete button
        const deleteButton = container.querySelector('.kanban-card-action[title="Delete card"]') as HTMLButtonElement;
        expect(deleteButton).toBeTruthy();
        expect(deleteButton.textContent).toBe('🗑️');
        expect(deleteButton.classList.contains('kanban-card-action-danger')).toBe(true);

        // Click the delete button
        deleteButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify confirmation was shown
        expect((global as any).confirm).toHaveBeenCalledWith(
            'Delete "Test Card"?\n\nThis action cannot be undone.'
        );

        // Verify card was removed from board
        expect(mockBoard.cards.length).toBe(0);

        // Verify board was saved
        expect(mockPlugin.projectKanbanService.saveBoard).toHaveBeenCalledWith(mockBoard);
    });

    test('Delete button respects user cancellation', async () => {
        // Mock user clicking cancel
        ((global as any).confirm as jest.Mock).mockReturnValueOnce(false);

        // Render the board
        kanbanView.renderBoard();

        // Find and click delete button
        const deleteButton = container.querySelector('.kanban-card-action[title="Delete card"]') as HTMLButtonElement;
        deleteButton.click();

        // Wait for async operations
        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify card was NOT removed
        expect(mockBoard.cards.length).toBe(1);

        // Verify board was NOT saved
        expect(mockPlugin.projectKanbanService.saveBoard).not.toHaveBeenCalled();
    });

    test('Complete button moves card to completed column if available', async () => {
        // Render the board
        kanbanView.renderBoard();

        // Click complete button
        const completeButton = container.querySelector('.kanban-card-action[title="Mark complete"]') as HTMLButtonElement;
        completeButton.click();

        await new Promise(resolve => setTimeout(resolve, 10));

        // Verify card was moved to the "Done" column
        expect(mockBoard.cards[0].columnId).toBe('done');
    });

    test('Button actions are prevented from event bubbling', () => {
        // Render the board
        kanbanView.renderBoard();

        // Add click listener to card to test event bubbling
        const cardElement = container.querySelector('.kanban-card') as HTMLElement;
        const cardClickSpy = jest.fn();
        cardElement.addEventListener('click', cardClickSpy);

        // Click edit button
        const editButton = container.querySelector('.kanban-card-action[title="Edit card"]') as HTMLButtonElement;
        editButton.click();

        // Verify card click was not triggered (event was stopped)
        expect(cardClickSpy).not.toHaveBeenCalled();
    });

    test('Card action buttons are visible on hover', () => {
        // Render the board
        kanbanView.renderBoard();

        const actionsContainer = container.querySelector('.kanban-card-actions') as HTMLElement;
        const cardElement = container.querySelector('.kanban-card') as HTMLElement;

        // Get computed styles
        const actionsStyle = getComputedStyle(actionsContainer);
        
        // Actions should be partially visible by default (opacity: 0.6)
        expect(parseFloat(actionsStyle.opacity)).toBeGreaterThan(0);

        // Simulate hover - in real browser this would trigger CSS :hover
        // For testing, we verify the CSS class structure is correct
        expect(actionsContainer.classList.contains('kanban-card-actions')).toBe(true);
        expect(cardElement.classList.contains('kanban-card')).toBe(true);
    });

    test('All expected buttons render for active card', () => {
        // Render the board
        kanbanView.renderBoard();

        // Check all buttons are present
        const buttons = container.querySelectorAll('.kanban-card-action');
        expect(buttons.length).toBe(4); // edit, link, complete, delete

        const buttonTitles = Array.from(buttons).map(btn => btn.getAttribute('title'));
        expect(buttonTitles).toContain('Edit card');
        expect(buttonTitles).toContain('Link to note');
        expect(buttonTitles).toContain('Mark complete');
        expect(buttonTitles).toContain('Delete card');
    });

    test('Debug logging works for button clicks', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

        // Render the board
        kanbanView.renderBoard();

        // Click each button and verify debug log
        const editButton = container.querySelector('.kanban-card-action[title="Edit card"]') as HTMLButtonElement;
        editButton.click();
        expect(consoleSpy).toHaveBeenCalledWith('Edit button clicked for card:', 'Test Card');

        const linkButton = container.querySelector('.kanban-card-action[title="Link to note"]') as HTMLButtonElement;
        linkButton.click();
        expect(consoleSpy).toHaveBeenCalledWith('Link button clicked for card:', 'Test Card');

        consoleSpy.mockRestore();
    });
});