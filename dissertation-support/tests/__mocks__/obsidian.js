// Mock the entire Obsidian module
const obsidianMock = {
    ItemView: class MockItemView {
        constructor(leaf) {}
        getViewType() { return 'mock'; }
        getDisplayText() { return 'Mock View'; }
        getIcon() { return 'mock'; }
        onOpen() { return Promise.resolve(); }
        onClose() { return Promise.resolve(); }
    },
    WorkspaceLeaf: class MockWorkspaceLeaf {},
    TFile: class MockTFile {
        constructor(path) {
            this.path = path;
        }
    },
    Notice: class MockNotice {
        constructor(message, timeout) {}
    },
    Modal: class MockModal {
        constructor(app) {}
        open() {}
        close() {}
    },
    App: class MockApp {
        constructor() {
            this.workspace = {
                getLeaf: () => ({
                    openFile: () => Promise.resolve()
                })
            };
            this.vault = {
                create: () => Promise.resolve({ path: 'test.md' }),
                getAbstractFileByPath: () => null
            };
        }
    }
};

module.exports = obsidianMock;