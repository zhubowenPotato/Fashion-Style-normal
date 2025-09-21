/**
 * AI识别使用示例
 * 展示如何在小程序中使用集成了本地压缩的AI识别功能
 */

const AIRecognition = require('../../utils/aiRecognition.js');
const imageCompression = require('../../utils/imageCompression.js');

Page({
  data: {
    // 页面数据
    isRecognizing: false,
    recognitionResult: null,
    compressionStats: null,
    executionTime: 0
  },

  onLoad() {
    console.log('AI识别示例页面加载');
  },

  /**
   * 选择图片并识别
   */
  async chooseAndRecognize() {
    try {
      this.setData({ isRecognizing: true });
      
      // 1. 选择图片
      const res = await this.chooseImage();
      if (!res) return;
      
      const imagePath = res.tempFilePaths[0];
      console.log('选择的图片路径:', imagePath);
      
      // 2. 获取压缩建议
      const compressionStats = await this.getCompressionStats(imagePath);
      this.setData({ compressionStats });
      
      // 3. 执行AI识别（内部会自动处理压缩）
      const startTime = Date.now();
      const result = await this.performAIRecognition(imagePath);
      const executionTime = Date.now() - startTime;
      
      this.setData({
        recognitionResult: result,
        executionTime: executionTime
      });
      
      console.log('AI识别完成:', result);
      console.log('总耗时:', executionTime, 'ms');
      
    } catch (error) {
      console.error('AI识别失败:', error);
      wx.showToast({
        title: '识别失败',
        icon: 'error',
        duration: 2000
      });
    } finally {
      this.setData({ isRecognizing: false });
    }
  },

  /**
   * 选择图片
   */
  chooseImage() {
    return new Promise((resolve, reject) => {
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          console.log('图片选择成功:', res.tempFilePaths);
          resolve(res);
        },
        fail: (error) => {
          console.error('图片选择失败:', error);
          reject(error);
        }
      });
    });
  },

  /**
   * 获取压缩统计信息
   */
  async getCompressionStats(imagePath) {
    try {
      const stats = await imageCompression.getCompressSuggestion(imagePath);
      console.log('压缩统计:', stats);
      return stats;
    } catch (error) {
      console.error('获取压缩统计失败:', error);
      return null;
    }
  },

  /**
   * 执行AI识别
   */
  async performAIRecognition(imagePath) {
    try {
      // 创建AI识别实例
      const aiRecognition = new AIRecognition();
      
      // 设置压缩配置（可选）
      aiRecognition.setCompressionConfig({
        enabled: true,
        maxSize: 200 * 1024, // 200KB
        quality: 0.8
      });
      
      // 执行识别
      const result = await aiRecognition.recognizeClothing(imagePath);
      
      // 格式化结果
      const formattedResult = aiRecognition.formatResult(result);
      
      return formattedResult;
      
    } catch (error) {
      console.error('AI识别执行失败:', error);
      throw error;
    }
  },

  /**
   * 手动压缩图片（测试用）
   */
  async testCompression() {
    try {
      const res = await this.chooseImage();
      if (!res) return;
      
      const imagePath = res.tempFilePaths[0];
      console.log('开始测试压缩...');
      
      // 获取压缩建议
      const suggestion = await imageCompression.getCompressSuggestion(imagePath);
      console.log('压缩建议:', suggestion);
      
      if (suggestion.recommended) {
        // 执行压缩
        const compressedBase64 = await imageCompression.smartCompress(imagePath);
        console.log('压缩完成，大小:', compressedBase64.length, 'bytes');
        
        wx.showModal({
          title: '压缩完成',
          content: `原始大小: ${suggestion.originalSize}KB\n压缩后: ${Math.round(compressedBase64.length / 1024)}KB`,
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '无需压缩',
          content: '图片大小适中，无需压缩',
          showCancel: false
        });
      }
      
    } catch (error) {
      console.error('压缩测试失败:', error);
      wx.showToast({
        title: '压缩失败',
        icon: 'error'
      });
    }
  },

  /**
   * 批量识别测试
   */
  async batchRecognizeTest() {
    try {
      const res = await this.chooseImage();
      if (!res) return;
      
      const imagePaths = res.tempFilePaths;
      console.log('开始批量识别测试...');
      
      const aiRecognition = new AIRecognition();
      const results = await aiRecognition.batchRecognize(imagePaths);
      
      console.log('批量识别结果:', results);
      
      wx.showModal({
        title: '批量识别完成',
        content: `成功识别 ${results.filter(r => !r.error).length} 张图片`,
        showCancel: false
      });
      
    } catch (error) {
      console.error('批量识别失败:', error);
      wx.showToast({
        title: '批量识别失败',
        icon: 'error'
      });
    }
  },

  /**
   * 显示识别结果详情
   */
  showResultDetails() {
    const { recognitionResult } = this.data;
    if (!recognitionResult) return;
    
    const details = `
分类: ${recognitionResult.categoryName}
风格: ${recognitionResult.style}
颜色: ${recognitionResult.color}
置信度: ${Math.round(recognitionResult.confidence * 100)}%
标签: ${recognitionResult.tags.join(', ')}
${recognitionResult.stylingAdvice ? `建议: ${recognitionResult.stylingAdvice}` : ''}
    `.trim();
    
    wx.showModal({
      title: '识别结果详情',
      content: details,
      showCancel: false
    });
  },

  /**
   * 显示压缩统计详情
   */
  showCompressionDetails() {
    const { compressionStats } = this.data;
    if (!compressionStats) return;
    
    const details = `
原始大小: ${compressionStats.originalSize}KB
建议压缩: ${compressionStats.recommended ? '是' : '否'}
原因: ${compressionStats.reason}
${compressionStats.recommended ? `建议质量: ${compressionStats.options.quality}` : ''}
    `.trim();
    
    wx.showModal({
      title: '压缩统计详情',
      content: details,
      showCancel: false
    });
  }
});
