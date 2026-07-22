class Utils {
    static debounce(func, wait) {
        let timeout;
        return function(...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    static rgbToHex(r, g, b) {
        return '#' + [r, g, b].map(x => {
            const hex = Math.round(x).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('').toUpperCase();
    }

    static hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : null;
    }

    static calculateColorDistance(rgb1, rgb2) {
        const rDiff = rgb1.r - rgb2.r;
        const gDiff = rgb1.g - rgb2.g;
        const bDiff = rgb1.b - rgb2.b;
        return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
    }

    static clamp(value, min, max) {
        return Math.min(Math.max(value, min), max);
    }

    static getAverageColor(pixels, startX, startY, blockWidth, blockHeight, imageWidth) {
        let r = 0, g = 0, b = 0;
        let count = 0;
        
        for (let y = startY; y < startY + blockHeight; y++) {
            for (let x = startX; x < startX + blockWidth; x++) {
                const idx = (y * imageWidth + x) * 4;
                if (idx + 3 < pixels.length && pixels[idx + 3] > 0) {
                    r += pixels[idx];
                    g += pixels[idx + 1];
                    b += pixels[idx + 2];
                    count++;
                }
            }
        }
        
        if (count === 0) return { r: 0, g: 0, b: 0 };
        
        return {
            r: Math.round(r / count),
            g: Math.round(g / count),
            b: Math.round(b / count)
        };
    }
}

export default Utils;
