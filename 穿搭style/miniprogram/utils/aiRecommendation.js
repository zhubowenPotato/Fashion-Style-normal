/**
 * AI推荐工具类 - 本地调用火山引擎方舟API
 * 参考aiRecognition.js的实现模式
 * 
 * 功能说明：
 * 1. 从云函数获取AI配置信息
 * 2. 收集用户多维度数据（形象照、标签、衣橱、天气等）
 * 3. 构建推荐提示词
 * 4. 调用火山引擎API生成穿搭推荐
 * 
 * 使用示例：
 * const aiRecommendation = new AIRecommendation();
 * const result = await aiRecommendation.generateRecommendation();
 */

class AIRecommendation {
  constructor() {
    // 云函数名称（仅用于获取配置）
    this.cloudFunctionName = 'aiRecognition';
    
    // API配置缓存
    this.apiConfig = null;
    
    // 推荐配置
    this.recommendationConfig = {
      maxTokens: 1500,  // 减少token数量，提高响应速度
      temperature: 0.7,
      topP: 0.9,
      timeout: 60000,   // 增加超时时间到60秒
      maxRetries: 3     // 添加重试次数
    };
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
        console.log('获取AI推荐配置成功:', this.apiConfig);
        return this.apiConfig;
      } else {
        throw new Error(result.result.error || '获取API配置失败');
      }
    } catch (error) {
      console.error('获取AI推荐配置失败:', error);
      throw new Error('无法获取AI推荐配置，请检查网络连接');
    }
  }

  /**
   * 获取用户完整数据
   * @returns {Promise} 用户数据
   */
  async getUserData() {
    try {
      console.log('开始获取用户数据...');
      
      // 获取用户档案
      const profileResult = await wx.cloud.callFunction({
        name: 'userProfile',
        data: {
          action: 'getUserProfile'
        }
      });
      
      // 直接从数据库获取衣橱数据
      const wardrobeData = await this.getWardrobeData();
      
      // 获取天气信息（使用主页面的天气数据）
      const weatherData = await this.getWeatherData();
      
      const userData = {
        profile: profileResult.result.success ? profileResult.result.data : null,
        wardrobe: wardrobeData,
        weather: weatherData,
        currentTime: new Date()
      };
      
      console.log('用户数据获取完成:', userData);
      console.log('用户档案信息:', userData.profile);
      if (userData.profile && userData.profile.userAnalysis) {
        console.log('用户分析信息:', userData.profile.userAnalysis);
      } else {
        console.log('用户分析信息为空或不存在');
      }
      return userData;
      
    } catch (error) {
      console.error('获取用户数据失败:', error);
      throw new Error('获取用户数据失败，请重试');
    }
  }

  /**
   * 从数据库获取衣橱数据
   * @returns {Promise} 衣橱数据
   */
  async getWardrobeData() {
    try {
      const app = getApp();
      const openid = app.globalData.openid;
      
      if (!openid) {
        console.warn('用户openid不存在，返回空衣橱数据');
        return {
          totalItems: 0,
          categories: {},
          topColors: [],
          topStyles: []
        };
      }
      
      const db = wx.cloud.database();
      const result = await db.collection("clothes")
        .where({
          _openid: openid,
          isDeleted: false
        })
        .get();
      
      const clothes = result.data;
      
      // 分类统计
      const categories = {
        '上衣': [],
        '外套': [],
        '裙装': [],
        '裤装': [],
        '鞋子': [],
        '配饰': []
      };
      
      const colors = {};
      const styles = {};
      
      clothes.forEach(item => {
        const categoryId = item.categoryId || 1;
        const categoryNames = {
          1: '上衣',
          2: '外套', 
          3: '裙装',
          4: '裤装',
          5: '鞋子',
          6: '配饰'
        };
        const categoryName = categoryNames[categoryId] || '未分类';
        
        // 调试日志：检查每件衣服的图片地址
        console.log(`衣服: ${item.name}, 图片地址: ${item.url}`);
        
        if (categories[categoryName]) {
          categories[categoryName].push({
            name: item.name || '未命名',
            style: item.style || '未知',
            color: item.color || '未知',
            material: item.material || '未知',
            imageUrl: item.url || '',
            id: item._id || '',
            details: item.details || '',
            stylingAdvice: item.stylingAdvice || '',
            tags: item.tags || '',
            categoryId: item.categoryId || 1
          });
        }
        
        // 统计颜色
        const color = item.color || '未知';
        colors[color] = (colors[color] || 0) + 1;
        
        // 统计风格
        const style = item.style || '未知';
        styles[style] = (styles[style] || 0) + 1;
      });
      
      // 获取热门颜色和风格
      const topColors = Object.entries(colors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([color]) => color);
      
      const topStyles = Object.entries(styles)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([style]) => style);
      
      return {
        totalItems: clothes.length,
        categories: categories,
        topColors: topColors,
        topStyles: topStyles,
        clothes: clothes
      };
      
    } catch (error) {
      console.error('获取衣橱数据失败:', error);
      return {
        totalItems: 0,
        categories: {},
        topColors: [],
        topStyles: []
      };
    }
  }

  /**
   * 获取天气数据
   * @returns {Promise} 天气数据
   */
  async getWeatherData() {
    try {
      // 获取当前位置
      const location = await this.getCurrentLocation();
      
      if (!location) {
        return {
          temperature: 25,
          weather: '晴天',
          location: '未知位置'
        };
      }
      
      // 这里可以调用天气API，暂时返回模拟数据
      return {
        temperature: 25,
        weather: '晴天',
        location: location.address || '当前位置'
      };
      
    } catch (error) {
      console.error('获取天气数据失败:', error);
      return {
        temperature: 25,
        weather: '晴天',
        location: '未知位置'
      };
    }
  }

  /**
   * 获取当前位置
   * @returns {Promise} 位置信息
   */
  async getCurrentLocation() {
    return new Promise((resolve) => {
      wx.getLocation({
        type: 'gcj02',
        success: (res) => {
          resolve({
            latitude: res.latitude,
            longitude: res.longitude,
            address: '当前位置'
          });
        },
        fail: () => {
          resolve(null);
        }
      });
    });
  }

  /**
   * 构建推荐提示词
   * @param {Object} userData - 用户数据
   * @returns {string} 推荐提示词
   */
  buildRecommendationPrompt(userData) {
    const now = userData.currentTime;
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayOfWeek = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][now.getDay()];
    
    let prompt = `今天是${month}月${date}号，${dayOfWeek}。`;
    
    // 添加天气信息
    if (userData.weather) {
      const weather = userData.weather;
      prompt += `当前天气：${weather.weather}，温度${weather.temperature}°C。`;
    }
    
    // 添加用户形象照风格标签
    if (userData.profile && userData.profile.styleTags && userData.profile.styleTags.length > 0) {
      prompt += `根据我的形象照分析，我喜欢的穿搭风格类型为：${userData.profile.styleTags.join('、')}。`;
    }
    
    // 添加详细的用户分析信息
    if (userData.profile && userData.profile.userAnalysis) {
      const analysis = userData.profile.userAnalysis;
      console.log('构建推荐提示词 - 用户分析信息:', analysis);
      prompt += `根据我的形象照详细分析，我的个人信息如下：`;
      
      if (analysis.age && analysis.age !== '未知') {
        prompt += `年龄：${analysis.age}；`;
      }
      if (analysis.gender && analysis.gender !== '未知') {
        prompt += `性别：${analysis.gender}；`;
      }
      if (analysis.height && analysis.height !== '未知') {
        prompt += `身高：${analysis.height}；`;
      }
      if (analysis.weight && analysis.weight !== '未知') {
        prompt += `体重：${analysis.weight}；`;
      }
      if (analysis.bodyType && analysis.bodyType !== '未知') {
        prompt += `体型：${analysis.bodyType}；`;
      }
      if (analysis.skinTone && analysis.skinTone !== '未知') {
        prompt += `肤色：${analysis.skinTone}；`;
      }
      if (analysis.faceShape && analysis.faceShape !== '未知') {
        prompt += `脸型：${analysis.faceShape}；`;
      }
      if (analysis.hairStyle && analysis.hairStyle !== '未知') {
        prompt += `发型：${analysis.hairStyle}；`;
      }
    }
    
    // 添加用户设置的标签
    if (userData.profile && userData.profile.tags && userData.profile.tags.length > 0) {
      prompt += `我平时偏好的穿搭标签有：${userData.profile.tags.join('、')}。`;
    }
    
    // 添加衣橱信息 - 详细描述每件衣服
    if (userData.wardrobe && userData.wardrobe.totalItems > 0) {
      const wardrobe = userData.wardrobe;
      prompt += `我的衣橱中有${wardrobe.totalItems}件衣服，具体如下：`;
      
      // 按分类详细列出衣服
      const categories = wardrobe.categories || {};
      let itemIndex = 1;
      
      Object.keys(categories).forEach(category => {
        const items = categories[category];
        if (items && items.length > 0) {
          prompt += `${category}：`;
          
          items.forEach(item => {
            // 调试日志：检查每件衣服的图片地址
            console.log(`构建提示词 - 衣服: ${item.name}, 图片地址: ${item.imageUrl}`);
            
            // 构建详细的衣服描述，使用数据库中的真实信息
            let itemDescription = `${itemIndex}、${item.color}${item.name}`;
            
            // 添加材质信息
            if (item.material) {
              itemDescription += `（${item.material}材质）`;
            }
            
            // 添加风格信息
            if (item.style) {
              itemDescription += `，风格：${item.style}`;
            }
            
            // 添加图片信息
            if (item.imageUrl) {
              itemDescription += `，图片为：${item.imageUrl}`;
            } else {
              itemDescription += `，图片为：暂无图片`;
            }
            
            // 使用数据库中的详细描述
            if (item.details) {
              itemDescription += `，${item.details}`;
            }
            
            // 使用数据库中的搭配建议
            if (item.stylingAdvice) {
              itemDescription += `。${item.stylingAdvice}`;
            }
            
            // 添加标签信息
            if (item.tags) {
              itemDescription += `；标签：${item.tags}`;
            }
            
            prompt += itemDescription + '\n';
            itemIndex++;
          });
          
          prompt += '\n';
        }
      });
      
    } else {
      prompt += `我的衣橱中暂时没有衣服，请推荐一些基础款穿搭。`;
    }
    
    prompt += `请根据以上详细的衣服信息帮我推荐今天应该怎么穿搭比较适合。每件衣服都包含了从数据库中获取的真实信息，包括颜色、名称、材质、风格、详细描述、搭配建议和标签等。

请返回JSON格式的结果，包含以下字段：
- outfitTitle: 穿搭标题
- outfitDescription: 穿搭描述  
- outfitStyle: 穿搭风格
- outfitTags: 风格标签数组
- clothingItems: 推荐的单品列表（包含具体的衣服编号，如：上衣1、配饰2等）
- stylingTips: 详细的搭配建议（结合每件衣服的搭配建议，给出具体的穿搭指导）
- outfitCombination: 穿搭组合图片数组（返回推荐的穿搭组合图片的完整URL路径，如：["https://example.com/image1.jpg", "https://example.com/image2.jpg"]）
- confidence: 推荐置信度(0-1)

**重要：outfitCombination字段是必需的，必须返回一个包含具体图片URL路径的数组，这些路径应该对应推荐的衣服组合中的具体图片。例如：["https://example.com/shirt1.jpg", "https://example.com/pants1.jpg"]**

请确保返回的是有效的JSON格式，并且穿搭组合图片数组要包含具体的图片URL路径。搭配建议要详细具体，参考每件衣服的搭配建议来给出专业的穿搭指导。`;
    
    console.log('构建的推荐提示词:', prompt);
    return prompt;
  }

  /**
   * 构建图片生成提示词
   * @param {Object} recommendation - 推荐结果
   * @param {Object} userData - 用户数据
   * @returns {string} 图片生成提示词
   */
  buildImagePrompt(recommendation, userData) {
    console.log('开始构建图片生成提示词...');
    
    // 使用固定的提示词
    let prompt = `**图片生成要求：**
- 生成一张高质量的全身穿搭展示图片
- **人物必须严格按照第一张输入图片（个人形象照）生成，不能有任何偏差**
- 穿搭要完整展示，包括上衣、下装、配饰等
- 背景要简洁，突出穿搭效果
- 光线要自然，色彩要真实
- 人物如果没有化妆，增加淡妆的效果，整体风格更明亮，要求淡妆后的效果和形象照的一致型
- 图片要清晰，细节要丰富
- 整体风格要符合推荐的穿搭风格
- **确保生成的人物与第一张输入图片是同一个人**
- 穿搭要与推荐的单品和风格完全匹配
- **重要：图片中不要包含任何文字、标签、水印或文字说明，只要纯粹的穿搭展示图片**

**⚠️ 关键指令：**
- **第一张输入图片是我的个人形象照，这是生成人物的唯一参考标准**
- **其他输入图片是推荐穿搭的单品图片，用于搭配参考**
- **生成的人物形象必须与第一张图片中的人物完全一致**
- **绝对不能生成随机人物或其他人**
- **如果无法识别第一张图片中的人物特征，请拒绝生成**
- 穿搭要体现推荐的具体单品和风格特点`;

    console.log('构建的图片生成提示词:', prompt);
    return prompt;
  }

  /**
   * 生成穿搭图片
   * @param {Object} recommendation - 推荐结果
   * @param {Object} userData - 用户数据
   * @returns {Promise} 图片生成结果
   */
  async generateOutfitImage(recommendation, userData) {
    try {
      console.log('开始生成穿搭图片...');
      
      // 构建图片生成提示词
      const imagePrompt = this.buildImagePrompt(recommendation, userData);
      
      // 先获取图片生成配置
      const configResult = await wx.cloud.callFunction({
        name: 'generateOutfitImage',
        data: {
          action: 'getConfig'
        }
      });
      
      if (!configResult.result || !configResult.result.success) {
        throw new Error('获取图片生成配置失败');
      }
      
      const config = configResult.result.data.config;
      console.log('获取到图片生成配置:', config);
      
      // 获取穿搭组合图片路径
      const outfitImages = recommendation.outfitCombination || [];
      console.log('穿搭组合图片路径:', outfitImages);
      
      // 获取个人形象照
      const profileImage = await this.getProfileImage();
      console.log('个人形象照路径:', profileImage);
      
      // 合并所有输入图片：个人形象照 + 穿搭组合图片
      const inputImages = [];
      if (profileImage) {
        inputImages.push(profileImage);
        console.log('✅ 已添加个人形象照到输入图片');
      }
      if (outfitImages && outfitImages.length > 0) {
        inputImages.push(...outfitImages);
        console.log('✅ 已添加穿搭组合图片到输入图片');
      }
      
      console.log('最终输入图片列表:', inputImages);
      
      // 在本地调用火山引擎图片生成API
      const result = await this.callVolcanoImageAPI(imagePrompt, config, inputImages);
      
      if (result.success) {
        console.log('图片生成成功:', result.data);
        return {
          success: true,
          data: result.data
        };
      } else {
        throw new Error(result.error || '图片生成失败');
      }
      
    } catch (error) {
      console.error('图片生成失败:', error);
      return {
        success: false,
        error: error.message || '图片生成失败'
      };
    }
  }

  /**
   * 获取个人形象照
   * @returns {Promise<string|null>} 形象照路径或null
   */
  async getProfileImage() {
    try {
      console.log('开始获取个人形象照...');
      
      // 先从本地存储获取
      const localProfilePhoto = wx.getStorageSync('profilePhoto');
      if (localProfilePhoto) {
        console.log('从本地存储获取到形象照:', localProfilePhoto);
        return localProfilePhoto;
      }
      
      // 从数据库获取
      const result = await wx.cloud.callFunction({
        name: 'userProfile',
        data: {
          action: 'getUserProfile'
        }
      });
      
      if (result.result && result.result.success && result.result.data.profilePhoto) {
        const profilePhoto = result.result.data.profilePhoto;
        console.log('从数据库获取到形象照:', profilePhoto);
        
        // 更新本地存储
        wx.setStorageSync('profilePhoto', profilePhoto);
        
        return profilePhoto;
      }
      
      console.log('未找到个人形象照');
      return null;
      
    } catch (error) {
      console.error('获取个人形象照失败:', error);
      return null;
    }
  }

  /**
   * 调用火山引擎API生成推荐（带重试机制）
   * @param {string} prompt - 推荐提示词
   * @param {Object} config - API配置
   * @returns {Promise} API响应
   */
  async callVolcanoAPI(prompt, config) {
    console.log('开始调用火山引擎API生成推荐...');
    
    const requestData = {
      model: config.model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: prompt
            }
          ]
        }
      ],
      max_tokens: this.recommendationConfig.maxTokens,
      temperature: this.recommendationConfig.temperature,
      top_p: this.recommendationConfig.topP
    };

    console.log('推荐请求数据:', {
      model: requestData.model,
      max_tokens: requestData.max_tokens,
      temperature: requestData.temperature,
      prompt_length: prompt.length
    });

    // 重试机制
    let lastError;
    for (let attempt = 1; attempt <= this.recommendationConfig.maxRetries; attempt++) {
      try {
        console.log(`推荐API请求尝试 ${attempt}/${this.recommendationConfig.maxRetries}`);
        
        const response = await new Promise((resolve, reject) => {
          wx.request({
            url: config.baseUrl,
            method: 'POST',
            header: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            },
            data: requestData,
            timeout: this.recommendationConfig.timeout,
            success: (res) => {
              console.log(`推荐API请求成功 (尝试 ${attempt}):`, res);
              resolve(res);
            },
            fail: (err) => {
              console.error(`推荐API请求失败 (尝试 ${attempt}):`, err);
              reject(new Error(`网络请求失败: ${err.errMsg || '未知错误'}`));
            }
          });
        });

        console.log('推荐API响应状态:', response.statusCode);
        console.log('推荐API响应数据:', response.data);

        if (response.statusCode === 200 && response.data) {
          const content = response.data.choices?.[0]?.message?.content;
          if (content) {
            try {
              // 尝试解析JSON
              const result = JSON.parse(content);
              console.log('推荐解析成功:', result);
              
              // 检查并修复缺失的outfitCombination字段
              if (!result.outfitCombination || !Array.isArray(result.outfitCombination)) {
                console.log('outfitCombination字段缺失或格式错误，生成默认值');
                result.outfitCombination = this.generateDefaultOutfitCombination(result.clothingItems, userData);
              }
              
              return result;
            } catch (parseError) {
              console.log('推荐JSON解析失败，尝试提取JSON:', parseError);
              // 尝试从文本中提取JSON
              const jsonMatch = content.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                console.log('推荐提取JSON成功:', result);
                return result;
              } else {
                throw new Error('无法解析AI返回的推荐结果');
              }
            }
          } else {
            throw new Error('AI返回推荐结果为空');
          }
        } else {
          const errorMsg = response.data?.error?.message || response.data?.message || '未知错误';
          throw new Error(`推荐API调用失败: ${response.statusCode} - ${errorMsg}`);
        }
        
      } catch (error) {
        lastError = error;
        console.error(`推荐API调用失败 (尝试 ${attempt}):`, error);
        
        // 如果不是最后一次尝试，等待后重试
        if (attempt < this.recommendationConfig.maxRetries) {
          const waitTime = attempt * 2000; // 递增等待时间：2秒、4秒、6秒
          console.log(`等待 ${waitTime}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
      }
    }
    
    // 所有重试都失败了
    console.error('推荐API调用失败，已重试', this.recommendationConfig.maxRetries, '次');
    if (lastError && lastError.message.includes('网络请求失败')) {
      throw new Error('网络连接失败，请检查网络设置后重试');
    }
    throw lastError || new Error('推荐API调用失败');
  }

  /**
   * 生成默认穿搭组合图片数组
   * @param {Array} clothingItems 推荐的衣服列表
   * @param {Object} userData 用户数据，包含衣橱信息
   * @returns {Array} 默认的穿搭组合图片数组
   */
  generateDefaultOutfitCombination(clothingItems, userData = null) {
    // 如果有用户数据，尝试从衣橱中获取对应的图片路径
    if (userData && userData.wardrobe && userData.wardrobe.categories) {
      const imagePaths = [];
      
      // 遍历推荐的衣服，尝试找到对应的图片路径
      clothingItems.forEach(item => {
        // 解析衣服编号（如：上衣1 -> 上衣, 1）
        const match = item.match(/^(.+?)(\d+)$/);
        if (match) {
          const category = match[1];
          const index = parseInt(match[2]) - 1; // 转换为0基索引
          
          // 在对应分类中查找图片
          if (userData.wardrobe.categories[category] && userData.wardrobe.categories[category][index]) {
            const clothingItem = userData.wardrobe.categories[category][index];
            // 检查多个可能的图片字段
            const imageUrl = clothingItem.imageUrl || clothingItem.image || clothingItem.url;
            if (imageUrl && imageUrl.trim() !== '') {
              imagePaths.push(imageUrl);
              console.log(`找到衣服图片路径: ${item} -> ${imageUrl}`);
            }
          }
        }
      });
      
      if (imagePaths.length > 0) {
        console.log('生成基于衣橱的穿搭组合图片:', imagePaths);
        return imagePaths;
      }
    }
    
    // 如果没有找到具体图片路径，返回默认的占位符
    const combinations = [];
    const itemCount = clothingItems ? clothingItems.length : 1;
    
    // 生成1-3张组合图片的占位符
    for (let i = 1; i <= Math.min(itemCount, 3); i++) {
      combinations.push(`placeholder_${i}.jpg`);
    }
    
    console.log('生成默认穿搭组合图片占位符:', combinations);
    return combinations;
  }

  /**
   * 生成默认推荐（降级处理）
   * @returns {Object} 默认推荐结果
   */
  generateDefaultRecommendation() {
    const now = new Date();
    const month = now.getMonth() + 1;
    
    // 根据季节生成默认推荐
    let defaultRecommendation;
    if (month >= 3 && month <= 5) {
      // 春季
      defaultRecommendation = {
        outfitTitle: '春日清新风',
        outfitDescription: '适合春季的清新穿搭，展现活力与优雅',
        outfitStyle: '清新风',
        outfitTags: ['清新', '优雅', '春季'],
        clothingItems: ['白色衬衫', '浅色针织衫', '牛仔裤', '小白鞋'],
        stylingTips: '选择浅色系搭配，营造清新自然的春日氛围',
        outfitCombination: ['1.png', '2.png', '3.png'],
        confidence: 0.7
      };
    } else if (month >= 6 && month <= 8) {
      // 夏季
      defaultRecommendation = {
        outfitTitle: '夏日清爽风',
        outfitDescription: '适合夏季的清爽穿搭，舒适又时尚',
        outfitStyle: '清爽风',
        outfitTags: ['清爽', '舒适', '夏季'],
        clothingItems: ['白色T恤', '短裤', '凉鞋', '遮阳帽'],
        stylingTips: '选择透气轻薄的面料，注意防晒和舒适度',
        outfitCombination: ['1.png', '2.png', '3.png'],
        confidence: 0.7
      };
    } else if (month >= 9 && month <= 11) {
      // 秋季
      defaultRecommendation = {
        outfitTitle: '秋日温暖风',
        outfitDescription: '适合秋季的温暖穿搭，展现成熟魅力',
        outfitStyle: '温暖风',
        outfitTags: ['温暖', '成熟', '秋季'],
        clothingItems: ['针织衫', '长裤', '靴子', '围巾'],
        stylingTips: '选择暖色调搭配，注意保暖和层次感',
        outfitCombination: ['1.png', '2.png', '3.png'],
        confidence: 0.7
      };
    } else {
      // 冬季
      defaultRecommendation = {
        outfitTitle: '冬日优雅风',
        outfitDescription: '适合冬季的优雅穿搭，保暖又时尚',
        outfitStyle: '优雅风',
        outfitTags: ['优雅', '保暖', '冬季'],
        clothingItems: ['大衣', '毛衣', '长裤', '靴子'],
        stylingTips: '选择深色系搭配，注意保暖和质感',
        outfitCombination: ['1.png', '2.png', '3.png'],
        confidence: 0.7
      };
    }
    
    return defaultRecommendation;
  }

  /**
   * 验证推荐结果
   * @param {Object} result - AI返回的结果
   * @returns {Object} 验证后的结果
   */
  validateRecommendationResult(result) {
    const defaultResult = {
      outfitTitle: '推荐穿搭',
      outfitDescription: '为您精心搭配的穿搭方案',
      outfitStyle: '时尚风',
      outfitTags: ['时尚'],
      clothingItems: ['推荐单品'],
      stylingTips: '建议搭配简约风格',
      outfitCombination: [], // 添加默认的穿搭组合图片数组
      confidence: 0.5
    };

    if (!result || typeof result !== 'object') {
      return defaultResult;
    }

    return {
      outfitTitle: result.outfitTitle || defaultResult.outfitTitle,
      outfitDescription: result.outfitDescription || defaultResult.outfitDescription,
      outfitStyle: result.outfitStyle || defaultResult.outfitStyle,
      outfitTags: Array.isArray(result.outfitTags) ? result.outfitTags : defaultResult.outfitTags,
      clothingItems: Array.isArray(result.clothingItems) ? result.clothingItems : defaultResult.clothingItems,
      stylingTips: result.stylingTips || defaultResult.stylingTips,
      outfitCombination: Array.isArray(result.outfitCombination) ? result.outfitCombination : defaultResult.outfitCombination, // 添加outfitCombination字段处理
      confidence: typeof result.confidence === 'number' ? Math.max(0, Math.min(1, result.confidence)) : defaultResult.confidence
    };
  }

  /**
   * 生成AI推荐
   * @param {Function} onProgress - 进度回调函数
   * @returns {Promise} 推荐结果
   */
  async generateRecommendation(onProgress = null) {
    const startTime = Date.now();
    
    try {
      console.log('=== 开始AI推荐生成 ===');
      
      // 阶段1: 获取用户数据
      if (onProgress) {
        onProgress({
          stage: 'data',
          progress: 0,
          message: '正在收集用户数据...'
        });
      }
      
      const userData = await this.getUserData();
      
      if (onProgress) {
        onProgress({
          stage: 'data',
          progress: 100,
          message: '用户数据收集完成'
        });
      }
      
      // 阶段2: 获取API配置
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
          message: 'AI配置获取完成'
        });
      }
      
      // 阶段3: 构建提示词
      if (onProgress) {
        onProgress({
          stage: 'prompt',
          progress: 0,
          message: '正在构建推荐提示词...'
        });
      }
      
      const prompt = this.buildRecommendationPrompt(userData);
      
      if (onProgress) {
        onProgress({
          stage: 'prompt',
          progress: 100,
          message: '提示词构建完成'
        });
      }
      
      // 阶段4: AI推荐生成
      if (onProgress) {
        onProgress({
          stage: 'generation',
          progress: 0,
          message: 'AI正在生成推荐...'
        });
      }
      
      const aiResult = await this.callVolcanoAPI(prompt, config);
      
      if (onProgress) {
        onProgress({
          stage: 'generation',
          progress: 100,
          message: 'AI推荐生成完成'
        });
      }
      
      // 阶段5: 验证和格式化结果
      const validatedResult = this.validateRecommendationResult(aiResult);
      
      // 如果outfitCombination为空，生成默认的穿搭组合图片
      if (!validatedResult.outfitCombination || validatedResult.outfitCombination.length === 0) {
        console.log('outfitCombination为空，生成默认穿搭组合图片...');
        console.log('推荐的衣服列表:', validatedResult.clothingItems);
        console.log('用户数据:', userData);
        validatedResult.outfitCombination = this.generateDefaultOutfitCombination(validatedResult.clothingItems, userData);
        console.log('生成的穿搭组合图片:', validatedResult.outfitCombination);
      } else {
        console.log('outfitCombination已存在:', validatedResult.outfitCombination);
      }
      
      // 阶段6: 生成穿搭图片
      let generatedImage = null;
      if (onProgress) {
        onProgress({
          stage: 'image',
          progress: 0,
          message: '正在生成穿搭图片...'
        });
      }
      
      try {
        const imageResult = await this.generateOutfitImage(validatedResult, userData);
        console.log('图片生成结果:', imageResult);
        
        if (imageResult.success) {
          generatedImage = imageResult.data;
          console.log('✅ 穿搭图片生成成功');
          console.log('图片生成数据结构:', JSON.stringify(generatedImage, null, 2));
          
          // 检查图片URL是否存在并处理返回的图片
          let imageUrl = null;
          
          // 尝试多种可能的URL路径
          const possiblePaths = [
            generatedImage?.data?.data?.[0]?.url,
            generatedImage?.data?.url,
            generatedImage?.url,
            generatedImage?.data?.[0]?.url
          ];
          
          console.log('尝试的URL路径:', possiblePaths);
          
          for (const path of possiblePaths) {
            if (path && typeof path === 'string' && path.startsWith('http')) {
              imageUrl = path;
              console.log('✅ 找到生成的图片URL:', imageUrl);
              break;
            }
          }
          
          if (imageUrl) {
            // 下载并上传到云存储
            try {
              const cloudImageUrl = await this.downloadAndUploadImage(imageUrl);
              if (cloudImageUrl) {
                // 更新推荐结果中的图片地址
                validatedResult.image = cloudImageUrl;
                console.log('✅ 图片已上传到云存储:', cloudImageUrl);
              }
            } catch (error) {
              console.error('❌ 图片上传失败:', error);
            }
          } else {
            console.warn('⚠️ 未找到图片URL，数据结构:', generatedImage);
          }
        } else {
          console.warn('❌ 穿搭图片生成失败:', imageResult.error);
        }
      } catch (error) {
        console.warn('❌ 穿搭图片生成异常:', error);
      }
      
      if (onProgress) {
        onProgress({
          stage: 'image',
          progress: 100,
          message: '图片生成完成'
        });
      }
      
      // 解析生成的图片URL
      let imageUrl = null;
      
      // 优先使用已上传到云存储的图片
      if (validatedResult.image && validatedResult.image.startsWith('cloud://')) {
        imageUrl = validatedResult.image;
        console.log('✅ 使用已上传的云存储图片:', imageUrl);
      } else {
        console.log('🔍 检查generatedImage状态:');
        console.log('generatedImage是否为null:', generatedImage === null);
        console.log('generatedImage是否为undefined:', generatedImage === undefined);
        console.log('generatedImage类型:', typeof generatedImage);
        console.log('generatedImage值:', generatedImage);
        
        if (generatedImage) {
          console.log('开始解析AI生成图片URL...');
          console.log('generatedImage结构:', JSON.stringify(generatedImage, null, 2));
          
          // 检查generatedImage的各个层级
          console.log('generatedImage.data:', generatedImage.data);
          console.log('generatedImage.data[0]:', generatedImage.data?.[0]);
          console.log('generatedImage.data[0].url:', generatedImage.data?.[0]?.url);
          
          // 尝试多种可能的URL路径
          const possiblePaths = [
            generatedImage?.data?.[0]?.url,
            generatedImage?.data?.[0]?.image_url,
            generatedImage?.data?.[0]?.urls?.[0],
            generatedImage?.data?.url,
            generatedImage?.data?.image_url,
            generatedImage?.url,
            generatedImage?.image_url
          ];
          
          console.log('尝试的路径列表:', possiblePaths);
          
          for (const path of possiblePaths) {
            if (path && typeof path === 'string' && path.startsWith('http')) {
              imageUrl = path;
              console.log('✅ 找到AI生成图片URL:', imageUrl);
              break;
            }
          }
          
          if (!imageUrl) {
            console.warn('⚠️ 未找到有效的AI生成图片URL，将使用默认图片');
            console.log('尝试的路径:', possiblePaths);
          }
        } else {
          console.warn('⚠️ 未获取到图片生成结果，将使用默认图片');
        }
      }
      
      // 如果找到了AI生成的图片URL，下载并上传到云存储
      if (imageUrl && imageUrl.startsWith('http')) {
        try {
          console.log('开始下载AI生成图片并上传到云存储:', imageUrl);
          const cloudFileID = await this.downloadAndUploadAIImage(imageUrl);
          if (cloudFileID) {
            imageUrl = cloudFileID;
            console.log('✅ AI生成图片已上传到云存储:', imageUrl);
          }
        } catch (error) {
          console.error('❌ 下载AI生成图片失败:', error);
          // 如果下载失败，使用默认图片
          imageUrl = null;
        }
      }
      
      // 如果没有有效的图片URL，使用默认图片
      if (!imageUrl) {
        console.log('使用默认图片');
        const defaultImageUrl = 'https://img.freepik.com/free-photo/graceful-stylish-woman-pink-dress_197531-13228.jpg';
        try {
          const cloudFileID = await this.downloadAndUploadAIImage(defaultImageUrl);
          if (cloudFileID) {
            imageUrl = cloudFileID;
            console.log('✅ 默认图片已上传到云存储:', imageUrl);
          } else {
            imageUrl = defaultImageUrl;
          }
        } catch (error) {
          console.error('❌ 下载默认图片失败:', error);
          imageUrl = defaultImageUrl;
        }
      }
      
      // 添加额外信息
      const finalResult = {
        ...validatedResult,
        image: imageUrl,
        generatedImage: generatedImage, // 保存完整的图片生成结果
        generatedAt: new Date().toISOString(),
        basedOn: {
          userStyle: userData.profile?.styleTags || [],
          userTags: userData.profile?.tags || [],
          weather: userData.weather,
          wardrobeCount: userData.wardrobe?.length || 0
        }
      };
      
      console.log('✅ 最终推荐结果中的图片地址:', finalResult.image);
      
      console.log('AI推荐生成完成，结果:', finalResult);
      
      return {
        success: true,
        data: finalResult,
        executionTime: Date.now() - startTime
      };
      
    } catch (error) {
      console.error('AI推荐生成失败:', error);
      
      // 返回降级推荐
      const defaultRecommendation = this.generateDefaultRecommendation();
      
      return {
        success: true, // 即使AI失败，也返回默认推荐
        data: {
          ...defaultRecommendation,
          image: 'https://img.freepik.com/free-photo/graceful-stylish-woman-pink-dress_197531-13228.jpg',
          generatedAt: new Date().toISOString(),
          basedOn: {
            userStyle: [],
            userTags: [],
            weather: null,
            wardrobeCount: 0
          },
          isFallback: true,
          error: error.message
        },
        executionTime: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * 下载图片并上传到云存储
   * @param {string} imageUrl - 图片下载地址
   * @returns {Promise<string>} 云存储路径
   */
  async downloadAndUploadImage(imageUrl) {
    try {
      console.log('开始下载并上传图片:', imageUrl);
      
      // 生成唯一的文件名
      const timestamp = Date.now();
      const fileName = `outfit_generated_${timestamp}.jpg`;
      const cloudPath = `outfit_images/${fileName}`;
      
      // 下载图片
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: imageUrl,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res);
            } else {
              reject(new Error(`下载失败，状态码: ${res.statusCode}`));
            }
          },
          fail: reject
        });
      });
      
      console.log('图片下载成功:', downloadResult.tempFilePath);
      
      // 上传到云存储
      const uploadResult = await wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: downloadResult.tempFilePath,
        success: (res) => {
          console.log('图片上传成功:', res.fileID);
        },
        fail: (error) => {
          console.error('图片上传失败:', error);
          throw error;
        }
      });
      
      const cloudImageUrl = uploadResult.fileID;
      console.log('✅ 图片已上传到云存储:', cloudImageUrl);
      
      return cloudImageUrl;
      
    } catch (error) {
      console.error('❌ 下载并上传图片失败:', error);
      throw error;
    }
  }

  /**
   * 将图片路径转换为HTTP URL
   * @param {Array} imagePaths - 图片路径数组
   * @returns {Promise<Array>} HTTP URL数组
   */
  async convertImagesToHttpUrls(imagePaths) {
    const httpUrls = [];
    
    for (const imagePath of imagePaths) {
      try {
        console.log('转换图片路径:', imagePath);
        
        // 检查是否是云存储路径
        if (imagePath.startsWith('cloud://')) {
          // 获取云存储临时下载链接
          const tempFileURL = await wx.cloud.getTempFileURL({
            fileList: [imagePath]
          });
          
          if (tempFileURL.fileList && tempFileURL.fileList[0] && tempFileURL.fileList[0].tempFileURL) {
            const httpUrl = tempFileURL.fileList[0].tempFileURL;
            console.log('🔍 原始tempFileURL响应:', tempFileURL);
            console.log('🔍 提取的httpUrl:', httpUrl);
            console.log('🔍 httpUrl是否包含tcb.qcloud.la:', httpUrl.includes('tcb.qcloud.la'));
            
            // 检查URL格式是否正确
            if (!httpUrl.includes('tcb.qcloud.la')) {
              console.warn('⚠️ URL格式可能有问题，缺少tcb.qcloud.la域名');
              console.log('⚠️ 当前URL:', httpUrl);
              
              // 尝试修复URL格式
              let fixedUrl = httpUrl;
              if (httpUrl.includes('cloud1-5g2ffclu18317b9c.636c-cloud1-5g2ffclu18317b9c-1378258181')) {
                // 修复错误的域名格式
                fixedUrl = httpUrl.replace(
                  'cloud1-5g2ffclu18317b9c.636c-cloud1-5g2ffclu18317b9c-1378258181',
                  '636c-cloud1-5g2ffclu18317b9c-1378258181.tcb.qcloud.la'
                );
                console.log('🔧 尝试修复URL格式:', httpUrl, '->', fixedUrl);
              }
              
              httpUrls.push(fixedUrl);
              console.log('✅ 云存储图片转换成功（已修复）:', imagePath, '->', fixedUrl);
            } else {
              httpUrls.push(httpUrl);
              console.log('✅ 云存储图片转换成功:', imagePath, '->', httpUrl);
            }
          } else {
            console.warn('⚠️ 获取云存储临时链接失败:', imagePath);
            console.log('⚠️ tempFileURL响应:', tempFileURL);
          }
        } else if (imagePath.startsWith('http')) {
          // 已经是HTTP URL，直接使用
          httpUrls.push(imagePath);
          console.log('✅ 已是HTTP URL:', imagePath);
        } else {
          console.warn('⚠️ 不支持的图片路径格式:', imagePath);
        }
      } catch (error) {
        console.error('❌ 转换图片路径失败:', imagePath, error);
      }
    }
    
    console.log('最终HTTP URL列表:', httpUrls);
    return httpUrls;
  }

  /**
   * 调用火山引擎图片生成API
   * @param {string} prompt - 图片生成提示词
   * @param {Object} config - API配置
   * @param {Array} inputImages - 输入图片路径数组
   * @returns {Promise} 生成结果
   */
  async callVolcanoImageAPI(prompt, config, inputImages = []) {
    try {
      console.log('开始调用火山引擎图片生成API...');
      console.log('图片生成提示词:', prompt);
      console.log('输入图片路径:', inputImages);
      console.log('API配置:', config);
      
      const requestData = {
        model: config.model,
        prompt: prompt,
        response_format: config.responseFormat,
        size: config.size,
        stream: true,
        watermark: config.watermark || true,
        sequential_image_generation: "auto",
        sequential_image_generation_options: {
          max_images: 1
        }
      };
      
      // 如果有输入图片，需要转换为可访问的HTTP URL
      if (inputImages && inputImages.length > 0) {
        console.log('开始转换输入图片为HTTP URL...');
        const httpUrls = await this.convertImagesToHttpUrls(inputImages);
        requestData.image = httpUrls; // 直接在根级别添加image参数
        console.log('转换后的HTTP URL:', httpUrls);
        console.log('图片将作为直接输入传递给火山引擎API');
      }
      
      console.log('图片生成请求数据:', requestData);
      
      // 使用 wx.request 直接调用火山引擎API
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
            console.log('火山引擎图片API响应:', res);
            resolve(res);
          },
          fail: (error) => {
            console.error('火山引擎图片API请求失败:', error);
            reject(error);
          }
        });
      });
      
      if (response.statusCode === 200) {
        console.log('✅ 火山引擎图片API调用成功');
        console.log('完整响应数据:', JSON.stringify(response.data, null, 2));
        
        // 解析SSE数据流
        const parsedData = this.parseSSEResponse(response.data);
        console.log('解析后的数据:', parsedData);
        
        if (parsedData.success && parsedData.imageUrl) {
          console.log('✅ 成功提取图片URL:', parsedData.imageUrl);
          return {
            success: true,
            data: {
              data: [{
                url: parsedData.imageUrl,
                size: parsedData.size || '1728x2304'
              }]
            }
          };
        } else {
          console.warn('⚠️ 未能从SSE数据中提取图片URL');
          return {
            success: false,
            error: '未能提取图片URL'
          };
        }
      } else {
        console.error('❌ API请求失败，状态码:', response.statusCode);
        console.error('错误响应:', response.data);
        throw new Error(`API请求失败，状态码: ${response.statusCode}`);
      }
      
    } catch (error) {
      console.error('火山引擎图片API调用失败:', error);
      throw error;
    }
  }

  /**
   * 解析SSE响应数据
   * @param {string} sseData - SSE格式的响应数据
   * @returns {Object} 解析结果
   */
  parseSSEResponse(sseData) {
    try {
      console.log('开始解析SSE数据...');
      console.log('原始SSE数据:', sseData);
      
      // 如果已经是对象，直接返回
      if (typeof sseData === 'object' && sseData !== null) {
        console.log('数据已经是对象格式，直接返回');
        return {
          success: true,
          imageUrl: sseData.url || sseData.data?.url,
          size: sseData.size || sseData.data?.size
        };
      }
      
      // 如果是字符串，解析SSE格式
      if (typeof sseData === 'string') {
        console.log('解析字符串格式的SSE数据');
        
        // 查找 image_generation.partial_succeeded 事件
        const partialSucceededMatch = sseData.match(/event: image_generation\.partial_succeeded\s*\n\s*data:\s*({[^}]+})/);
        if (partialSucceededMatch) {
          console.log('找到 partial_succeeded 事件');
          const eventData = JSON.parse(partialSucceededMatch[1]);
          console.log('事件数据:', eventData);
          
          if (eventData.url) {
            return {
              success: true,
              imageUrl: eventData.url,
              size: eventData.size
            };
          }
        }
        
        // 查找其他可能的URL模式
        const urlMatch = sseData.match(/"url":"([^"]+)"/);
        if (urlMatch) {
          console.log('通过正则表达式找到URL:', urlMatch[1]);
          return {
            success: true,
            imageUrl: urlMatch[1],
            size: '1728x2304'
          };
        }
      }
      
      console.warn('未能从SSE数据中提取图片URL');
      return {
        success: false,
        error: '未能提取图片URL'
      };
      
    } catch (error) {
      console.error('解析SSE数据失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 下载AI生成图片并上传到云存储
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<string>} 云存储fileID
   */
  async downloadAndUploadAIImage(imageUrl) {
    try {
      console.log('=== 开始下载AI生成图片并上传到云存储 ===');
      console.log('图片URL:', imageUrl);
      
      // 下载图片到临时目录
      const downloadResult = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: imageUrl,
          success: (res) => {
            if (res.statusCode === 200) {
              resolve(res);
            } else {
              reject(new Error(`下载失败，状态码: ${res.statusCode}`));
            }
          },
          fail: reject
        });
      });
      
      console.log('✅ 图片下载成功:', downloadResult.tempFilePath);
      
      // 生成文件名
      const timestamp = Date.now();
      const isDefault = imageUrl.includes('freepik.com');
      const fileName = isDefault ? `default_outfit_${timestamp}.jpg` : `ai_generated_${timestamp}.jpg`;
      
      // 生成云存储路径
      const cloudPath = isDefault 
        ? `ai_recommendation/default_outfits/${fileName}`
        : `ai_recommendation/generated_outfits/${fileName}`;
      
      console.log('云存储路径:', cloudPath);
      
      // 上传到云存储
      const uploadResult = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: downloadResult.tempFilePath,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('✅ 图片上传成功:', uploadResult);
      
      // 添加到数据库
      await this.addImageToDatabase(uploadResult.fileID, cloudPath, isDefault);
      
      // 返回云存储fileID而不是HTTP URL
      return uploadResult.fileID;
      
    } catch (error) {
      console.error('❌ 下载并上传图片失败:', error);
      throw error;
    }
  }

  /**
   * 上传默认图片到云存储
   * @param {string} tempFilePath - 临时文件路径
   * @param {string} fileName - 文件名
   * @returns {Promise<string>} 云存储fileID
   */
  async uploadDefaultImageToCloud(tempFilePath, fileName) {
    try {
      console.log('=== 开始上传默认图片到云存储 ===');
      console.log('临时文件路径:', tempFilePath);
      console.log('文件名:', fileName);
      
      // 生成云存储路径
      const cloudPath = `ai_recommendation/default_outfits/${fileName}`;
      console.log('云存储路径:', cloudPath);
      
      // 上传到云存储
      const uploadResult = await new Promise((resolve, reject) => {
        wx.cloud.uploadFile({
          cloudPath: cloudPath,
          filePath: tempFilePath,
          success: resolve,
          fail: reject
        });
      });
      
      console.log('✅ 默认图片上传成功:', uploadResult);
      
      // 添加到数据库
      await this.addImageToDatabase(uploadResult.fileID, cloudPath, true);
      
      // 返回云存储fileID而不是HTTP URL
      return uploadResult.fileID;
      
    } catch (error) {
      console.error('❌ 上传默认图片到云存储失败:', error);
      throw error;
    }
  }

  /**
   * 添加图片记录到数据库
   * @param {string} fileID - 云存储文件ID
   * @param {string} cloudPath - 云存储路径
   * @param {boolean} isDefault - 是否为默认图片
   */
  async addImageToDatabase(fileID, cloudPath, isDefault) {
    try {
      console.log('=== 开始添加图片到数据库 ===');
      
      const db = wx.cloud.database();
      const collection = db.collection('ai_recommendation_images');
      
      const recordData = {
        fileID: fileID,
        cloudPath: cloudPath,
        type: isDefault ? 'default_outfit' : 'ai_generated',
        createdAt: new Date(),
        isDefault: isDefault,
        description: isDefault ? 'AI推荐默认搭配图片' : 'AI生成搭配图片'
      };
      
      console.log('准备插入数据库记录:', recordData);
      
      const result = await collection.add({
        data: recordData
      });
      
      console.log('✅ 图片记录已添加到数据库:', result);
      
    } catch (error) {
      console.error('❌ 添加图片到数据库失败:', error);
      // 不抛出错误，避免影响主流程
    }
  }

  /**
   * 下载默认图片并保存到云存储
   * @param {string} imageUrl - 图片URL
   * @returns {Promise<string>} 云存储fileID
   */
  async downloadDefaultImage(imageUrl) {
    try {
      console.log('开始下载默认图片:', imageUrl);
      
      // 使用新的统一方法
      const cloudFileID = await this.downloadAndUploadAIImage(imageUrl);
      
      return cloudFileID;
      
    } catch (error) {
      console.error('❌ 下载默认图片失败:', error);
      throw error;
    }
  }
}

module.exports = AIRecommendation;
