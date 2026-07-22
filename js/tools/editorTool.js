import ImageLoader from '../core/imageLoader.js';
import CanvasManager from '../core/canvasManager.js';
import HistoryManager from '../core/historyManager.js';

class EditorTool {
    constructor(appState = null, toast = null) {
        this.appState = appState;
        this.toast = toast;
        this.imageLoader = new ImageLoader();
        this.canvasManager = new CanvasManager('editor-canvas');
        this.historyManager = new HistoryManager(20);
        
        this.canvas = null;
        this.ctx = null;
        
        this.currentTool = 'brush';
        this.currentColor = '#000000';
        this.brushSize = 1;
        this.isDrawing = false;
        this.gridVisible = true;
        
        this.pixels = [];
        this.width = 0;
        this.height = 0;
        
        this.MAX_SIZE = 512;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024;
        
        this.initEvents();
    }

    initEvents() {
        const uploadInput = document.getElementById('editor-upload');
        const uploadArea = document.getElementById('editor-upload-area');
        const useCurrentBtn = document.getElementById('editor-use-current');
        
        if (uploadInput) {
            uploadInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
            });
        }
        
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('dragover');
            });
            
            uploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
            });
            
            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) {
                    this.handleFileUpload(file);
                }
            });
        }
        
        useCurrentBtn && useCurrentBtn.addEventListener('click', () => {
            this.useCurrentImage();
        });
        
        this.setupToolButtons();
        this.setupColorPicker();
        this.setupBrushSize();
        this.setupActionButtons();
        this.setupCanvasEvents();
    }

    setupToolButtons() {
        const tools = ['brush', 'eraser', 'fill', 'picker'];
        tools.forEach(tool => {
            const btn = document.getElementById(`editor-tool-${tool}`);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.selectTool(tool);
                });
            }
        });
    }

    setupColorPicker() {
        const colorPicker = document.getElementById('editor-color');
        const colorPreview = document.getElementById('editor-color-preview');
        
        if (colorPicker) {
            colorPicker.value = this.currentColor;
            
            colorPicker.addEventListener('input', (e) => {
                this.currentColor = e.target.value;
                this.appState && this.appState.updateEditorState({ currentColor: this.currentColor });
                if (colorPreview) {
                    colorPreview.style.backgroundColor = this.currentColor;
                }
            });
        }
    }

    setupBrushSize() {
        const brushSizeInput = document.getElementById('editor-brush-size');
        const brushSizeValue = document.getElementById('editor-brush-size-value');
        
        if (brushSizeInput) {
            brushSizeInput.value = this.brushSize;
            if (brushSizeValue) {
                brushSizeValue.textContent = `${this.brushSize}px`;
            }
            
            brushSizeInput.addEventListener('input', (e) => {
                this.brushSize = parseInt(e.target.value);
                if (brushSizeValue) {
                    brushSizeValue.textContent = `${this.brushSize}px`;
                }
                this.appState && this.appState.updateEditorState({ brushSize: this.brushSize });
            });
        }
    }

    setupActionButtons() {
        const buttons = [
            { id: 'editor-undo', action: 'undo' },
            { id: 'editor-redo', action: 'redo' },
            { id: 'editor-clear', action: 'clear' },
            { id: 'editor-reset', action: 'reset' },
            { id: 'editor-download', action: 'download' }
        ];
        
        buttons.forEach(btn => {
            const element = document.getElementById(btn.id);
            if (element) {
                element.addEventListener('click', () => {
                    this.handleAction(btn.action);
                });
            }
        });
        
        const deleteBtn = document.getElementById('editor-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.confirmDeleteImage();
            });
        }
    }

    setupCanvasEvents() {
        this.canvas = document.getElementById('editor-canvas');
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.canvas.style.touchAction = 'none';
        
        this.canvas.addEventListener('mousedown', (e) => {
            this.startDrawing(e);
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing) {
                this.draw(e);
            }
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.stopDrawing();
        });
        
        this.canvas.addEventListener('mouseleave', () => {
            this.stopDrawing();
        });
        
        this.canvas.addEventListener('click', (e) => {
            if (!this.isDrawing) {
                this.handleCanvasClick(e);
            }
        });
        
        this.canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            this.startDrawing(touch);
        });
        
        this.canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (this.isDrawing) {
                const touch = e.touches[0];
                this.draw(touch);
            }
        });
        
        this.canvas.addEventListener('touchend', () => {
            this.stopDrawing();
        });
        
        this.canvas.addEventListener('touchcancel', () => {
            this.stopDrawing();
        });
    }

    handleFileUpload(file) {
        if (file.size > this.MAX_FILE_SIZE) {
            this.toast && this.toast.error('文件大小不能超过10MB');
            return;
        }
        
        this.imageLoader.loadFromFile(file, (error, img) => {
            if (error) {
                console.error('图片加载失败:', error);
                this.toast && this.toast.error('图片加载失败');
                return;
            }
            
            this.loadImage(img);
            if (this.appState) {
                this.appState.setOriginalImage(img.src);
                this.appState.addToHistory(img.src, 'upload');
            }
            this.toast && this.toast.success('图片上传成功');
        });
    }

    useCurrentImage() {
        if (!this.appState || !this.appState.hasImage()) {
            this.toast && this.toast.warning('当前项目没有可用的图片');
            return;
        }
        
        const currentImageData = this.appState.get('images.currentImage');
        if (!currentImageData) {
            this.toast && this.toast.warning('当前项目没有可用的图片');
            return;
        }
        
        const img = new Image();
        img.onload = () => {
            this.loadImage(img);
            const useCurrentBtn = document.getElementById('editor-use-current');
            if (useCurrentBtn) useCurrentBtn.style.display = 'none';
            this.toast && this.toast.success('图片加载成功');
        };
        img.src = currentImageData;
    }

    loadImage(img) {
        let width = img.width;
        let height = img.height;
        
        if (width > this.MAX_SIZE || height > this.MAX_SIZE) {
            const scale = Math.min(this.MAX_SIZE / width, this.MAX_SIZE / height);
            width = Math.round(width * scale);
            height = Math.round(height * scale);
        }
        
        this.width = width;
        this.height = height;
        
        this.canvas.width = width;
        this.canvas.height = height;
        
        this.ctx.drawImage(img, 0, 0, width, height);
        
        this.loadPixels();
        this.saveState();
        
        if (this.appState) {
            this.appState.updateEditorState({
                pixels: this.pixels,
                width: this.width,
                height: this.height,
                currentTool: this.currentTool,
                currentColor: this.currentColor
            });
        }
        
        this.showEditor();
    }

    loadPixels() {
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        
        this.pixels = [];
        for (let y = 0; y < this.height; y++) {
            this.pixels[y] = [];
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                this.pixels[y][x] = {
                    r: data[idx],
                    g: data[idx + 1],
                    b: data[idx + 2],
                    a: data[idx + 3]
                };
            }
        }
    }

    createNewCanvas(width = 64, height = 64) {
        this.width = Math.min(width, this.MAX_SIZE);
        this.height = Math.min(height, this.MAX_SIZE);
        
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        
        this.pixels = [];
        for (let y = 0; y < this.height; y++) {
            this.pixels[y] = [];
            for (let x = 0; x < this.width; x++) {
                this.pixels[y][x] = {
                    r: 0,
                    g: 0,
                    b: 0,
                    a: 0
                };
            }
        }
        
        this.saveState();
        this.drawCanvas();
        this.showEditor();
    }

    showEditor() {
        const uploadArea = document.getElementById('editor-upload-area');
        const editorArea = document.getElementById('editor-main-area');
        
        if (uploadArea) uploadArea.style.display = 'none';
        if (editorArea) editorArea.style.display = 'flex';
    }

    selectTool(tool) {
        this.currentTool = tool;
        this.appState && this.appState.updateEditorState({ currentTool: this.currentTool });
        
        document.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.getElementById(`editor-tool-${tool}`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
    }

    startDrawing(e) {
        this.isDrawing = true;
        this.draw(e);
    }

    draw(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (this.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (this.height / rect.height));
        
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        const color = this.currentTool === 'eraser' ? 'transparent' : this.currentColor;
        
        const size = this.brushSize;
        const halfSize = Math.floor(size / 2);
        
        for (let dy = -halfSize; dy <= halfSize; dy++) {
            for (let dx = -halfSize; dx <= halfSize; dx++) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
                    this.setPixel(nx, ny, color);
                }
            }
        }
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            this.saveState();
            
            if (this.appState) {
                this.appState.updateEditorState({
                    pixels: this.pixels,
                    width: this.width,
                    height: this.height
                });
            }
        }
    }

    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((e.clientX - rect.left) * (this.width / rect.width));
        const y = Math.floor((e.clientY - rect.top) * (this.height / rect.height));
        
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        if (this.currentTool === 'fill') {
            this.floodFill(x, y, this.currentColor);
            this.saveState();
            
            if (this.appState) {
                this.appState.updateEditorState({
                    pixels: this.pixels,
                    width: this.width,
                    height: this.height
                });
            }
        } else if (this.currentTool === 'picker') {
            const pixel = this.pixels[y][x];
            if (pixel) {
                const color = this.rgbaToHex(pixel.r, pixel.g, pixel.b);
                this.currentColor = color;
                this.appState && this.appState.updateEditorState({ currentColor: this.currentColor });
                
                const colorPicker = document.getElementById('editor-color');
                const colorPreview = document.getElementById('editor-color-preview');
                
                if (colorPicker) colorPicker.value = color;
                if (colorPreview) colorPreview.style.backgroundColor = color;
            }
        }
    }

    setPixel(x, y, color) {
        if (x < 0 || x >= this.width || y < 0 || y >= this.height) return;
        
        let r, g, b, a;
        
        if (color === 'transparent') {
            r = 0;
            g = 0;
            b = 0;
            a = 0;
        } else {
            const rgb = this.hexToRgb(color);
            r = rgb.r;
            g = rgb.g;
            b = rgb.b;
            a = 255;
        }
        
        this.pixels[y][x] = { r, g, b, a };
        this.drawPixel(x, y, r, g, b, a);
    }

    drawPixel(x, y, r, g, b, a) {
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${a / 255})`;
        this.ctx.fillRect(x, y, 1, 1);
    }

    drawCanvas() {
        const imageData = this.ctx.createImageData(this.width, this.height);
        const data = imageData.data;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = (y * this.width + x) * 4;
                const pixel = this.pixels[y][x];
                data[idx] = pixel.r;
                data[idx + 1] = pixel.g;
                data[idx + 2] = pixel.b;
                data[idx + 3] = pixel.a;
            }
        }
        
        this.ctx.putImageData(imageData, 0, 0);
        
        this.drawGrid();
    }

    drawGrid() {
        if (!this.gridVisible) return;
        
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = rect.width / this.width;
        const scaleY = rect.height / this.height;
        
        if (scaleX < 2 || scaleY < 2) return;
        
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        this.ctx.lineWidth = 0.5;
        
        this.ctx.beginPath();
        for (let x = 0; x <= this.width; x++) {
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
        }
        for (let y = 0; y <= this.height; y++) {
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
        }
        this.ctx.stroke();
    }

    floodFill(startX, startY, color) {
        const targetPixel = this.pixels[startY][startX];
        if (!targetPixel) return;
        
        const targetColor = {
            r: targetPixel.r,
            g: targetPixel.g,
            b: targetPixel.b,
            a: targetPixel.a
        };
        
        const rgb = this.hexToRgb(color);
        const newColor = {
            r: rgb.r,
            g: rgb.g,
            b: rgb.b,
            a: 255
        };
        
        if (this.colorsEqual(targetColor, newColor)) return;
        
        const stack = [{ x: startX, y: startY }];
        const visited = new Set();
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            
            if (x < 0 || x >= this.width || y < 0 || y >= this.height) continue;
            
            const key = `${x},${y}`;
            if (visited.has(key)) continue;
            visited.add(key);
            
            const pixel = this.pixels[y][x];
            if (!this.colorsEqual(pixel, targetColor)) continue;
            
            this.pixels[y][x] = { ...newColor };
            
            stack.push({ x: x + 1, y });
            stack.push({ x: x - 1, y });
            stack.push({ x, y: y + 1 });
            stack.push({ x, y: y - 1 });
        }
        
        this.drawCanvas();
    }

    colorsEqual(c1, c2) {
        return c1.r === c2.r && c1.g === c2.g && c1.b === c2.b && c1.a === c2.a;
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 0, g: 0, b: 0 };
    }

    rgbaToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    handleAction(action) {
        switch (action) {
            case 'undo':
                this.undo();
                break;
            case 'redo':
                this.redo();
                break;
            case 'clear':
                this.clear();
                break;
            case 'reset':
                this.reset();
                break;
            case 'download':
                this.download();
                break;
        }
    }

    saveState() {
        this.historyManager.saveState({
            pixels: this.pixels,
            width: this.width,
            height: this.height
        });
        this.updateUndoRedoButtons();
    }

    undo() {
        const state = this.historyManager.undo();
        if (state) {
            this.pixels = state.pixels;
            this.width = state.width;
            this.height = state.height;
            this.drawCanvas();
        }
        this.updateUndoRedoButtons();
    }

    redo() {
        const state = this.historyManager.redo();
        if (state) {
            this.pixels = state.pixels;
            this.width = state.width;
            this.height = state.height;
            this.drawCanvas();
        }
        this.updateUndoRedoButtons();
    }

    updateUndoRedoButtons() {
        const undoBtn = document.getElementById('editor-undo');
        const redoBtn = document.getElementById('editor-redo');
        
        if (undoBtn) undoBtn.disabled = !this.historyManager.canUndo();
        if (redoBtn) redoBtn.disabled = !this.historyManager.canRedo();
    }

    clear() {
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                this.pixels[y][x] = { r: 0, g: 0, b: 0, a: 0 };
            }
        }
        this.drawCanvas();
        this.saveState();
        
        if (this.appState) {
            this.appState.updateEditorState({ pixels: this.pixels });
        }
    }

    reset() {
        this.historyManager.clear();
        this.canvas.width = 0;
        this.canvas.height = 0;
        
        const uploadArea = document.getElementById('editor-upload-area');
        const editorArea = document.getElementById('editor-main-area');
        
        if (uploadArea) uploadArea.style.display = 'block';
        if (editorArea) editorArea.style.display = 'none';
        
        this.updateUndoRedoButtons();
    }

    confirmDeleteImage() {
        if (!this.canvas || this.canvas.width === 0) {
            this.toast && this.toast.warning('当前没有可删除的图片');
            return;
        }
        
        const confirmed = confirm('确定删除当前图片吗？\n删除后无法恢复。');
        if (confirmed) {
            this.deleteImage();
        }
    }

    deleteImage() {
        this.pixels = [];
        this.width = 0;
        this.height = 0;
        this.historyManager.clear();
        
        this.canvas.width = 0;
        this.canvas.height = 0;
        
        const uploadArea = document.getElementById('editor-upload-area');
        const editorArea = document.getElementById('editor-main-area');
        
        if (uploadArea) uploadArea.style.display = 'block';
        if (editorArea) editorArea.style.display = 'none';
        
        this.updateUndoRedoButtons();
        
        if (this.appState) {
            this.appState.updateEditorState({
                pixels: [],
                width: 0,
                height: 0
            });
        }
        
        this.toast && this.toast.success('图片已删除');
    }

    download() {
        if (!this.canvas || this.canvas.width === 0) {
            alert('请先创建或上传图片');
            return;
        }
        
        const link = document.createElement('a');
        link.download = 'pixel-art.png';
        link.href = this.canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    activate() {
        this.isActive = true;
        this.updateUndoRedoButtons();
        
        if (this.appState && this.appState.hasImage() && this.width === 0) {
            this.useCurrentImage();
        }
        
        const colorPicker = document.getElementById('editor-color');
        const colorPreview = document.getElementById('editor-color-preview');
        if (colorPicker) colorPicker.value = this.currentColor;
        if (colorPreview) colorPreview.style.backgroundColor = this.currentColor;
        
        const brushSizeInput = document.getElementById('editor-brush-size');
        const brushSizeValue = document.getElementById('editor-brush-size-value');
        if (brushSizeInput) brushSizeInput.value = this.brushSize;
        if (brushSizeValue) brushSizeValue.textContent = `${this.brushSize}px`;
        
        document.querySelectorAll('.editor-tool-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.getElementById(`editor-tool-${this.currentTool}`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    deactivate() {
        this.isActive = false;
    }
}

export default EditorTool;
