class HistoryManager {
    constructor(maxHistory = 20) {
        this.maxHistory = maxHistory;
        this.history = [];
        this.currentIndex = -1;
    }

    saveState(state) {
        if (this.currentIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.currentIndex + 1);
        }
        
        this.history.push(JSON.parse(JSON.stringify(state)));
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.currentIndex++;
        }
    }

    undo() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    redo() {
        if (this.currentIndex < this.history.length - 1) {
            this.currentIndex++;
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }

    canUndo() {
        return this.currentIndex > 0;
    }

    canRedo() {
        return this.currentIndex < this.history.length - 1;
    }

    clear() {
        this.history = [];
        this.currentIndex = -1;
    }

    getState() {
        if (this.currentIndex >= 0) {
            return JSON.parse(JSON.stringify(this.history[this.currentIndex]));
        }
        return null;
    }
}

export default HistoryManager;
