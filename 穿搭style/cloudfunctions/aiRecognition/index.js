// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 火山引擎方舟API配置 - 仅用于提供配置信息
const AI_CONFIG = {
  apiKey: 'd00f5365-2041-492a-82ea-8cca8a2ea26f', // 您的API Key
  model: 'doubao-seed-1-6-flash-250828', // 推理接入点ID，需要替换为您的实际ID
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  timeout: 30000, // 30秒超时，本地调用可以有更长时间
  retryCount: 2, // 允许2次重试，提高成功率
  maxTokens: 1024, // 增加token数量，提供更详细的分析
  temperature: 0.7, // 保持适中的随机性
  topP: 0.8 // 提高核采样参数，获得更好的结果
};

/**
 * 云函数：获取AI识别配置
 * 仅提供API配置信息，实际识别在本地进行
 */
exports.main = async (event, context) => {
  console.log('=== 获取AI识别配置 ===');
  
  try {
    // 直接返回API配置，不进行任何AI识别处理
    return {
      success: true,
      data: {
        config: AI_CONFIG,
        message: '配置获取成功，请在本地进行AI识别'
      }
    };
    
  } catch (error) {
    console.error('获取AI配置失败:', error);
    
    return {
      success: false,
      error: error.message || '获取配置失败',
      message: '无法获取AI识别配置'
    };
  }
};