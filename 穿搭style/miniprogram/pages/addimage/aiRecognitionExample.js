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
    executionTime: 0,
    // 进度条数据
    progressData: {
      stage: '',
      stageProgress: 0,
      totalProgress: 0,
      message: '',
      stageInfo: null,
      estimatedTime: 0
    }
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
      const result = await this.performAIRecognition(imagePath, this.onProgressUpdate.bind(this));
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
  async performAIRecognition(imagePath, onProgress = null) {
    try {
      // 创建AI识别实例
      const aiRecognition = new AIRecognition();
      
      // 更新压缩配置（可选）
      aiRecognition.updateCompressionConfig({
        enabled: true,
        maxSize: 60 * 1024, // 60KB，进一步减小
        quality: 0.7
      });
      
      // 执行识别（带进度回调）
      const result = await aiRecognition.recognizeClothing(imagePath, {}, onProgress);
      
      // 返回结果
      return result;
      
    } catch (error) {
      console.error('AI识别执行失败:', error);
      throw error;
    }
  },

  /**
   * 进度更新回调
   */
  onProgressUpdate(progressData) {
    console.log('进度更新:', progressData);
    this.setData({
      progressData: progressData
    });
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
      const results = [];
      
      // 逐个识别图片
      for (let i = 0; i < imagePaths.length; i++) {
        try {
          const result = await aiRecognition.recognizeClothing(imagePaths[i]);
          results.push(result);
        } catch (error) {
          console.error(`第${i+1}张图片识别失败:`, error);
          results.push({ error: error.message });
        }
      }
      
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
  },

  /**
   * 显示进度条详情
   */
  showProgressDetails() {
    const { progressData } = this.data;
    if (!progressData.stage) return;
    
    const details = `
当前阶段: ${progressData.stageInfo?.name || progressData.stage}
阶段进度: ${progressData.stageProgress}%
总进度: ${progressData.totalProgress}%
状态: ${progressData.message}
预计剩余: ${progressData.estimatedTime}秒
    `.trim();
    
    wx.showModal({
      title: '进度详情',
      content: details,
      showCancel: false
    });
  },

  /**
   * 重置进度条
   */
  resetProgress() {
    this.setData({
      progressData: {
        stage: '',
        stageProgress: 0,
        totalProgress: 0,
        message: '',
        stageInfo: null,
        estimatedTime: 0
      }
    });
  },

  /**
   * 测试进度条功能
   */
  async testProgressBar() {
    try {
      this.setData({ isRecognizing: true });
      this.resetProgress();
      
      // 模拟进度更新
      const stages = ['compression', 'upload', 'recognition'];
      const messages = {
        compression: ['开始处理图片...', '正在压缩图片...', '图片压缩完成'],
        upload: ['准备上传图片...', '正在上传图片...', '图片上传完成'],
        recognition: ['AI正在分析图片...', 'AI识别中...', 'AI识别完成']
      };
      
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        const stageMessages = messages[stage];
        
        for (let j = 0; j < stageMessages.length; j++) {
          const progress = Math.round((j + 1) / stageMessages.length * 100);
          this.onProgressUpdate({
            stage: stage,
            stageProgress: progress,
            totalProgress: Math.round(((i * 100) + progress) / 3),
            message: stageMessages[j],
            stageInfo: {
              name: stage === 'compression' ? '图片处理' : stage === 'upload' ? '数据上传' : 'AI识别',
              duration: stage === 'compression' ? 2000 : stage === 'upload' ? 1000 : 12000,
              description: '测试阶段'
            },
            estimatedTime: Math.round((3 - i - (j + 1) / stageMessages.length) * 5)
          });
          
          // 等待一段时间模拟处理
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
      
      wx.showToast({
        title: '进度条测试完成',
        icon: 'success'
      });
      
    } catch (error) {
      console.error('进度条测试失败:', error);
      wx.showToast({
        title: '测试失败',
        icon: 'error'
      });
    } finally {
      this.setData({ isRecognizing: false });
    }
  }
});
