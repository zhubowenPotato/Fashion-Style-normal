// 云函数入口文件
const cloud = require('wx-server-sdk');

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 火山引擎图片生成API配置 - 仅用于提供配置信息
const IMAGE_API_CONFIG = {
  apiKey: 'd00f5365-2041-492a-82ea-8cca8a2ea26f',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/images/generations',
  timeout: 60000, // 图片生成需要更长时间
  retryCount: 2,
  model: 'doubao-seedream-4-0-250828',
  size: '2K',
  watermark: true,
  responseFormat: 'url'
};

/**
 * 云函数：获取图片生成配置
 * 仅提供API配置信息，实际图片生成在本地进行
 */
exports.main = async (event, context) => {
  console.log('=== 获取图片生成配置 ===');
  console.log('请求参数:', event);
  
  try {
    // 检查请求的action
    const { action } = event;
    
    if (action === 'getConfig') {
      console.log('返回图片生成配置');
      return {
        success: true,
        data: {
          config: IMAGE_API_CONFIG,
          message: '配置获取成功，请在本地进行图片生成'
        }
      };
    } else {
      console.log('未知的action，返回默认配置');
      return {
        success: true,
        data: {
          config: IMAGE_API_CONFIG,
          message: '配置获取成功，请在本地进行图片生成'
        }
      };
    }
    
  } catch (error) {
    console.error('获取图片生成配置失败:', error);
    
    return {
      success: false,
      error: error.message || '获取配置失败',
      message: '无法获取图片生成配置'
    };
  }
};
