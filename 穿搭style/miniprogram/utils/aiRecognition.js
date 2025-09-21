/**
 * AI识别工具类 - 通过云函数调用火山引擎方舟API
 * 集成本地图片压缩，优化云函数处理时间
 * 
 * 配置说明：
 * 1. 在火山引擎控制台创建方舟推理接入点
 * 2. 获取API Key和推理接入点ID
 * 3. 在 cloudfunctions/aiRecognition/index.js 中配置您的API信息
 * 
 * 使用示例：
 * const aiRecognition = new AIRecognition();
 * const result = await aiRecognition.recognizeClothing(imagePath);
 */

// 引入图片压缩工具
const imageCompression = require('./imageCompression.js');

class AIRecognition {
  constructor() {
    // 云函数名称
    this.cloudFunctionName = 'aiRecognition';
    
    // 压缩配置
    this.compressionConfig = {
      enabled: true, // 是否启用压缩
      maxSize: 200 * 1024, // 200KB
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024
    };
  }

  /**
   * 识别衣服类型和属性
   * @param {string} imagePath - 图片路径
   * @param {Object} options - 识别选项
   * @returns {Promise} 识别结果
   */
  async recognizeClothing(imagePath, options = {}) {
    try {
      console.log('=== 开始AI识别 ===');
      console.log('图片路径:', imagePath);
      console.log('压缩配置:', this.compressionConfig);
      
      // 步骤1：获取图片信息并决定是否压缩
      const shouldCompress = await this.shouldCompressImage(imagePath);
      console.log('是否需要压缩:', shouldCompress);
      
      let base64Image;
      
      if (shouldCompress && this.compressionConfig.enabled) {
        // 步骤2：执行本地压缩
        console.log('开始本地图片压缩...');
        base64Image = await imageCompression.smartCompress(imagePath);
        console.log('本地压缩完成，base64长度:', base64Image.length);
      } else {
        // 步骤3：直接转换（不压缩）
        console.log('图片无需压缩，直接转换...');
        base64Image = await this.imageToBase64(imagePath);
        console.log('图片转换完成，base64长度:', base64Image.length);
      }
      
      // 步骤4：调用云函数进行AI识别
      console.log('调用云函数进行AI识别...');
      const result = await this.callCloudFunction(base64Image);
      
      console.log('AI识别完成:', result);
      return result;
      
    } catch (error) {
      console.error('=== AI识别失败 ===');
      console.error('错误类型:', error.constructor.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
      
      // 抛出错误，不再返回模拟数据
      throw new Error(`AI识别失败: ${error.message}`);
    }
  }

  /**
   * 判断是否需要压缩图片
   * @param {string} imagePath - 图片路径
   * @returns {Promise<boolean>} 是否需要压缩
   */
  async shouldCompressImage(imagePath) {
    try {
      // 获取压缩建议
      const suggestion = await imageCompression.getCompressSuggestion(imagePath);
      console.log('压缩建议:', suggestion);
      
      return suggestion.recommended;
      
    } catch (error) {
      console.error('获取压缩建议失败:', error);
      // 如果获取建议失败，默认不压缩
      return false;
    }
  }

  /**
   * 调用云函数进行AI识别
   * @param {string} base64Image - base64图片数据
   * @returns {Promise} 识别结果
   */
  async callCloudFunction(base64Image) {
    console.log('调用云函数:', this.cloudFunctionName);
    console.log('图片大小:', base64Image.length, 'bytes');
    
    return new Promise((resolve, reject) => {
      wx.cloud.callFunction({
        name: this.cloudFunctionName,
        data: {
          imageBase64: base64Image
        },
        success: (res) => {
          console.log('云函数调用成功:', res);
          
          if (res.result && res.result.success) {
            console.log('AI识别结果:', res.result.data);
            console.log('执行时间:', res.result.executionTime, 'ms');
            console.log('Tokens使用:', res.result.tokens);
            resolve(res.result.data);
          } else {
            const errorMsg = res.result?.error || '云函数调用失败';
            console.error('云函数返回错误:', {
              error: res.result?.error,
              code: res.result?.code,
              details: res.result?.details
            });
            reject(new Error(errorMsg));
          }
        },
        fail: (error) => {
          console.error('云函数调用失败:', {
            errMsg: error.errMsg,
            errCode: error.errCode,
            stack: error.stack
          });
          reject(new Error(`云函数调用失败: ${error.errMsg}`));
        }
      });
    });
  }

  /**
   * 将图片转换为base64格式
   * @param {string} imagePath - 图片路径
   * @returns {Promise<string>} base64字符串
   */
  imageToBase64(imagePath) {
    console.log('开始转换图片为base64:', imagePath);
    
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          console.log('图片读取成功，base64长度:', res.data.length);
          resolve(res.data);
        },
        fail: (error) => {
          console.error('图片读取失败:', {
            errMsg: error.errMsg,
            errCode: error.errCode,
            filePath: imagePath
          });
          reject(new Error(`图片读取失败: ${error.errMsg}`));
        }
      });
    });
  }

  /**
   * 批量识别衣服
   * @param {Array<string>} imagePaths - 图片路径数组
   * @returns {Promise<Array>} 识别结果数组
   */
  async batchRecognize(imagePaths) {
    try {
      console.log('开始批量AI识别，数量:', imagePaths.length);
      
      const results = [];
      for (let i = 0; i < imagePaths.length; i++) {
        try {
          console.log(`识别第${i + 1}张图片...`);
          const result = await this.recognizeClothing(imagePaths[i]);
          results.push(result);
        } catch (error) {
          console.error(`第${i + 1}张图片识别失败:`, error);
          results.push({
            error: error.message,
            category: 1,
            style: '识别失败',
            color: '未知',
            confidence: 0
          });
        }
      }
      
      console.log('批量识别完成，成功:', results.filter(r => !r.error).length, '张');
      return results;
      
    } catch (error) {
      console.error('批量识别失败:', error);
      throw error;
    }
  }

  /**
   * 获取分类名称
   * @param {number} category - 分类编号
   * @returns {string} 分类名称
   */
  getCategoryName(category) {
    const categoryNames = {
      1: '上衣',
      2: '外套',
      3: '裙装',
      4: '裤装',
      5: '鞋子',
      6: '配饰',
      7: '内衣'
    };
    return categoryNames[category] || '未知';
  }

  /**
   * 格式化识别结果用于显示
   * @param {Object} result - 识别结果
   * @returns {Object} 格式化后的结果
   */
  formatResult(result) {
    return {
      category: result.category,
      categoryName: this.getCategoryName(result.category),
      style: result.style,
      color: result.color,
      stylingAdvice: result.stylingAdvice,
      tags: result.tags || [],
      confidence: result.confidence || 0.8,
      isAI: true, // 标记为AI识别结果
      tokens: result.tokens || null // 包含tokens信息
    };
  }

  /**
   * 设置压缩配置
   * @param {Object} config - 压缩配置
   */
  setCompressionConfig(config) {
    this.compressionConfig = { ...this.compressionConfig, ...config };
    console.log('压缩配置已更新:', this.compressionConfig);
  }

  /**
   * 启用/禁用压缩
   * @param {boolean} enabled - 是否启用
   */
  setCompressionEnabled(enabled) {
    this.compressionConfig.enabled = enabled;
    console.log('压缩功能:', enabled ? '已启用' : '已禁用');
  }

  /**
   * 获取压缩统计信息
   * @param {string} imagePath - 图片路径
   * @returns {Promise<Object>} 压缩统计
   */
  async getCompressionStats(imagePath) {
    try {
      const suggestion = await imageCompression.getCompressSuggestion(imagePath);
      return {
        originalSize: suggestion.originalSize,
        recommended: suggestion.recommended,
        reason: suggestion.reason,
        options: suggestion.options
      };
    } catch (error) {
      console.error('获取压缩统计失败:', error);
      throw error;
    }
  }
}

module.exports = AIRecognition;