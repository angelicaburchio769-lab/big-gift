import ImageLoader from '../core/imageLoader.js';
import CanvasManager from '../core/canvasManager.js';
import Utils from '../core/utils.js';

class StyleTool {
    constructor(appState = null, toast = null) {
        this.appState = appState;
        this.toast = toast;
        this.imageLoader = new ImageLoader();
        this.originalCanvasManager = new CanvasManager('style-original-canvas');
        this.resultCanvasManager = new CanvasManager('style-result-canvas');
        this.currentImage = null;
        this.currentStyle = 'eightBit';
        this.colorCount = 16;
        this.strength = 50;
        this.isActive = false;
        this.MAX_DIMENSION = 4000;
        this.MAX_FILE_SIZE = 10 * 1024 * 1024;
        this.processCanvas = null;
        
        this.styleProcessors = {
            eightBit: this.processEightBit.bind(this),
            gameBoy: this.processGameBoy.bind(this),
            retro: this.processRetro.bind(this),
            cartoon: this.processCartoon.bind(this)
        };
        
        this.initEvents();
    }

    initEvents() {
        const uploadInput = document.getElementById('style-upload');
        const uploadArea = document.getElementById('style-upload-area');
        const styleBtns = document.querySelectorAll('.style-btn');
        const colorCountInput = document.getElementById('style-color-count');
        const colorCountValue = document.getElementById('style-color-count-value');
        const strengthInput = document.getElementById('style-strength');
        const strengthValue = document.getElementById('style-strength-value');
        const processBtn = document.getElementById('style-process');
        const downloadBtn = document.getElementById('style-download');
        const useCurrentBtn = document.getElementById('style-use-current');
        const continueBtn = document.getElementById('style-continue');

        const debouncedProcess = Utils.debounce(() => {
            if (this.currentImage) {
                this.processImage();
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

        styleBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const style = e.target.dataset.style;
                this.selectStyle(style);
            });
        });

        colorCountInput.addEventListener('input', (e) => {
            this.colorCount = parseInt(e.target.value);
            colorCountValue.textContent = this.colorCount;
            this.appState && this.appState.updateToolSettings('style', { colorCount: this.colorCount });
            debouncedProcess();
        });

        strengthInput.addEventListener('input', (e) => {
            this.strength = parseInt(e.target.value);
            strengthValue.textContent = this.strength + '%';
            this.appState && this.appState.updateToolSettings('style', { strength: this.strength });
            debouncedProcess();
        });

        processBtn.addEventListener('click', () => {
            this.processImage();
        });

        downloadBtn.addEventListener('click', () => {
            this.downloadImage();
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
            this.processImage();
            
            document.getElementById('style-download').disabled = false;
            document.getElementById('style-continue').disabled = false;
            document.getElementById('style-use-current').style.display = 'none';
            
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
            this.processImage();
            
            document.getElementById('style-download').disabled = false;
            document.getElementById('style-continue').disabled = false;
            document.getElementById('style-use-current').style.display = 'none';
            
            const uploadArea = document.getElementById('style-upload-area');
            if (uploadArea) uploadArea.style.display = 'none';
        };
        img.src = currentImageData;
    }

