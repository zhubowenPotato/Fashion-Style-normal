const cloud = require('wx-server-sdk');
const fetch = require('node-fetch');

// 初始化云环境
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

// 火山引擎方舟API配置
const AI_CONFIG = {
  apiKey: 'd00f5365-2041-492a-82ea-8cca8a2ea26f', // 您的API Key
  model: 'doubao-seed-1-6-flash-250828', // 推理接入点ID，需要替换为您的实际ID
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  timeout: 15000, // 15秒超时，为AI思考留出足够时间
  retryCount: 1, // 允许1次重试，提高成功率
  maxTokens: 1024, // 增加token数量，提供更详细的分析
  temperature: 0.7, // 保持适中的随机性
  topP: 0.8 // 提高核采样参数，获得更好的结果
};

/**
 * 云函数：AI衣服识别
 * 调用火山引擎方舟API进行智能衣服识别
 */
exports.main = async (event, context) => {
  const { imageBase64 } = event;
  
  // 云函数超时控制 - 18秒内完成（微信云开发20秒限制）
  const startTime = Date.now();
  const maxExecutionTime = 18000; // 18秒，给微信云开发留出2秒缓冲
  
  console.log('=== AI识别云函数开始执行 ===');
  console.log('事件参数:', { imageBase64: imageBase64 ? `${imageBase64.substring(0, 50)}...` : 'null' });
  console.log('配置信息:', { 
    maxExecutionTime: maxExecutionTime + 'ms', 
    apiTimeout: AI_CONFIG.timeout + 'ms',
    maxRetries: AI_CONFIG.retryCount,
    maxTokens: AI_CONFIG.maxTokens,
    compressionThreshold: '本地压缩',
    retryDelay: '500ms'
  });
  
  // 添加紧急超时检查
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxExecutionTime) {
      console.log('检测到超时，返回降级结果');
      return {
        success: true,
        data: {
          category: 1,
          style: '智能识别中',
          color: '识别中',
          stylingAdvice: 'AI正在分析您的穿搭，请稍后重试或选择手动搭配',
          tags: ['智能识别', '稍后重试'],
          confidence: 0.3,
          timeout: true,
          message: '识别超时，建议重新拍照或选择手动搭配'
        },
        executionTime: elapsed,
        tokens: { 
          total_tokens: 0, 
          error: '超时处理，未消耗tokens',
          prompt_tokens: 0,
          completion_tokens: 0,
          thinking_tokens: 0
        },
        fallback: true
      };
    }
    return null;
  };
  
  // 参数验证
  if (!imageBase64) {
    console.log('缺少图片参数');
    return {
      success: false,
      error: '缺少图片参数',
      code: 'MISSING_IMAGE_PARAMETER'
    };
  }
  
  // 验证base64格式
  if (!isValidBase64(imageBase64)) {
    console.log('图片格式无效');
    return {
      success: false,
      error: '图片格式无效',
      code: 'INVALID_IMAGE_FORMAT'
    };
  }
  
  try {
    console.log('开始AI识别...');
    
    // 创建超时Promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        const timeoutResult = checkTimeout();
        resolve(timeoutResult);
      }, maxExecutionTime);
    });
    
    // 调用AI识别
    const aiRecognitionPromise = recognizeClothing(imageBase64, maxExecutionTime);
    
    // 使用Promise.race确保在超时前完成
    const result = await Promise.race([aiRecognitionPromise, timeoutPromise]);
    
    // 检查超时
    const timeoutResult2 = checkTimeout();
    if (timeoutResult2) {
      return timeoutResult2;
    }
    
    const executionTime = Date.now() - startTime;
    console.log(`AI识别成功，总耗时: ${executionTime}ms`, result);
    
    // 记录最终的tokens使用情况
    const finalTokens = result.tokens || { total_tokens: 0, error: '未获取到tokens信息' };
    console.log('=== 最终Tokens统计 ===');
    console.log('本次调用消耗tokens:', finalTokens.total_tokens);
    console.log('输入tokens:', finalTokens.prompt_tokens);
    console.log('输出tokens:', finalTokens.completion_tokens);
    if (finalTokens.thinking_tokens) {
      console.log('思考tokens:', finalTokens.thinking_tokens);
    }
    console.log('Tokens详情:', finalTokens);
    
    return {
      success: true,
      data: result,
      executionTime: executionTime,
      tokens: finalTokens
    };
    
  } catch (error) {
    const executionTime = Date.now() - startTime;
    console.error('=== AI识别失败 ===', {
      error: error.message,
      executionTime: executionTime
    });
    
    // 如果是超时错误，返回降级结果
    if (error.message.includes('超时') || error.message.includes('timeout')) {
      console.log('检测到超时错误，返回降级结果');
      return {
        success: true,
        data: {
          category: 1,
          style: '未知',
          color: '未知',
          stylingAdvice: 'AI正在分析您的穿搭，请稍后重试或选择手动搭配',
          tags: ['基础款', '百搭'],
          confidence: 0.5
        },
        executionTime: executionTime,
        tokens: { 
          total_tokens: 0, 
          prompt_tokens: 0,
          completion_tokens: 0,
          thinking_tokens: 0,
          note: '降级处理，未消耗tokens'
        },
        fallback: true,
        originalError: error.message
      };
    }
    
    // 其他错误返回失败信息
    return {
      success: false,
      error: `AI识别失败: ${error.message}`,
      code: 'AI_RECOGNITION_FAILED',
      executionTime: executionTime,
      tokens: { 
        total_tokens: 0, 
        error: '识别失败，无法获取tokens信息',
        prompt_tokens: 0,
        completion_tokens: 0,
        thinking_tokens: 0
      },
      details: {
        type: error.constructor.name,
        message: error.message,
        timestamp: new Date().toISOString()
      }
    };
  }
};


