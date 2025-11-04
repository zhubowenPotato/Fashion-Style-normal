/**
 * AI识别工具类 - 直接调用火山引擎方舟API
 * 集成本地图片压缩，避免云函数超时限制
 * 
 * 配置说明：
 * 1. 在火山引擎控制台创建方舟推理接入点
 * 2. 获取API Key和推理接入点ID
 * 3. 通过云函数获取API配置信息
 * 
 * 使用示例：
 * const aiRecognition = new AIRecognition();
 * const result = await aiRecognition.recognizeClothing(imagePath);
 */

// 引入图片压缩工具
const imageCompression = require('./imageCompression.js');

class AIRecognition {
  constructor() {
    // 云函数名称（仅用于获取配置）
    this.cloudFunctionName = 'aiRecognition';
    
    // 压缩配置
    this.compressionConfig = {
      enabled: true, // 是否启用压缩
      maxSize: 45 * 1024, // 45KB，考虑base64编码会增加33%大小
      quality: 0.6, // 降低质量以确保压缩效果
      maxWidth: 600, // 减小尺寸
      maxHeight: 600
    };
    
    // 进度条配置 - 按照20秒进行处理
    this.progressConfig = {
      totalTime: 20000, // 20秒总时间
      stages: {
        compression: 2000,  // 压缩阶段2秒
        config: 1000,       // 获取配置1秒
        recognition: 17000  // 识别阶段17秒
      }
    };
    
    // API配置缓存
    this.apiConfig = null;
  }

  /**
   * 从云函数获取API配置
   * @returns {Promise} API配置
   */
  async getApiConfig() {
    if (this.apiConfig) {
      return this.apiConfig;
    }
    
    try {
      const result = await wx.cloud.callFunction({
        name: this.cloudFunctionName,
        data: {}
      });
      
      if (result.result.success) {
        this.apiConfig = result.result.data.config;
        console.log('获取API配置成功:', this.apiConfig);
        return this.apiConfig;
      } else {
        throw new Error(result.result.error || '获取API配置失败');
      }
    } catch (error) {
      console.error('获取API配置失败:', error);
      throw new Error('无法获取AI识别配置，请检查网络连接');
    }
  }

