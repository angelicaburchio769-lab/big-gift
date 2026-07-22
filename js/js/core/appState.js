class AppState {
    constructor() {
        this.state = this.createInitialState();
        this.listeners = new Set();
    }

    createInitialState() {
        return {
            project: {
                id: null,
                name: 'Untitled Project',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            },
            images: {
                originalImage: null,
                currentImage: null,
                processedImage: null
            },
            currentTool: 'pixel',
            settings: {
                pixel: {
                    pixelSize: 10
                },
                style: {
                    currentStyle: 'eightBit',
                    colorCount: 16,
                    strength: 50
                },
                outline: {
                    enable: true,
                    color: '#000000',
                    strength: 50,
                    threshold: 30,
                    width: 1
                },
                editor: {}
            },
            editor: {
                pixels: [],
                width: 0,
                height: 0,
                currentTool: 'brush',
                currentColor: '#000000'
            },
            history: [],
            currentHistoryIndex: -1,
            isDirty: false
        };
    }

    getState() {
        return JSON.parse(JSON.stringify(this.state));
    }

    get(key) {
        const keys = key.split('.');
        let result = this.state;
        for (const k of keys) {
            if (result && typeof result === 'object' && k in result) {
                result = result[k];
            } else {
                return undefined;
            }
        }
        return result;
    }

    set(key, value) {
        const keys = key.split('.');
        const lastKey = keys.pop();
        let current = this.state;
        
        for (const k of keys) {
            if (!(k in current)) {
                current[k] = {};
            }
            current = current[k];
        }
        
        const oldValue = current[lastKey];
        current[lastKey] = value;
        
        if (JSON.stringify(oldValue) !== JSON.stringify(value)) {
            this.notify();
        }
    }

    setOriginalImage(image) {
        this.state.images.originalImage = image;
        this.state.images.currentImage = image;
        this.state.project.updatedAt = new Date().toISOString();
        this.setDirty();
        this.notify();
    }

    setCurrentImage(image) {
        this.state.images.currentImage = image;
        this.state.project.updatedAt = new Date().toISOString();
        this.setDirty();
        this.notify();
    }

    setProcessedImage(image) {
        this.state.images.processedImage = image;
        this.state.project.updatedAt = new Date().toISOString();
        this.setDirty();
        this.notify();
    }

    continueProcessing() {
        if (this.state.images.processedImage) {
            this.state.images.currentImage = this.state.images.processedImage;
            this.state.images.processedImage = null;
            this.state.project.updatedAt = new Date().toISOString();
            this.setDirty();
            this.notify();
            return true;
        }
        return false;
    }

    setCurrentTool(toolId) {
        this.state.currentTool = toolId;
        this.state.project.updatedAt = new Date().toISOString();
        this.notify();
    }

    updateToolSettings(toolId, settings) {
        this.state.settings[toolId] = { ...this.state.settings[toolId], ...settings };
        this.state.project.updatedAt = new Date().toISOString();
        this.setDirty();
        this.notify();
    }

    updateEditorState(editorState) {
        this.state.editor = { ...this.state.editor, ...editorState };
        this.state.project.updatedAt = new Date().toISOString();
        this.setDirty();
        this.notify();
    }

    updateProjectInfo(info) {
        this.state.project = { ...this.state.project, ...info };
        this.state.project.updatedAt = new Date().toISOString();
        this.setDirty();
        this.notify();
    }

    reset() {
        this.state = this.createInitialState();
        this.notify();
    }

    replaceState(newState) {
        this.state = { ...this.createInitialState(), ...newState };
        this.notify();
    }

    setDirty() {
        this.state.isDirty = true;
    }

    clean() {
        this.state.isDirty = false;
    }

    isDirty() {
        return this.state.isDirty;
    }

    addToHistory(imageData, action) {
        const historyEntry = {
            image: imageData,
            action: action,
            timestamp: new Date().toISOString()
        };

        if (this.state.currentHistoryIndex < this.state.history.length - 1) {
            this.state.history = this.state.history.slice(0, this.state.currentHistoryIndex + 1);
        }

        this.state.history.push(historyEntry);
        this.state.currentHistoryIndex = this.state.history.length - 1;
        this.setDirty();
        this.notify();
    }

    undoHistory() {
        if (this.state.currentHistoryIndex > 0) {
            this.state.currentHistoryIndex--;
            const entry = this.state.history[this.state.currentHistoryIndex];
            this.state.images.currentImage = entry.image;
            this.state.project.updatedAt = new Date().toISOString();
            this.setDirty();
            this.notify();
            return entry;
        }
        return null;
    }

    redoHistory() {
        if (this.state.currentHistoryIndex < this.state.history.length - 1) {
            this.state.currentHistoryIndex++;
            const entry = this.state.history[this.state.currentHistoryIndex];
            this.state.images.currentImage = entry.image;
            this.state.project.updatedAt = new Date().toISOString();
            this.setDirty();
            this.notify();
            return entry;
        }
        return null;
    }

    canUndo() {
        return this.state.currentHistoryIndex > 0;
    }

    canRedo() {
        return this.state.currentHistoryIndex < this.state.history.length - 1;
    }

    clearHistory() {
        this.state.history = [];
        this.state.currentHistoryIndex = -1;
        this.notify();
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    notify() {
        for (const listener of this.listeners) {
            try {
                listener(this.getState());
            } catch (e) {
                console.error('State listener error:', e);
            }
        }
    }

    hasImage() {
        return this.state.images.currentImage !== null;
    }

    hasOriginalImage() {
        return this.state.images.originalImage !== null;
    }

    hasProcessedImage() {
        return this.state.images.processedImage !== null;
    }

    toJSON() {
        return {
            version: '1.1',
            project: { ...this.state.project },
            images: { ...this.state.images },
            currentTool: this.state.currentTool,
            settings: { ...this.state.settings },
            editor: { ...this.state.editor },
            history: [...this.state.history],
            currentHistoryIndex: this.state.currentHistoryIndex,
            isDirty: this.state.isDirty
        };
    }

    fromJSON(json) {
        if (!json.version) {
            throw new Error('Invalid project format');
        }
        
        this.state = {
            project: json.project || this.state.project,
            images: json.images || this.state.images,
            currentTool: json.currentTool || 'pixel',
            settings: json.settings || this.state.settings,
            editor: json.editor || this.state.editor,
            history: json.history || [],
            currentHistoryIndex: json.currentHistoryIndex !== undefined ? json.currentHistoryIndex : -1,
            isDirty: false
        };
        
        this.state.project.updatedAt = new Date().toISOString();
        this.notify();
    }
}

export default AppState;