/**
 * 验证base64字符串是否有效
 * @param {string} str - 要验证的字符串
 * @returns {boolean} 是否有效
 */
function isValidBase64(str) {
  try {
    // 处理可能包含data:image前缀的base64字符串
    let base64Data = str;
    if (str.includes(',')) {
      base64Data = str.split(',')[1]; // 提取base64部分
    }
    
    // 检查是否只包含base64字符
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(base64Data)) {
      return false;
    }
    
    // 检查长度是否为4的倍数
    if (base64Data.length % 4 !== 0) {
      return false;
    }
    
    // 尝试解码
    const decoded = Buffer.from(base64Data, 'base64');
    return decoded.length > 0;
  } catch (error) {
    console.log('Base64验证错误:', error.message);
    return false;
  }
}


/**
 * 调用火山引擎方舟API进行衣服识别
 * @param {string} base64Image - base64图片数据
 * @returns {Promise} API响应
 */
async function recognizeClothing(base64Image, maxExecutionTime = 18000) {
  console.log('开始调用火山引擎API...');
  console.log('API配置:', {
    baseUrl: AI_CONFIG.baseUrl,
    model: AI_CONFIG.model,
    timeout: AI_CONFIG.timeout,
    retryCount: AI_CONFIG.retryCount
  });
  
  // 添加超时检查 - 使用云函数超时时间
  const startTime = Date.now();
  const checkTimeout = () => {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxExecutionTime) {
      console.log(`云函数超时 (${elapsed}ms > ${maxExecutionTime}ms)，返回降级结果`);
      return {
        category: 1,
        style: '智能识别中',
        color: '识别中',
        stylingAdvice: 'AI正在分析您的穿搭，请稍后重试或选择手动搭配',
        tags: ['智能识别', '稍后重试'],
        confidence: 0.3,
        timeout: true,
        message: '识别超时，建议重新拍照或选择手动搭配'
      };
    }
    return null;
  };
  
  // 提前检查时间，如果已经用了太多时间就直接返回降级结果
  const earlyCheck = checkTimeout();
  if (earlyCheck) {
    return earlyCheck;
  }
  
  // 直接使用传入的图片，不再进行压缩（压缩已移到本地）
  let processedImage = base64Image;
  const originalSize = base64Image.length;
  
  console.log(`使用本地压缩后的图片，大小: ${originalSize} bytes`);
  
  // 验证处理后的图片格式
  if (!isValidBase64(processedImage)) {
    console.log('图片格式无效');
    return {
      category: 1,
      style: '图片格式错误',
      color: '无法识别',
      stylingAdvice: '请重新拍照，确保图片清晰可见',
      tags: ['格式错误'],
      confidence: 0.0,
      error: '图片格式无效'
    };
  }
  
  // 最终验证
  console.log('最终使用的图片大小:', processedImage.length, 'bytes');
  console.log('图片格式验证:', isValidBase64(processedImage));
  
  try {
    console.log('调用API...');
    // 根据图片大小调整API超时时间
    const imageSize = processedImage.length;
    const isLargeImage = imageSize > 100000; // 100KB
    
    if (isLargeImage) {
      console.log('检测到大图片，使用扩展超时模式');
      // 对于大图片，使用更长的超时时间，给AI更多思考时间
      const result = await callVolcanoAPI(processedImage, 0, 15000); // 15秒超时
      console.log('API调用成功（扩展超时模式）');
      return result;
    } else {
      const result = await callVolcanoAPI(processedImage);
      console.log('API调用成功');
      return result;
    }
    
    // 只在API调用完成后检查超时
    const timeoutResult = checkTimeout();
    if (timeoutResult) {
      return timeoutResult;
    }
  } catch (error) {
    console.error('AI识别API调用失败:', error.message);
    throw error;
  }
}

