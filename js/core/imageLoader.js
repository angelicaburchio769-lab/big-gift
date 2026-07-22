class ImageLoader {
    constructor() {
        this.supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp'];
    }

    loadFromFile(file, callback) {
        if (!file) {
            callback(new Error('未选择文件'), null);
            return;
        }

        if (!this.isValidFileType(file.type)) {
            callback(new Error('不支持的文件类型'), null);
            return;
        }

        const reader = new FileReader();
        
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                callback(null, img);
            };
            img.onerror = () => {
                callback(new Error('图片加载失败'), null);
            };
            img.src = e.target.result;
        };

        reader.onerror = () => {
            callback(new Error('文件读取失败'), null);
        };

        reader.readAsDataURL(file);
    }

    isValidFileType(type) {
        return this.supportedTypes.includes(type);
    }

    createImageFromUrl(url, callback) {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => {
            callback(null, img);
        };
        
        img.onerror = () => {
            callback(new Error('图片加载失败'), null);
        };
        
        img.src = url;
    }

    getImageInfo(img) {
        return {
            width: img.width,
            height: img.height,
            type: 'image/png'
        };
    }
}

export default ImageLoader;