  /**
   * 直接调用火山引擎API
   * @param {string} base64Image - base64图片数据
   * @param {Object} config - API配置
   * @returns {Promise} API响应
   */
  async callVolcanoAPI(base64Image, config) {
    console.log('开始调用火山引擎API...');
    
    const requestData = {
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这张图片中的衣服，返回JSON格式的结果，包含以下字段：name(衣服名称), category(类别：1-上衣,2-外套,3-裙装,4-裤装,5-鞋子,6-配饰), style(风格), color(颜色), stylingAdvice(搭配建议), tags(标签数组)。请确保返回的是有效的JSON格式。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "low",
                image_pixel_limit: {
                  "max_pixels": 3014080,
                  "min_pixels": 3136,
                },
              }
            }
          ]
        }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP
    };

    console.log('请求数据:', {
      model: requestData.model,
      max_tokens: requestData.max_tokens,
      temperature: requestData.temperature,
      image_size: base64Image.length
    });

    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: config.baseUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          data: requestData,
          timeout: config.timeout,
          success: (res) => {
            console.log('API请求成功:', res);
            resolve(res);
          },
          fail: (err) => {
            console.error('API请求失败:', err);
            reject(new Error(`网络请求失败: ${err.errMsg || '未知错误'}`));
          }
        });
      });

      console.log('API响应状态:', response.statusCode);
      console.log('API响应数据:', response.data);

      if (response.statusCode === 200 && response.data) {
        const content = response.data.choices?.[0]?.message?.content;
        if (content) {
          try {
            // 尝试解析JSON
            const result = JSON.parse(content);
            console.log('解析成功:', result);
            return result;
          } catch (parseError) {
            console.log('JSON解析失败，尝试提取JSON:', parseError);
            // 尝试从文本中提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              console.log('提取JSON成功:', result);
              return result;
            } else {
              throw new Error('无法解析AI返回的结果');
            }
          }
        } else {
          throw new Error('AI返回结果为空');
        }
      } else {
        const errorMsg = response.data?.error?.message || response.data?.message || '未知错误';
        throw new Error(`API调用失败: ${response.statusCode} - ${errorMsg}`);
      }
    } catch (error) {
      console.error('API调用失败:', error);
      // 如果是网络错误，提供更友好的错误信息
      if (error.message.includes('网络请求失败')) {
        throw new Error('网络连接失败，请检查网络设置后重试');
      }
      throw error;
    }
  }

  /**
   * 识别形象照风格标签
   * @param {string} imagePath - 图片路径
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise} 识别结果
   */
  async recognizeProfileStyle(imagePath, onProgress = null) {
    const startTime = Date.now();
    let currentStage = 'compression';
    
    try {
      console.log('=== 开始形象照风格识别 ===');
      console.log('图片路径:', imagePath);
      
      // 阶段1: 图片压缩
      if (onProgress) {
        onProgress({
          stage: 'compression',
          progress: 0,
          message: '正在压缩图片...'
        });
      }
      
      const compressedImage = await imageCompression.compressImage(imagePath, this.compressionConfig);
      console.log('图片压缩完成，大小:', compressedImage.length, 'bytes');
      
      if (onProgress) {
        onProgress({
          stage: 'compression',
          progress: 100,
          message: '图片压缩完成'
        });
      }
      
      // 阶段2: 获取API配置
      currentStage = 'config';
      if (onProgress) {
        onProgress({
          stage: 'config',
          progress: 0,
          message: '正在获取AI配置...'
        });
      }
      
      const config = await this.getApiConfig();
      
      if (onProgress) {
        onProgress({
          stage: 'config',
          progress: 100,
          message: '配置获取完成'
        });
      }
      
      // 阶段3: AI识别
      currentStage = 'recognition';
      if (onProgress) {
        onProgress({
          stage: 'recognition',
          progress: 0,
          message: 'AI正在分析形象照风格...'
        });
      }
      
      // 模拟识别进度 - 从10%逐渐增加到90%
      let currentProgress = 10;
      const progressInterval = setInterval(() => {
        if (onProgress && currentProgress < 90) {
          currentProgress += 10;
          onProgress({
            stage: 'recognition',
            progress: currentProgress,
            message: 'AI正在分析形象照风格...'
          });
        }
      }, 1000);
      
      const result = await this.callProfileStyleAPI(compressedImage, config);
      
      clearInterval(progressInterval);
      
      if (onProgress) {
        onProgress({
          stage: 'recognition',
          progress: 100,
          message: '风格识别完成'
        });
      }
      
      console.log('形象照风格识别完成，结果:', result);
      
      // 验证结果格式
      const validatedResult = this.validateProfileStyleResult(result);
      
      return {
        success: true,
        data: validatedResult,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('形象照风格识别失败:', error);
      
      return {
        success: false,
        data: {
          styleTags: [],
          confidence: 0.0,
          error: error.message || '未知错误',
          message: '风格识别失败，请重试'
        },
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 调用火山引擎API进行形象照风格识别
   * @param {string} base64Image - base64图片数据
   * @param {Object} config - API配置
   * @returns {Promise} API响应
   */
  async callProfileStyleAPI(base64Image, config) {
    console.log('开始调用火山引擎API进行风格识别...');
    
    const requestData = {
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "请分析这张形象照中人物的详细信息和穿搭风格，返回JSON格式的结果，包含以下字段：\n- styleTags(风格标签数组，从以下选项中选择：甜美、冷色调、暖色调、简约、复古、运动、优雅、休闲、正式、可爱等，可以扩展其他风格)\n- confidence(置信度0-1)\n- description(风格描述)\n- userInfo(用户详细信息对象，包含以下字段)：\n  - age(年龄范围，如：20-25岁)\n  - gender(性别：男/女/未知)\n  - height(身高范围，如：160-165cm)\n  - weight(体重范围，如：50-55kg)\n  - bodyType(体型：瘦/标准/偏胖/偏瘦等)\n  - skinTone(肤色：白皙/自然/偏黄/偏黑等)\n  - faceShape(脸型：圆脸/方脸/长脸/瓜子脸等)\n  - hairStyle(发型：短发/长发/卷发/直发等)\n  - overallStyle(整体风格描述)\n请确保返回的是有效的JSON格式，styleTags数组最多包含5个标签，userInfo对象包含所有字段。"
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
                detail: "low",
                image_pixel_limit: {
                  "max_pixels": 3014080,
                  "min_pixels": 3136,
                },
              }
            }
          ]
        }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
      top_p: config.topP
    };

    console.log('风格识别请求数据:', {
      model: requestData.model,
      max_tokens: requestData.max_tokens,
      temperature: requestData.temperature,
      image_size: base64Image.length
    });

    try {
      const response = await new Promise((resolve, reject) => {
        wx.request({
          url: config.baseUrl,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`
          },
          data: requestData,
          timeout: config.timeout,
          success: (res) => {
            console.log('风格识别API请求成功:', res);
            resolve(res);
          },
          fail: (err) => {
            console.error('风格识别API请求失败:', err);
            reject(new Error(`网络请求失败: ${err.errMsg || '未知错误'}`));
          }
        });
      });

      console.log('风格识别API响应状态:', response.statusCode);
      console.log('风格识别API响应数据:', response.data);

      if (response.statusCode === 200 && response.data) {
        const content = response.data.choices?.[0]?.message?.content;
        if (content) {
          try {
            // 尝试解析JSON
            const result = JSON.parse(content);
            console.log('风格识别解析成功:', result);
            return result;
          } catch (parseError) {
            console.log('风格识别JSON解析失败，尝试提取JSON:', parseError);
            // 尝试从文本中提取JSON
            const jsonMatch = content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const result = JSON.parse(jsonMatch[0]);
              console.log('风格识别提取JSON成功:', result);
              return result;
            } else {
              throw new Error('无法解析AI返回的风格识别结果');
            }
          }
        } else {
          throw new Error('AI返回风格识别结果为空');
        }
      } else {
        const errorMsg = response.data?.error?.message || response.data?.message || '未知错误';
        throw new Error(`风格识别API调用失败: ${response.statusCode} - ${errorMsg}`);
      }
    } catch (error) {
      console.error('风格识别API调用失败:', error);
      if (error.message.includes('网络请求失败')) {
        throw new Error('网络连接失败，请检查网络设置后重试');
      }
      throw error;
    }
  }

  /**
   * 验证形象照风格识别结果（包含详细用户信息）
   * @param {Object} result - 原始识别结果
   * @returns {Object} 验证后的结果
   */
  validateProfileStyleResult(result) {
    const defaultResult = {
      styleTags: [],
      confidence: 0.5,
      description: '风格识别失败',
      userInfo: {
        age: '未知',
        gender: '未知',
        height: '未知',
        weight: '未知',
        bodyType: '未知',
        skinTone: '未知',
        faceShape: '未知',
        hairStyle: '未知',
        overallStyle: '未知'
      }
    };

    if (!result || typeof result !== 'object') {
      return defaultResult;
    }

    // 直接使用AI识别的风格标签，不进行过滤
    let styleTags = [];
    if (Array.isArray(result.styleTags)) {
      styleTags = result.styleTags.filter(tag => 
        typeof tag === 'string' && tag.trim().length > 0
      ).slice(0, 8); // 最多8个标签
    }

    // 验证用户信息
    const userInfo = result.userInfo || {};
    const validatedUserInfo = {
      age: userInfo.age || defaultResult.userInfo.age,
      gender: userInfo.gender || defaultResult.userInfo.gender,
      height: userInfo.height || defaultResult.userInfo.height,
      weight: userInfo.weight || defaultResult.userInfo.weight,
      bodyType: userInfo.bodyType || defaultResult.userInfo.bodyType,
      skinTone: userInfo.skinTone || defaultResult.userInfo.skinTone,
      faceShape: userInfo.faceShape || defaultResult.userInfo.faceShape,
      hairStyle: userInfo.hairStyle || defaultResult.userInfo.hairStyle,
      overallStyle: userInfo.overallStyle || defaultResult.userInfo.overallStyle
    };

    return {
      styleTags: styleTags,
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : defaultResult.confidence,
      description: result.description || defaultResult.description,
      userInfo: validatedUserInfo
    };
  }

  /**
   * 识别衣服类型和属性
   * @param {string} imagePath - 图片路径
   * @param {Object} options - 识别选项
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise} 识别结果
   */
  async recognizeClothing(imagePath, options = {}, onProgress = null) {
    const startTime = Date.now();
    let currentStage = 'compression';
    
    try {
      console.log('=== 开始AI识别流程 ===');
      console.log('图片路径:', imagePath);
      console.log('压缩配置:', this.compressionConfig);
      
      // 阶段1: 图片压缩
      if (onProgress) {
        onProgress({
          stage: 'compression',
          progress: 0,
          message: '正在压缩图片...'
        });
      }
      
      const compressedImage = await imageCompression.compressImage(imagePath, this.compressionConfig);
      console.log('图片压缩完成，大小:', compressedImage.length, 'bytes');
      
      if (onProgress) {
        onProgress({
          stage: 'compression',
          progress: 100,
          message: '图片压缩完成'
        });
      }
      
      // 阶段2: 获取API配置
      currentStage = 'config';
      if (onProgress) {
        onProgress({
          stage: 'config',
          progress: 0,
          message: '正在获取AI配置...'
        });
      }
      
      const config = await this.getApiConfig();
      
      if (onProgress) {
        onProgress({
          stage: 'config',
          progress: 100,
          message: '配置获取完成'
        });
      }
      
      // 阶段3: AI识别
      currentStage = 'recognition';
      if (onProgress) {
        onProgress({
          stage: 'recognition',
          progress: 0,
          message: 'AI正在分析图片...'
        });
      }
      
      // 模拟识别进度 - 从10%逐渐增加到90%
      let currentProgress = 10;
      const progressInterval = setInterval(() => {
        if (onProgress && currentProgress < 90) {
          currentProgress += 10;
          onProgress({
            stage: 'recognition',
            progress: currentProgress,
            message: 'AI正在分析图片...'
          });
        }
      }, 1000);
      
      const result = await this.callVolcanoAPI(compressedImage, config);
      
      clearInterval(progressInterval);
      
      if (onProgress) {
        onProgress({
          stage: 'recognition',
          progress: 100,
          message: '识别完成'
        });
      }
      
      console.log('AI识别完成，结果:', result);
      
      // 验证结果格式
      const validatedResult = this.validateResult(result);
      
      return {
        success: true,
        data: validatedResult,
        executionTime: Date.now() - startTime,
        compressionInfo: {
          originalSize: 'unknown',
          compressedSize: compressedImage.length,
          compressionRatio: 'unknown'
        }
      };
      
    } catch (error) {
      console.error('AI识别失败:', error);
      
      // 返回降级结果
      return {
        success: true,
        data: {
          name: '识别失败',
          category: 1,
          style: '识别失败',
          color: '无法识别',
          stylingAdvice: 'AI识别遇到问题，建议重新拍照或选择手动搭配',
          tags: ['识别失败', '请重试'],
          confidence: 0.0,
          error: error.message || '未知错误',
          message: '识别失败，请重试'
        },
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 验证和标准化识别结果
   * @param {Object} result - 原始识别结果
   * @returns {Object} 标准化后的结果
   */
  validateResult(result) {
    const defaultResult = {
      name: '未知衣服',
      category: 1,
      style: '未知风格',
      color: '未知颜色',
      stylingAdvice: '建议搭配简约风格',
      tags: ['未知'],
      confidence: 0.5
    };

    if (!result || typeof result !== 'object') {
      return defaultResult;
    }

    // 直接使用AI解析结果，不进行二次分类映射
    return {
      name: result.name || defaultResult.name,
      category: this.validateCategory(result.category) || defaultResult.category,
      style: result.style || defaultResult.style,
      color: result.color || defaultResult.color,
      stylingAdvice: result.stylingAdvice || defaultResult.stylingAdvice,
      tags: Array.isArray(result.tags) ? result.tags : defaultResult.tags,
      confidence: typeof result.confidence === 'number' ? result.confidence : defaultResult.confidence
    };
  }

  /**
   * 验证类别值
   * @param {*} category - 类别值
   * @returns {number} 有效的类别值
   */
  validateCategory(category) {
    const validCategories = [1, 2, 3, 4, 5, 6];
    const numCategory = parseInt(category);
    return validCategories.includes(numCategory) ? numCategory : null;
  }

  /**
   * 获取进度配置
   * @returns {Object} 进度配置
   */
  getProgressConfig() {
    return this.progressConfig;
  }

  /**
   * 更新压缩配置
   * @param {Object} config - 新的压缩配置
   */
  updateCompressionConfig(config) {
    this.compressionConfig = { ...this.compressionConfig, ...config };
  }
}

module.exports = AIRecognition;