/**
 * 调用火山引擎方舟API
 * @param {string} base64Image - base64图片数据
 * @returns {Promise} API响应
 */
async function callVolcanoAPI(base64Image, retryCount = 0, customTimeout = null) {
  // 确保base64Image是纯base64数据，不包含data:image前缀
  let cleanBase64 = base64Image;
  if (base64Image.includes(',')) {
    cleanBase64 = base64Image.split(',')[1]; // 提取base64部分
  }
  
  const requestData = {
    model: AI_CONFIG.model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image_url",
            image_url: {
              url: `data:image/jpeg;base64,${cleanBase64}`
            }
          },
          {
            type: "text",
            text: "请分析这张图片中的衣服，识别出衣服的类别、风格、颜色，并提供搭配建议。请以JSON格式返回结果，包含以下字段：category（类别：1-上衣，2-下装，3-连衣裙，4-外套，5-配饰），style（风格：如休闲、正式、运动等），color（主要颜色），stylingAdvice（搭配建议），tags（标签数组），confidence（置信度0-1）。"
          }
        ]
      }
    ],
    max_tokens: AI_CONFIG.maxTokens,
    temperature: AI_CONFIG.temperature,
    top_p: AI_CONFIG.topP
  };
  
  const timeout = customTimeout || AI_CONFIG.timeout;
  console.log(`API调用开始，超时设置: ${timeout}ms，重试次数: ${retryCount}`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(AI_CONFIG.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestData),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API响应错误:', response.status, errorText);
      throw new Error(`API请求失败: ${response.status} - ${errorText}`);
    }
    
    const data = await response.json();
    console.log('API响应成功，开始解析结果...');
    
    // 记录tokens使用情况
    const tokens = data.usage || {};
    console.log('=== Tokens使用统计 ===');
    console.log('总tokens:', tokens.total_tokens);
    console.log('输入tokens:', tokens.prompt_tokens);
    console.log('输出tokens:', tokens.completion_tokens);
    if (tokens.thinking_tokens) {
      console.log('思考tokens:', tokens.thinking_tokens);
    }
    
    // 解析AI返回的内容
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      console.log('API返回内容为空');
      return {
        category: 1,
        style: '未知',
        color: '未知',
        stylingAdvice: 'AI分析结果为空，请重新拍照',
        tags: ['分析失败'],
        confidence: 0.0,
        error: 'AI返回内容为空',
        tokens: tokens
      };
    }
    
    console.log('AI原始返回内容:', content);
    
    // 尝试解析JSON
    let result;
    try {
      // 查找JSON部分
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = JSON.parse(jsonMatch[0]);
        console.log('成功解析JSON结果:', result);
      } else {
        throw new Error('未找到有效的JSON格式');
      }
    } catch (parseError) {
      console.log('JSON解析失败，使用文本分析:', parseError.message);
      
      // 文本分析备用方案
      result = {
        category: 1,
        style: '智能识别',
        color: '智能识别',
        stylingAdvice: content,
        tags: ['AI分析'],
        confidence: 0.7,
        rawContent: content,
        parseError: parseError.message
      };
    }
    
    // 确保必要字段存在
    result.category = result.category || 1;
    result.style = result.style || '未知';
    result.color = result.color || '未知';
    result.stylingAdvice = result.stylingAdvice || 'AI正在分析您的穿搭';
    result.tags = result.tags || ['智能识别'];
    result.confidence = result.confidence || 0.5;
    result.tokens = tokens;
    
    console.log('最终识别结果:', result);
    return result;
    
  } catch (error) {
    console.error('API调用失败:', error.message);
    
    // 如果是超时错误且还有重试次数，进行重试
    if (error.name === 'AbortError' && retryCount < AI_CONFIG.retryCount) {
      console.log(`API超时，进行第${retryCount + 1}次重试...`);
      await new Promise(resolve => setTimeout(resolve, 500)); // 重试前等待500ms
      return callVolcanoAPI(base64Image, retryCount + 1, customTimeout);
    }
    
    // 重试次数用完或非超时错误，抛出异常
    throw new Error(`API调用失败: ${error.message}`);
  }
}