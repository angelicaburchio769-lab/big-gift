class ProjectManager {
    constructor(app) {
        this.app = app;
        this.appState = app.getAppState();
        this.AUTO_SAVE_INTERVAL = 30000;
        this.AUTO_SAVE_KEY = 'pixel-art-autosave';
        this.projectVersion = '1.1';
        this.autoSaveTimer = null;
        this.initAutoSave();
    }

    initAutoSave() {
        this.startAutoSave();
        window.addEventListener('beforeunload', () => {
            this.autoSave();
        });
    }

    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        this.autoSaveTimer = setInterval(() => {
            this.autoSave();
        }, this.AUTO_SAVE_INTERVAL);
    }

    stopAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
            this.autoSaveTimer = null;
        }
    }

    saveProject() {
        const project = this.collectProjectData();
        project.project.updatedAt = new Date().toISOString();
        
        const json = JSON.stringify(project, null, 2);
        this.downloadProject(json, project.project.name);
        
        this.appState.clean();
        
        return project;
    }

    collectProjectData() {
        const state = this.appState.getState();
        
        const project = {
            version: this.projectVersion,
            project: { ...state.project },
            images: {},
            currentTool: state.currentTool,
            settings: { ...state.settings },
            editor: { ...state.editor },
            history: state.history || [],
            currentHistoryIndex: state.currentHistoryIndex || -1
        };
        
        this.collectImages(project);
        this.collectToolSpecificData(project);
        
        return project;
    }

    collectImages(project) {
        const canvasIds = [
            'pixel-original-canvas',
            'pixel-result-canvas',
            'style-original-canvas',
            'style-result-canvas',
            'outline-original-canvas',
            'outline-result-canvas',
            'editor-canvas'
        ];
        
        canvasIds.forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas && canvas.width > 0 && canvas.height > 0) {
                project.images[id] = canvas.toDataURL('image/png');
            }
        });
        
        if (this.appState.hasOriginalImage()) {
            project.images.originalImage = this.appState.get('images.originalImage');
        }
        if (this.appState.hasImage()) {
            project.images.currentImage = this.appState.get('images.currentImage');
        }
        if (this.appState.hasProcessedImage()) {
            project.images.processedImage = this.appState.get('images.processedImage');
        }
    }

    collectToolSpecificData(project) {
        for (const [toolId, tool] of Object.entries(this.app.tools)) {
            project.settings[toolId] = project.settings[toolId] || {};
            
            if (toolId === 'pixel' && tool.pixelSize !== undefined) {
                project.settings.pixel.pixelSize = tool.pixelSize;
            }
            
            if (toolId === 'style') {
                project.settings.style.currentStyle = tool.currentStyle;
                project.settings.style.colorCount = tool.colorCount;
                project.settings.style.strength = tool.strength;
            }
            
            if (toolId === 'outline' && tool.settings) {
                project.settings.outline = { ...tool.settings };
            }
            
            if (toolId === 'editor') {
                project.editor.pixels = tool.pixels || [];
                project.editor.width = tool.width || 0;
                project.editor.height = tool.height || 0;
                project.editor.currentTool = tool.currentTool || 'brush';
                project.editor.currentColor = tool.currentColor || '#000000';
            }
        }
    }

    downloadProject(json, name) {
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${name || 'project'}.pixelart`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }

    autoSave() {
        try {
            const project = this.collectProjectData();
            project.project.updatedAt = new Date().toISOString();
            
            localStorage.setItem(this.AUTO_SAVE_KEY, JSON.stringify(project));
        } catch (e) {
            console.error('Auto save failed:', e);
        }
    }

    hasAutoSave() {
        return localStorage.getItem(this.AUTO_SAVE_KEY) !== null;
    }

    loadAutoSave() {
        const saved = localStorage.getItem(this.AUTO_SAVE_KEY);
        if (saved) {
            try {
                const project = JSON.parse(saved);
                return project;
            } catch (e) {
                console.error('Failed to parse auto save:', e);
                return null;
            }
        }
        return null;
    }

    loadProject(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const project = JSON.parse(e.target.result);
                    this.applyProject(project);
                    resolve(project);
                } catch (error) {
                    reject(new Error('无效的项目文件'));
                }
            };
            reader.onerror = () => {
                reject(new Error('读取文件失败'));
            };
            reader.readAsText(file);
        });
    }

    applyProject(project) {
        if (!project.version) {
            console.warn('项目版本未指定');
        }
        
        if (project.project) {
            this.appState.updateProjectInfo(project.project);
        }
        
        this.applyImages(project);
        
        if (project.settings) {
            for (const [toolId, settings] of Object.entries(project.settings)) {
                this.appState.updateToolSettings(toolId, settings);
            }
        }
        
        if (project.editor) {
            this.appState.updateEditorState(project.editor);
        }
        
        if (project.history) {
            this.appState.state.history = project.history;
            this.appState.state.currentHistoryIndex = project.currentHistoryIndex !== undefined ? project.currentHistoryIndex : -1;
        }
        
        this.applyToolSettings(project);
        
        localStorage.removeItem(this.AUTO_SAVE_KEY);
        
        this.appState.clean();
        
        if (project.currentTool) {
            this.appState.setCurrentTool(project.currentTool);
            this.app.switchTool(project.currentTool);
        }
    }

    applyImages(project) {
        if (project.images) {
            if (project.images.originalImage) {
                this.appState.set('images.originalImage', project.images.originalImage);
            }
            if (project.images.currentImage) {
                this.appState.set('images.currentImage', project.images.currentImage);
            }
            if (project.images.processedImage) {
                this.appState.set('images.processedImage', project.images.processedImage);
            }
            
            for (const [canvasId, dataUrl] of Object.entries(project.images)) {
                if (canvasId === 'originalImage' || canvasId === 'currentImage' || canvasId === 'processedImage') {
                    continue;
                }
                
                const canvas = document.getElementById(canvasId);
                if (canvas) {
                    const img = new Image();
                    img.onload = () => {
                        const ctx = canvas.getContext('2d');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        ctx.drawImage(img, 0, 0);
                    };
                    img.src = dataUrl;
                }
            }
        }
        
        if (project.images && project.images['editor-canvas']) {
            const editorTool = this.app.tools['editor'];
            if (editorTool) {
                const uploadArea = document.getElementById('editor-upload-area');
                const editorArea = document.getElementById('editor-main-area');
                if (uploadArea) uploadArea.style.display = 'none';
                if (editorArea) editorArea.style.display = 'flex';
            }
        }
    }

    applyToolSettings(project) {
        if (!project.settings) return;
        
        const pixelTool = this.app.tools['pixel'];
        if (pixelTool && project.settings.pixel) {
            const settings = project.settings.pixel;
            if (settings.pixelSize !== undefined) pixelTool.pixelSize = settings.pixelSize;
            
            const pixelSizeInput = document.getElementById('pixel-size');
            const pixelSizeValue = document.getElementById('pixel-size-value');
            if (pixelSizeInput) pixelSizeInput.value = pixelTool.pixelSize;
            if (pixelSizeValue) pixelSizeValue.textContent = pixelTool.pixelSize;
        }
        
        const styleTool = this.app.tools['style'];
        if (styleTool && project.settings.style) {
            const settings = project.settings.style;
            if (settings.currentStyle !== undefined) styleTool.currentStyle = settings.currentStyle;
            if (settings.colorCount !== undefined) styleTool.colorCount = settings.colorCount;
            if (settings.strength !== undefined) styleTool.strength = settings.strength;
            
            const colorCountInput = document.getElementById('style-color-count');
            const colorCountValue = document.getElementById('style-color-count-value');
            const strengthInput = document.getElementById('style-strength');
            const strengthValue = document.getElementById('style-strength-value');
            const styleSelect = document.getElementById('style-select');
            
            if (colorCountInput) colorCountInput.value = styleTool.colorCount;
            if (colorCountValue) colorCountValue.textContent = styleTool.colorCount;
            if (strengthInput) strengthInput.value = styleTool.strength;
            if (strengthValue) strengthValue.textContent = styleTool.strength;
            if (styleSelect) styleSelect.value = styleTool.currentStyle;
            
            document.querySelectorAll('.style-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.querySelector(`.style-btn[data-style="${styleTool.currentStyle}"]`);
            if (activeBtn) activeBtn.classList.add('active');
        }
        
        const outlineTool = this.app.tools['outline'];
        if (outlineTool && project.settings.outline && outlineTool.settings) {
            const settings = project.settings.outline;
            if (settings.enable !== undefined) outlineTool.settings.enable = settings.enable;
            if (settings.color !== undefined) outlineTool.settings.color = settings.color;
            if (settings.strength !== undefined) outlineTool.settings.strength = settings.strength;
            if (settings.threshold !== undefined) outlineTool.settings.threshold = settings.threshold;
            if (settings.width !== undefined) outlineTool.settings.width = settings.width;
            
            const enableInput = document.getElementById('outline-enable');
            const colorInput = document.getElementById('outline-color');
            const strengthInput = document.getElementById('outline-strength');
            const strengthValue = document.getElementById('outline-strength-value');
            const thresholdInput = document.getElementById('outline-threshold');
            const thresholdValue = document.getElementById('outline-threshold-value');
            const widthInput = document.getElementById('outline-width');
            const widthValue = document.getElementById('outline-width-value');
            
            if (enableInput) enableInput.checked = outlineTool.settings.enable;
            if (colorInput) colorInput.value = outlineTool.settings.color;
            if (strengthInput) strengthInput.value = outlineTool.settings.strength;
            if (strengthValue) strengthValue.textContent = outlineTool.settings.strength;
            if (thresholdInput) thresholdInput.value = outlineTool.settings.threshold;
            if (thresholdValue) thresholdValue.textContent = outlineTool.settings.threshold;
            if (widthInput) widthInput.value = outlineTool.settings.width;
            if (widthValue) widthValue.textContent = outlineTool.settings.width;
        }
        
        const editorTool = this.app.tools['editor'];
        if (editorTool && project.editor) {
            const settings = project.editor;
            if (settings.pixels) editorTool.pixels = settings.pixels;
            if (settings.width) editorTool.width = settings.width;
            if (settings.height) editorTool.height = settings.height;
            if (settings.currentTool) editorTool.currentTool = settings.currentTool;
            if (settings.currentColor) editorTool.currentColor = settings.currentColor;
            
            const canvas = document.getElementById('editor-canvas');
            if (canvas && editorTool.width && editorTool.height) {
                canvas.width = editorTool.width;
                canvas.height = editorTool.height;
                editorTool.drawCanvas();
            }
            
            const colorPicker = document.getElementById('editor-color');
            const colorPreview = document.getElementById('editor-color-preview');
            if (colorPicker) colorPicker.value = editorTool.currentColor;
            if (colorPreview) colorPreview.style.backgroundColor = editorTool.currentColor;
            
            document.querySelectorAll('.editor-tool-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = document.getElementById(`editor-tool-${editorTool.currentTool}`);
            if (activeBtn) activeBtn.classList.add('active');
        }
    }

    newProject() {
        localStorage.removeItem(this.AUTO_SAVE_KEY);
        
        const canvases = document.querySelectorAll('canvas');
        canvases.forEach(canvas => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
        });
        
        const uploadAreas = document.querySelectorAll('.upload-area');
        uploadAreas.forEach(area => {
            area.style.display = 'block';
        });
        
        const editorArea = document.getElementById('editor-main-area');
        if (editorArea) editorArea.style.display = 'none';
        
        this.appState.reset();
        this.app.switchTool('pixel');
    }

    promptRestore() {
        if (this.hasAutoSave()) {
            if (confirm('检测到未保存的项目，是否恢复？')) {
                const project = this.loadAutoSave();
                if (project) {
                    this.applyProject(project);
                }
            }
        }
    }
}

export default ProjectManager;
