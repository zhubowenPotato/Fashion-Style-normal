/**
 * AI识别服务配置文件
 * 
 * 使用前请先配置您的火山引擎API信息
 */

// 火山引擎方舟API配置
const AI_CONFIG = {
  // 请替换为您的实际API Key
  apiKey: 'YOUR_ARK_API_KEY',
  
  // 请替换为您的实际推理接入点ID
  model: 'doubao-seed-1-6-flash-250828',
  
  // API地址（通常不需要修改）
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  
  // 是否启用AI识别（设为false时使用模拟数据）
  enabled: true,
  
  // 请求超时时间（毫秒）
  timeout: 30000,
  
  // 重试次数
  retryCount: 2
};

// 导出配置
module.exports = AI_CONFIG;
