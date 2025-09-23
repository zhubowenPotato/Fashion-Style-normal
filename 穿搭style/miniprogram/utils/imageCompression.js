/**
 * 图片压缩工具类
 * 在小程序端进行图片压缩，减少云函数处理时间
 */

class ImageCompression {
  constructor() {
    this.maxSize = 200 * 1024; // 200KB
    this.quality = 0.8; // 压缩质量
    this.maxWidth = 1024; // 最大宽度
    this.maxHeight = 1024; // 最大高度
  }

  /**
   * 压缩图片
   * @param {string} filePath - 图片文件路径
   * @param {Object} options - 压缩选项
   * @returns {Promise<string>} 压缩后的base64数据
   */
  async compressImage(filePath, options = {}) {
    try {
      console.log('开始压缩图片:', filePath);
      
      // 获取图片信息
      const imageInfo = await this.getImageInfo(filePath);
      console.log('原始图片信息:', imageInfo);
      
      // 计算压缩参数
      const compressOptions = this.calculateCompressOptions(imageInfo, options);
      console.log('压缩参数:', compressOptions);
      
      // 执行压缩
      const compressedPath = await this.performCompression(filePath, compressOptions);
      console.log('压缩完成，新路径:', compressedPath);
      
      // 转换为base64
      const base64 = await this.fileToBase64(compressedPath);
      console.log('转换为base64完成，大小:', base64.length, 'bytes');
      
      // 验证压缩结果
      const maxSize = options.maxSize || this.maxSize;
      if (base64.length > maxSize) {
        console.warn(`压缩后大小 ${base64.length} bytes 仍超过目标大小 ${maxSize} bytes`);
        // 如果还是太大，进一步降低质量重试
        if (compressOptions.quality > 0.3) {
          console.log('尝试进一步压缩...');
          const newOptions = { ...compressOptions, quality: Math.max(0.3, compressOptions.quality - 0.2) };
          const newCompressedPath = await this.performCompression(filePath, newOptions);
          const newBase64 = await this.fileToBase64(newCompressedPath);
          console.log('进一步压缩完成，大小:', newBase64.length, 'bytes');
          return newBase64;
        }
      }
      
      return base64;
      
    } catch (error) {
      console.error('图片压缩失败:', error);
      throw error;
    }
  }

