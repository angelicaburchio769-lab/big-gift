import PixelTool from './tools/pixelTool.js';
import StyleTool from './tools/styleTool.js';
import OutlineTool from './tools/outlineTool.js';
import MinecraftTool from './tools/minecraftTool.js';
import EditorTool from './tools/editorTool.js';
import ProjectManager from './core/projectManager.js';
import AppState from './core/appState.js';
import Toast from './ui/toast.js';
import Modal from './ui/modal.js';

class App {
    constructor() {
        this.tools = {};
        this.currentTool = null;
        this.projectManager = null;
        this.appState = new AppState();
        this.toast = new Toast();
        this.modal = new Modal();
        this.init();
    }

    init() {
        this.registerTools();
        this.setupNavigation();
        this.initProjectManager();
        this.loadDefaultTool();
        this.setupStateListener();
        this.setupBeforeUnload();
    }

    registerTools() {
        this.tools['pixel'] = new PixelTool(this.appState, this.toast);
        this.tools['style'] = new StyleTool(this.appState, this.toast);
        this.tools['outline'] = new OutlineTool(this.appState, this.toast);
        this.tools['minecraft'] = new MinecraftTool(this.appState);
        this.tools['editor'] = new EditorTool(this.appState, this.toast);
    }

    initProjectManager() {
        this.projectManager = new ProjectManager(this);
        
        const newProjectBtn = document.getElementById('new-project');
        const openProjectBtn = document.getElementById('open-project');
        const saveProjectBtn = document.getElementById('save-project');
        const fileInput = document.getElementById('project-file-input');
        
        if (newProjectBtn) {
            newProjectBtn.addEventListener('click', () => this.handleNewProject());
        }
        
        if (openProjectBtn) {
            openProjectBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.projectManager.loadProject(file).then(() => {
                        this.toast.success('项目加载成功');
                    }).catch(error => {
                        this.toast.error(error.message);
                    });
                    fileInput.value = '';
                }
            });
        }
        
        if (saveProjectBtn) {
            saveProjectBtn.addEventListener('click', () => this.handleSaveProject());
        }
        
        setTimeout(() => {
            this.projectManager.promptRestore();
        }, 1000);
    }

    async handleNewProject() {
        if (this.appState.isDirty()) {
            const result = await this.modal.show({
                title: '新建项目',
                content: '<p>当前项目存在未保存修改，是否保存后再新建项目？</p>',
                buttons: [
                    { text: '保存并新建', primary: true, onClick: () => {
                        this.projectManager.saveProject();
                        this.projectManager.newProject();
                        this.toast.success('新项目已创建');
                    }},
                    { text: '直接新建', onClick: () => {
                        this.projectManager.newProject();
                        this.toast.info('新项目已创建');
                    }},
                    { text: '取消' }
                ]
            });
        } else {
            this.projectManager.newProject();
            this.toast.info('新项目已创建');
        }
    }

    async handleSaveProject() {
        const projectName = this.appState.get('project.name');
        
        if (projectName === 'Untitled Project') {
            const name = await this.modal.prompt('保存项目', '请输入项目名称:', 'Untitled Project');
            if (name && name.trim()) {
                this.appState.updateProjectInfo({ name: name.trim() });
            }
        }
        
        this.projectManager.saveProject();
        this.toast.success('项目保存成功');
    }

    setupNavigation() {
        const navBtns = document.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;
                const toolId = button.dataset.tool;
                this.switchTool(toolId);
            });
        });
    }

    switchTool(toolId) {
        if (!toolId) return;

        if (this.currentTool && this.tools[this.currentTool]) {
            this.tools[this.currentTool].deactivate();
        }

        const toolPanels = document.querySelectorAll('.tool-panel');
        const navBtns = document.querySelectorAll('.nav-btn');

        toolPanels.forEach(panel => panel.classList.remove('active'));
        navBtns.forEach(btn => btn.classList.remove('active'));

        const targetPanel = document.getElementById(`${toolId}-tool`);
        const targetBtn = document.querySelector(`.nav-btn[data-tool="${toolId}"]`);

        if (targetPanel && targetBtn) {
            targetPanel.classList.add('active');
            targetBtn.classList.add('active');
            
            this.appState.setCurrentTool(toolId);
            
            if (this.tools[toolId]) {
                this.tools[toolId].activate();
            }
            
            this.currentTool = toolId;
        }
    }

    loadDefaultTool() {
        this.switchTool('pixel');
    }

    getTool(toolId) {
        return this.tools[toolId] || null;
    }

    getProjectManager() {
        return this.projectManager;
    }

    getAppState() {
        return this.appState;
    }

    setupStateListener() {
        this.appState.subscribe((state) => {
            this.updateSaveStatus(state.isDirty);
            this.updateProjectName(state.project.name);
        });
    }

    updateSaveStatus(isDirty) {
        const statusElement = document.getElementById('save-status');
        if (statusElement) {
            if (isDirty) {
                statusElement.innerHTML = '<span class="status-dot"></span> 未保存';
                statusElement.className = 'save-status save-status-dirty';
            } else {
                statusElement.innerHTML = '<span class="status-check">✓</span> 已保存';
                statusElement.className = 'save-status save-status-clean';
            }
        }
    }

    updateProjectName(name) {
        const nameElement = document.getElementById('project-name');
        if (nameElement) {
            nameElement.textContent = name;
        }
    }

    setupBeforeUnload() {
        window.addEventListener('beforeunload', (e) => {
            if (this.appState.isDirty()) {
                e.preventDefault();
                e.returnValue = '当前项目存在未保存修改，确定要离开吗？';
                return '当前项目存在未保存修改，确定要离开吗？';
            }
        });
    }

    showNoImageWarning(toolId) {
        const warning = document.createElement('div');
        warning.className = 'no-image-warning';
        warning.innerHTML = `
            <div class="warning-icon">⚠️</div>
            <div class="warning-content">
                <h3>请先上传图片</h3>
                <p>当前项目没有可用的图片</p>
                <button class="use-current-btn" data-tool="${toolId}">使用当前项目图片</button>
            </div>
        `;
        
        const toolPanel = document.getElementById(`${toolId}-tool`);
        if (toolPanel) {
            toolPanel.appendChild(warning);
        }
    }

    removeNoImageWarning(toolId) {
        const toolPanel = document.getElementById(`${toolId}-tool`);
        if (toolPanel) {
            const warning = toolPanel.querySelector('.no-image-warning');
            if (warning) {
                warning.remove();
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

export default App;
