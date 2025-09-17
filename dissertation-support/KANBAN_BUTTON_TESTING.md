# Kanban Card Button Manual Testing Guide

## 🧪 Manual Testing for Card Button Functionality

After fixing the Kanban card button issues and implementing comprehensive tests, use this guide to manually verify the buttons work as expected.

### 🎯 Test Setup
1. Open Obsidian with the dissertation support plugin enabled
2. Open the Kanban view
3. Create or load a board with at least one card

### ✅ Test Cases

#### 1. Edit Button (✏️)
- **Action**: Click the edit button on any card
- **Expected**: Card edit modal opens with current card data
- **Verify**: Modal has all fields populated (title, description, subtasks, etc.)
- **Success**: Modal opens correctly ✓

#### 2. Link Button (🔗) 
- **Action**: Click the link button on any card
- **Expected**: Creates a new note with card title as filename
- **Verify**: Note contains card details and opens in editor
- **Success**: Note created and opened ✓

#### 3. Complete Button (✅)
- **Action**: Click the complete button on an active card
- **Expected**: Card moves to "Done" or "Completed" column and status updates
- **Verify**: Card is in the completed column and visually marked as complete
- **Success**: Card completed and moved ✓

#### 4. Delete Button (🗑️)
- **Action**: Click the delete button on any card
- **Expected**: Confirmation dialog appears
- **Verify**: Clicking "OK" removes card, clicking "Cancel" keeps card
- **Success**: Card deleted after confirmation ✓

### 🔧 Debug Features
- **Console Logging**: Check browser dev tools console for button click logs
- **Button Visibility**: Buttons should be slightly visible by default, fully visible on hover
- **Event Prevention**: Clicking buttons shouldn't trigger card selection or other parent events

### 🐛 Known Issues Fixed
1. ✅ Buttons were hidden (opacity: 0) - now partially visible by default
2. ✅ Missing `completeCard` method - implemented
3. ✅ Event bubbling issues - `stopPropagation()` added
4. ✅ Missing error handling - added try/catch blocks
5. ✅ Debug logging added for troubleshooting

### 🎯 Success Criteria
- All 4 buttons render on each card
- All buttons respond to clicks
- Actions complete successfully and persist
- No JavaScript errors in console
- Board state updates correctly after actions

### 🧩 Automated Test Coverage
The following tests verify button functionality:
- Unit tests for all card action methods
- Error handling verification
- Board persistence validation
- Edge case testing (cancelled operations, missing data)

Run tests with: `npm test kanban-card-unit.test.ts`