    continueProcessing() {
        const resultCanvas = this.resultCanvasManager.processedCanvas || document.getElementById('style-result-canvas');
        if (!resultCanvas || resultCanvas.width === 0) {
            this.toast && this.toast.warning('请先生成处理结果');
            return;
        }
        
        const processedDataUrl = resultCanvas.toDataURL('image/png');
        
        if (this.appState) {
            this.appState.setProcessedImage(processedDataUrl);
            this.appState.addToHistory(processedDataUrl, `style:${this.currentStyle}`);
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
        const maxWidth = 600;
        const maxHeight = 600;
        
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
        const ctx = this.originalCanvasManager.getContext();
        ctx.imageSmoothingEnabled = false;
        this.originalCanvasManager.drawImage(img, 0, 0, width, height);
    }

    selectStyle(style) {
        this.currentStyle = style;
        this.appState && this.appState.updateToolSettings('style', { currentStyle: this.currentStyle });
        
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`.style-btn[data-style="${style}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        if (this.currentImage) {
            this.processImage();
        }
    }

    processImage() {
        if (!this.currentImage || !this.processCanvas) {
            if (this.appState && this.appState.hasImage()) {
                this.useCurrentImage();
                return;
            }
            this.toast && this.toast.warning('请先上传图片或使用当前项目图片');
            return;
        }

        const processor = this.styleProcessors[this.currentStyle];
        if (!processor) return;
        
        const styledCanvas = processor(this.processCanvas);
        
        const maxDisplayWidth = 400;
        const maxDisplayHeight = 400;
        let displayWidth = styledCanvas.width;
        let displayHeight = styledCanvas.height;
        
        if (displayWidth > maxDisplayWidth) {
            displayHeight = Math.round((displayHeight * maxDisplayWidth) / displayWidth);
            displayWidth = maxDisplayWidth;
        }
        
        if (displayHeight > maxDisplayHeight) {
            displayWidth = Math.round((displayWidth * maxDisplayHeight) / displayHeight);
            displayHeight = maxDisplayHeight;
        }
        
        this.resultCanvasManager.setCanvasSize(displayWidth, displayHeight);
        const ctx = this.resultCanvasManager.getContext();
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(styledCanvas, 0, 0, displayWidth, displayHeight);
        
        this.resultCanvasManager.processedCanvas = styledCanvas;
        
        if (this.appState) {
            this.appState.setProcessedImage(styledCanvas.toDataURL('image/png'));
        }
        
        this.toast && this.toast.success('风格应用完成');
    }

    processEightBit(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        const step = Math.floor(256 / this.colorCount);
        const strengthFactor = this.strength / 100;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            const reducedR = Math.round(r / step) * step;
            const reducedG = Math.round(g / step) * step;
            const reducedB = Math.round(b / step) * step;
            
            pixels[i] = Utils.clamp(Math.round(r + (reducedR - r) * strengthFactor), 0, 255);
            pixels[i + 1] = Utils.clamp(Math.round(g + (reducedG - g) * strengthFactor), 0, 255);
            pixels[i + 2] = Utils.clamp(Math.round(b + (reducedB - b) * strengthFactor), 0, 255);
            pixels[i + 3] = a;
        }
        
        resultCtx.putImageData(imageData, 0, 0);
        
        return resultCanvas;
    }

    processGameBoy(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        const greenLevels = [
            { r: 15, g: 56, b: 15 },
            { r: 48, g: 98, b: 48 },
            { r: 139, g: 172, b: 15 },
            { r: 155, g: 188, b: 15 }
        ];
        
        const strengthFactor = this.strength / 100;
        
        for (let i = 0; i < pixels.length; i += 4) {
            const r = pixels[i];
            const g = pixels[i + 1];
            const b = pixels[i + 2];
            const a = pixels[i + 3];
            
            const gray = (r * 0.299) + (g * 0.587) + (b * 0.114);
            const levelIndex = Math.floor((gray / 255) * (greenLevels.length - 1));
            
            const targetColor = greenLevels[levelIndex];
            
            pixels[i] = Utils.clamp(Math.round(r + (targetColor.r - r) * strengthFactor), 0, 255);
            pixels[i + 1] = Utils.clamp(Math.round(g + (targetColor.g - g) * strengthFactor), 0, 255);
            pixels[i + 2] = Utils.clamp(Math.round(b + (targetColor.b - b) * strengthFactor), 0, 255);
            pixels[i + 3] = a;
        }
        
        resultCtx.putImageData(imageData, 0, 0);
        
        return resultCanvas;
    }

    processRetro(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        const strengthFactor = this.strength / 100;
        const contrastBoost = 1 + (strengthFactor * 0.3);
        const saturationBoost = 1 + (strengthFactor * 0.5);
        const brightnessBoost = 0.9 + (strengthFactor * 0.2);
        
        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i] / 255;
            let g = pixels[i + 1] / 255;
            let b = pixels[i + 2] / 255;
            const a = pixels[i + 3];
            
            r = ((r - 0.5) * contrastBoost + 0.5) * brightnessBoost;
            g = ((g - 0.5) * contrastBoost + 0.5) * brightnessBoost;
            b = ((b - 0.5) * contrastBoost + 0.5) * brightnessBoost;
            
            const gray = r * 0.299 + g * 0.587 + b * 0.114;
            r = gray + saturationBoost * (r - gray);
            g = gray + saturationBoost * (g - gray);
            b = gray + saturationBoost * (b - gray);
            
            pixels[i] = Utils.clamp(Math.round(r * 255), 0, 255);
            pixels[i + 1] = Utils.clamp(Math.round(g * 255), 0, 255);
            pixels[i + 2] = Utils.clamp(Math.round(b * 255), 0, 255);
            pixels[i + 3] = a;
        }
        
        resultCtx.putImageData(imageData, 0, 0);
        
        return resultCanvas;
    }

    processCartoon(sourceCanvas) {
        const ctx = sourceCanvas.getContext('2d');
        const width = sourceCanvas.width;
        const height = sourceCanvas.height;
        
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = width;
        resultCanvas.height = height;
        const resultCtx = resultCanvas.getContext('2d');
        
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        const strengthFactor = this.strength / 100;
        const edgeThreshold = 0.3 * (1 - strengthFactor);
        const step = Math.floor(256 / Math.max(8, this.colorCount));
        
        const edgeData = this.detectEdges(ctx, width, height, edgeThreshold);
        
        for (let i = 0; i < pixels.length; i += 4) {
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];
            const a = pixels[i + 3];
            
            if (edgeData[i / 4]) {
                r = g = b = Math.max(0, (r + g + b) / 3 - 50);
            } else {
                const reducedR = Math.round(r / step) * step;
                const reducedG = Math.round(g / step) * step;
                const reducedB = Math.round(b / step) * step;
                
                r = Utils.clamp(Math.round(r + (reducedR - r) * strengthFactor), 0, 255);
                g = Utils.clamp(Math.round(g + (reducedG - g) * strengthFactor), 0, 255);
                b = Utils.clamp(Math.round(b + (reducedB - b) * strengthFactor), 0, 255);
            }
            
            pixels[i] = r;
            pixels[i + 1] = g;
            pixels[i + 2] = b;
            pixels[i + 3] = a;
        }
        
        resultCtx.putImageData(imageData, 0, 0);
        
        return resultCanvas;
    }

    detectEdges(ctx, width, height, threshold) {
        const imageData = ctx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        const edgeData = new Uint8Array(width * height);
        
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
                
                const totalDiff = (diffX + diffY) / (3 * 255);
                
                if (totalDiff > threshold) {
                    edgeData[y * width + x] = 1;
                }
            }
        }
        
        return edgeData;
    }

    downloadImage() {
        const canvas = this.resultCanvasManager.processedCanvas || this.resultCanvasManager.getCanvas();
        if (!canvas) return;
        
        const link = document.createElement('a');
        link.download = 'pixel-style.png';
        link.href = canvas.toDataURL('image/png', 1.0);
        link.click();
    }

    activate() {
        this.isActive = true;
        
        if (this.appState && this.appState.hasImage() && !this.currentImage) {
            this.useCurrentImage();
        }
        
        const colorCountInput = document.getElementById('style-color-count');
        const colorCountValue = document.getElementById('style-color-count-value');
        const strengthInput = document.getElementById('style-strength');
        const strengthValue = document.getElementById('style-strength-value');
        
        if (colorCountInput) colorCountInput.value = this.colorCount;
        if (colorCountValue) colorCountValue.textContent = this.colorCount;
        if (strengthInput) strengthInput.value = this.strength;
        if (strengthValue) strengthValue.textContent = this.strength + '%';
        
        document.querySelectorAll('.style-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = document.querySelector(`.style-btn[data-style="${this.currentStyle}"]`);
        if (activeBtn) activeBtn.classList.add('active');
    }

    deactivate() {
        this.isActive = false;
    }
}

export default StyleTool;
