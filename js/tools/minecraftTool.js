class MinecraftTool {
    constructor(appState = null) {
        this.appState = appState;
        this.isActive = false;
    }

    activate() {
        this.isActive = true;
    }

    deactivate() {
        this.isActive = false;
    }
}

export default MinecraftTool;
