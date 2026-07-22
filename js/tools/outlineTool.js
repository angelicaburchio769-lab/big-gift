import ImageLoader from '../core/imageLoader.js';
import CanvasManager from '../core/canvasManager.js';
import Utils from '../core/utils.js';

class OutlineTool {
    constructor(appState = null, toast = null) {
        this.appState = appState;
        this.toast = toast;
        this.imageLoader = new ImageLoader();
        this.originalCanvasManager = new CanvasManager('outline-original-canvas');
        this.resultCanvasManager = new CanvasManager('outline-result-canvas');
        this.currentImage = null;
        this.processCanvas = null;
        this.isActive = false;
        this.MAX_DIMENSION = 4000;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024;
        
        this.settings = {
            enable: true,
            color: '#000000',
            strength: 50,
            threshold: 30,
            width: 1
        };
        
        this.initEvents();
    }

    initEvents() {
        const uploadInput = document.getElementById('outline-upload');
        const uploadArea = document.getElementById('outline-upload-area');
        const enableCheckbox = document.getElementById('outline-enable');
        const colorInput = document.getElementById('outline-color');
        const strengthInput = document.getElementById('outline-strength');
        const strengthValue = document.getElementById('outline-strength-value');
        const thresholdInput = document.getElementById('outline-threshold');
        const thresholdValue = document.getElementById('outline-threshold-value');
        const widthInput = document.getElementById('outline-width');
        const widthValue = document.getElementById('outline-width-value');
        const processBtn = document.getElementById('outline-process');
        const downloadBtn = document.getElementById('outline-download');
        const useCurrentBtn = document.getElementById('outline-use-current');
        const continueBtn = document.getElementById('outline-continue');

        const debouncedProcess = Utils.debounce(() => {
            if (this.currentImage) {
                this.processOutline();
            }
        }, 100);

        uploadInput.addEventListener('change', (e) => {
            this.handleFileUpload(e.target.files[0]);
        });

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
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileUpload(files[0]);
            }
        });

        enableCheckbox.addEventListener('change', (e) => {
            this.settings.enable = e.target.checked;
            this.appState && this.appState.updateToolSettings('outline', { enable: this.settings.enable });
            debouncedProcess();
        });

        colorInput.addEventListener('change', (e) => {
            this.settings.color = e.target.value;
            this.appState && this.appState.updateToolSettings('outline', { color: this.settings.color });
            debouncedProcess();
        });

        strengthInput.addEventListener('input', (e) => {
            this.settings.strength = parseInt(e.target.value);
            strengthValue.textContent = this.settings.strength + '%';
            this.appState && this.appState.updateToolSettings('outline', { strength: this.settings.strength });
            debouncedProcess();
        });

        thresholdInput.addEventListener('input', (e) => {
            this.settings.threshold = parseInt(e.target.value);
            thresholdValue.textContent = this.settings.threshold;
            this.appState && this.appState.updateToolSettings('outline', { threshold: this.settings.threshold });
            debouncedProcess();
        });

        widthInput.addEventListener('input', (e) => {
            this.settings.width = parseInt(e.target.value);
            widthValue.textContent = this.settings.width;
            this.appState && this.appState.updateToolSettings('outline', { width: this.settings.width });
            debouncedProcess();
        });

        processBtn.addEventListener('click', () => {
            this.processOutline();
        });

        downloadBtn.addEventListener('click', () => {
            this.exportOutlineImage();
        });

        useCurrentBtn && useCurrentBtn.addEventListener('click', () => {
            this.useCurrentImage();
        });

        continueBtn && continueBtn.addEventListener('click', () => {
            this.continueProcessing();
        });
    }

    handleFileUpload(file) {
        if (!file) return;
        
        if (file.size > this.MAX_FILE_SIZE) {
            this.toast && this.toast.error('文件大小超过限制（最大10MB）');
            return;
        }
        
        this.imageLoader.loadFromFile(file, (error, img) => {
            if (error) {
                this.toast && this.toast.error(error.message);
                return;
            }
            
            this.currentImage = img;
            
            if (this.appState) {
                this.appState.setOriginalImage(img.src);
                this.appState.addToHistory(img.src, 'upload');
            }
            
            this.prepareProcessCanvas(img);
            this.displayOriginalImage(img);
            this.processOutline();
            
            document.getElementById('outline-download').disabled = false;
            document.getElementById('outline-continue').disabled = false;
            document.getElementById('outline-use-current').style.display = 'none';
            
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
            this.currentImage = img;
            this.prepareProcessCanvas(img);
            this.displayOriginalImage(img);
            this.processOutline();
            
            document.getElementById('outline-download').disabled = false;
            document.getElementById('outline-continue').disabled = false;
            document.getElementById('outline-use-current').style.display = 'none';
            
            const uploadArea = document.getElementById('outline-upload-area');
            if (uploadArea) uploadArea.style.display = 'none';
        };
        img.src = currentImageData;
    }

    continueProcessing() {
        const resultCanvas = this.resultCanvasManager.processedCanvas || document.getElementById('outline-result-canvas');
        if (!resultCanvas || resultCanvas.width === 0) {
            this.toast && this.toast.warning('请先生成处理结果');
            return;
        }
        
        const processedDataUrl = resultCanvas.toDataURL('image/png');
        
        if (this.appState) {
            this.appState.setProcessedImage(processedDataUrl);
            this.appState.addToHistory(processedDataUrl, 'outline');
            this.appState.continueProcessing();
        }
        
        this.toast && this.toast.success('处理结果已保存，可以继续使用其他工具');
    }

    prepareProcessCanvas(img) {
        let width = img.width;
        let height = img.height;
        
        if (width > this.MAX_DIMENSION) {
            height = Math.round((height * this.MAX_DIMENSION) / width);
            width = this.MAX_DIMENSION;
        }
        
        if (height > this.MAX_DIMENSION) {
            width = Math.round((width * this.MAX_DIMENSION) / height);
            height = this.MAX_DIMENSION;
        }
        
        this.processCanvas = document.createElement('canvas');
        this.processCanvas.width = width;
        this.processCanvas.height = height;
        
        const ctx = this.processCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
    }

    displayOriginalImage(img) {
        const maxWidth = 400;
        const maxHeight = 400;
        
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        this.originalCanvasManager.setCanvasSize(width, height);
        this.originalCanvasManager.drawImage(img, 0, 0, width, height);
    }

    processOutline() {
        if (!this.currentImage || !this.processCanvas) {
            if (this.appState && this.appState.hasImage()) {
                this.useCurrentImage();
                return;
            }
            this.toast && this.toast.warning('请先上传图片或使用当前项目图片');
            return;
        }

        if (!this.settings.enable) {
            this.showOriginalOnResult();
            return;
        }

        const outlineCanvas = this.drawOutline(this.processCanvas);
        
        this.resultCanvasManager.processedCanvas = outlineCanvas;
        this.displayResult(outlineCanvas);
        
        if (this.appState) {
            this.appState.setProcessedImage(outlineCanvas.toDataURL('image/png'));
        }
        
        this.toast && this.toast.success('描边完成');
    }

    showOriginalOnResult() {
        const maxWidth = 400;
        const maxHeight = 400;
        let width = this.processCanvas.width;
        let height = this.processCanvas.height;
        
        if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
        }
        
        if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
        }
        
        this.resultCanvasManager.setCanvasSize(width, height);
        const ctx = this.resultCanvasManager.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(this.processCanvas, 0, 0, width, height);
        
        this.resultCanvasManager.processedCanvas = this.processCanvas;
        
        if (this.appState) {
            this.appState.setProcessedImage(this.processCanvas.toDataURL('image/png'));
        }
    }

    detectEdges(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        const edgeData = new Uint8Array(width * height);
        const threshold = this.settings.threshold;
        const strengthFactor = this.settings.strength / 100;
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const idx = (y * width + x) * 4;
                
                const r = pixels[idx];
                const g = pixels[idx + 1];
                const b = pixels[idx + 2];
                
                const leftIdx = ((y) * width + (x - 1)) * 4;
                const rightIdx = ((y) * width + (x + 1)) * 4;
                const topIdx = ((y - 1) * width + x) * 4;
                const bottomIdx = ((y + 1) * width + x) * 4;
                
                const diffX = Math.abs(pixels[leftIdx] - pixels[rightIdx]) +
                            Math.abs(pixels[leftIdx + 1] - pixels[rightIdx + 1]) +
                            Math.abs(pixels[leftIdx + 2] - pixels[rightIdx + 2]);
                
                const diffY = Math.abs(pixels[topIdx] - pixels[bottomIdx]) +
                            Math.abs(pixels[topIdx + 1] - pixels[bottomIdx + 1]) +
                            Math.abs(pixels[topIdx + 2] - pixels[bottomIdx + 2]);
                
                const totalDiff = (diffX + diffY) / (3 * 2);
                
                if (totalDiff > threshold * strengthFactor) {
                    edgeData[y * width + x] = 1;
                }
            }
        }
        
        return edgeData;
    }

    drawOutline(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        
        resultCtx.drawImage(sourceCanvas, 0, 0);
        
        const edgeData = this.detectEdges(sourceCanvas);
        const outlineColor = this.settings.color;
        const outlineWidth = this.settings.width;
        
        resultCtx.fillStyle = outlineColor;
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (edgeData[y * width + x]) {
                    this.fillOutlinePixel(resultCtx, x, y, outlineWidth);
                }
            }
        }
        
        return resultCanvas;
    }

    fillOutlinePixel(ctx, x, y, width) {
        const halfWidth = Math.floor(width / 2);
        for (let dy = -halfWidth; dy <= halfWidth; dy++) {
            for (let dx = -halfWidth; dx <= halfWidth; dx++) {
                ctx.fillRect(x + dx, y + dy, 1, 1);
            }
        }
    }

    displayResult(outlineCanvas) {
        const maxWidth = 400;
        const maxHeight = 400;
        let displayWidth = outlineCanvas.width;
        let displayHeight = outlineCanvas.height;
        
        if (displayWidth > maxWidth) {
            displayHeight = Math.round((displayHeight * maxWidth) / displayWidth);
            displayWidth = maxWidth;
        }
        
        if (displayHeight > maxHeight) {
            displayWidth = Math.round((displayWidth * maxHeight) / displayHeight);
            displayHeight = maxHeight;
        }
        
        this.resultCanvasManager.setCanvasSize(displayWidth, displayHeight);
        const ctx = this.resultCanvasManager.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(outlineCanvas, 0, 0, displayWidth, displayHeight);
    }

    exportOutlineImage() {
        const canvas = this.resultCanvasManager.processedCanvas || this.resultCanvasManager.getCanvas();
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'outline-image.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }

    activate() {
        this.isActive = true;
        
        if (this.appState && this.appState.hasImage() && !this.currentImage) {
            this.useCurrentImage();
        }
        
        const enableInput = document.getElementById('outline-enable');
        const colorInput = document.getElementById('outline-color');
        const strengthInput = document.getElementById('outline-strength');
        const strengthValue = document.getElementById('outline-strength-value');
        const thresholdInput = document.getElementById('outline-threshold');
        const thresholdValue = document.getElementById('outline-threshold-value');
        const widthInput = document.getElementById('outline-width');
        const widthValue = document.getElementById('outline-width-value');
        
        if (enableInput) enableInput.checked = this.settings.enable;
        if (colorInput) colorInput.value = this.settings.color;
        if (strengthInput) strengthInput.value = this.settings.strength;
        if (strengthValue) strengthValue.textContent = this.settings.strength + '%';
        if (thresholdInput) thresholdInput.value = this.settings.threshold;
        if (thresholdValue) thresholdValue.textContent = this.settings.threshold;
        if (widthInput) widthInput.value = this.settings.width;
        if (widthValue) widthValue.textContent = this.settings.width;
    }

    deactivate() {
        this.isActive = false;
    }
}

export default OutlineTool;