  /**
   * 获取图片信息
   * @param {string} filePath - 图片路径
   * @returns {Promise<Object>} 图片信息
   */
  getImageInfo(filePath) {
    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success: (res) => {
          resolve({
            width: res.width,
            height: res.height,
            path: res.path,
            type: res.type
          });
        },
        fail: (error) => {
          reject(new Error(`获取图片信息失败: ${error.errMsg}`));
        }
      });
    });
  }

  /**
   * 计算压缩参数
   * @param {Object} imageInfo - 图片信息
   * @param {Object} options - 用户选项
   * @returns {Object} 压缩参数
   */
  calculateCompressOptions(imageInfo, options = {}) {
    const { width, height } = imageInfo;
    const { 
      quality = this.quality, 
      maxWidth = this.maxWidth, 
      maxHeight = this.maxHeight,
      maxSize = this.maxSize 
    } = options;
    
    // 计算缩放比例
    let scale = 1;
    if (width > maxWidth || height > maxHeight) {
      scale = Math.min(maxWidth / width, maxHeight / height);
    }
    
    // 计算目标尺寸
    const targetWidth = Math.floor(width * scale);
    const targetHeight = Math.floor(height * scale);
    
    // 根据目标大小调整质量
    let finalQuality = quality;
    const estimatedSize = (targetWidth * targetHeight * 3 * quality) / 1024; // 估算KB
    
    // 如果估算大小超过目标大小，进一步降低质量
    if (estimatedSize > maxSize / 1024) {
      finalQuality = Math.max(0.3, (maxSize / 1024) / (targetWidth * targetHeight * 3) * 1024);
    }
    
    // 确保质量在合理范围内
    finalQuality = Math.max(0.3, Math.min(0.9, finalQuality));
    
    return {
      quality: finalQuality,
      width: targetWidth,
      height: targetHeight,
      scale: scale
    };
  }

  /**
   * 执行图片压缩
   * @param {string} filePath - 原始图片路径
   * @param {Object} options - 压缩参数
   * @returns {Promise<string>} 压缩后的图片路径
   */
  performCompression(filePath, options) {
    return new Promise((resolve, reject) => {
      const { quality, width, height } = options;
      
      wx.compressImage({
        src: filePath,
        quality: quality,
        success: (res) => {
          console.log('压缩成功:', res.tempFilePath);
          resolve(res.tempFilePath);
        },
        fail: (error) => {
          console.error('压缩失败:', error);
          reject(new Error(`图片压缩失败: ${error.errMsg}`));
        }
      });
    });
  }

  /**
   * 将文件转换为base64
   * @param {string} filePath - 文件路径
   * @returns {Promise<string>} base64数据
   */
  fileToBase64(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data);
        },
        fail: (error) => {
          reject(new Error(`文件读取失败: ${error.errMsg}`));
        }
      });
    });
  }

  /**
   * 智能压缩图片
   * 根据图片大小自动选择压缩策略
   * @param {string} filePath - 图片路径
   * @returns {Promise<string>} 压缩后的base64数据
   */
  async smartCompress(filePath) {
    try {
      console.log('开始智能压缩图片...');
      
      // 获取图片信息
      const imageInfo = await this.getImageInfo(filePath);
      const { width, height } = imageInfo;
      
      // 估算原始大小
      const estimatedSize = (width * height * 3) / 1024; // KB
      console.log('估算图片大小:', estimatedSize, 'KB');
      
      let options = {};
      
      if (estimatedSize > 1000) {
        // 超大图片：大幅压缩
        console.log('检测到超大图片，使用大幅压缩');
        options = {
          quality: 0.5,
          maxWidth: 800,
          maxHeight: 800
        };
      } else if (estimatedSize > 500) {
        // 大图片：中等压缩
        console.log('检测到大图片，使用中等压缩');
        options = {
          quality: 0.6,
          maxWidth: 1024,
          maxHeight: 1024
        };
      } else if (estimatedSize > 200) {
        // 中等图片：轻度压缩
        console.log('检测到中等图片，使用轻度压缩');
        options = {
          quality: 0.7,
          maxWidth: 1200,
          maxHeight: 1200
        };
      } else {
        // 小图片：保持原质量
        console.log('检测到小图片，保持原质量');
        options = {
          quality: 0.8,
          maxWidth: 1500,
          maxHeight: 1500
        };
      }
      
      // 执行压缩
      const base64 = await this.compressImage(filePath, options);
      
      console.log('智能压缩完成，最终大小:', base64.length, 'bytes');
      return base64;
      
    } catch (error) {
      console.error('智能压缩失败:', error);
      throw error;
    }
  }

  /**
   * 批量压缩图片
   * @param {Array<string>} filePaths - 图片路径数组
   * @returns {Promise<Array<string>>} 压缩后的base64数组
   */
  async batchCompress(filePaths) {
    try {
      console.log('开始批量压缩图片，数量:', filePaths.length);
      
      const results = [];
      for (let i = 0; i < filePaths.length; i++) {
        try {
          console.log(`压缩第${i + 1}张图片...`);
          const base64 = await this.smartCompress(filePaths[i]);
          results.push(base64);
        } catch (error) {
          console.error(`第${i + 1}张图片压缩失败:`, error);
          results.push(null);
        }
      }
      
      console.log('批量压缩完成，成功:', results.filter(r => r !== null).length, '张');
      return results;
      
    } catch (error) {
      console.error('批量压缩失败:', error);
      throw error;
    }
  }

  /**
   * 获取压缩建议
   * @param {string} filePath - 图片路径
   * @returns {Promise<Object>} 压缩建议
   */
  async getCompressSuggestion(filePath) {
    try {
      const imageInfo = await this.getImageInfo(filePath);
      const { width, height } = imageInfo;
      const estimatedSize = (width * height * 3) / 1024;
      
      let suggestion = {
        originalSize: estimatedSize,
        recommended: false,
        reason: '',
        options: {}
      };
      
      if (estimatedSize > 1000) {
        suggestion.recommended = true;
        suggestion.reason = '图片过大，建议大幅压缩';
        suggestion.options = { quality: 0.5, maxWidth: 800, maxHeight: 800 };
      } else if (estimatedSize > 500) {
        suggestion.recommended = true;
        suggestion.reason = '图片较大，建议中等压缩';
        suggestion.options = { quality: 0.6, maxWidth: 1024, maxHeight: 1024 };
      } else if (estimatedSize > 200) {
        suggestion.recommended = true;
        suggestion.reason = '图片适中，建议轻度压缩';
        suggestion.options = { quality: 0.7, maxWidth: 1200, maxHeight: 1200 };
      } else {
        suggestion.recommended = false;
        suggestion.reason = '图片较小，无需压缩';
        suggestion.options = { quality: 0.8, maxWidth: 1500, maxHeight: 1500 };
      }
      
      return suggestion;
      
    } catch (error) {
      console.error('获取压缩建议失败:', error);
      throw error;
    }
  }
}

// 创建单例实例
const imageCompression = new ImageCompression();

module.exports = imageCompression;
