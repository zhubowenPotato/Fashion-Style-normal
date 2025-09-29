// pages/class/class.js - 衣橱页面
const util = require('../../utils/util.js')
const AIRecognition = require('../../utils/aiRecognition.js')

Page({
  data: {
    // 分类数据
    categories: [
      {
        id: 1,
        name: '上衣',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/t-shirt.png',
        count: 0
      },
      {
        id: 2,
        name: '外套',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/jacket.png',
        count: 0
      },
      {
        id: 3,
        name: '裙装',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/dress.png',
        count: 0
      },
      {
        id: 4,
        name: '裤装',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/jeans.png',
        count: 0
      },
      {
        id: 5,
        name: '鞋子',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/high-heels.png',
        count: 0
      },
      {
        id: 6,
        name: '配饰',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/necklace.png',
        count: 0
      }
    ],
    
    // 当前选中的分类
    currentCategoryId: 1,
    currentCategoryName: '上衣',
    currentItemCount: 0,
    
    // 当前分类的物品列表
    currentItems: [],
    
    // 所有物品数据
    allItems: [
      // 示例数据
      {
        id: 1,
        categoryId: 1,
        name: '白色T恤',
        image: 'https://img.freepik.com/free-photo/portrait-sassy-attractive-asian-girl-white-casual-t-shirt-showing-tongue-winking-coquettish-while-standing-blue-wall_1258-17091.jpg',
        tags: '休闲 百搭',
        addTime: '2024-01-15'
      },
      {
        id: 2,
        categoryId: 1,
        name: '蓝色衬衫',
        image: 'https://img.freepik.com/free-photo/technology-millennials-lifestyle-concept-carefree-cute-brunette-female-student-put-headphones-plug-smartphone-picking-song-smiling-standing-blue-background-make-playlist-study_1258-72987.jpg',
        tags: '正式 商务',
        addTime: '2024-01-14'
      }
    ],
    
    // 弹窗状态
    showAddMenu: false,
    showAIRecognition: false,
    recognitionProgress: 0,
    
    // AI识别相关
    aiRecognition: null,
    aiResult: null,
    
    // 搜索相关
    searchKeyword: ''
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function(options) {
    // 初始化AI识别服务
    const aiService = new AIRecognition();
    console.log('AI识别服务初始化:', aiService);
    console.log('recognizeClothing方法:', typeof aiService.recognizeClothing);
    
    this.setData({
      aiRecognition: aiService
    });
    
    this.initData();
  },

  /**
   * 初始化数据
   */
  initData: function() {
    this.loadUserClothes();
  },

  /**
   * 从数据库加载用户衣物数据
   */
  loadUserClothes: function() {
    const that = this;
    const app = getApp();
    const openid = app.globalData.openid;
    
    if (!openid) {
      console.error('用户openid不存在，无法加载数据');
      wx.showToast({
        title: '用户信息异常，请重新登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    wx.showLoading({
      title: '加载中...'
    });
    
    const db = wx.cloud.database();
    db.collection("clothes")
      .where({
        _openid: openid,
        isDeleted: false
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('从数据库加载衣物数据:', res);
        
        // 分类ID到分类名称的映射
        const categoryNames = {
          1: '上衣',
          2: '外套', 
          3: '裙装',
          4: '裤装',
          5: '鞋子',
          6: '配饰'
        };
        
        const allItems = res.data.map(item => {
          const categoryId = item.categoryId || 1;
          const categoryName = categoryNames[categoryId] || item.classify || '未分类';
          
          return {
            id: item._id,
            categoryId: categoryId,
            classify: categoryName, // 确保classify字段存在
            name: item.name || '未命名',
            image: item.url || '',
            tags: item.tags || `${item.style || '未知'} ${item.color || '未知'}`,
            style: item.style || '未知',
            color: item.color || '未知',
            confidence: item.confidence || 0,
            aiGenerated: item.aiGenerated || false,
            addTime: item.addTime || new Date().toISOString().split('T')[0],
            createTime: item.createTime || new Date(),
            stylingAdvice: item.stylingAdvice || '建议搭配基础款单品'
          };
        });
        
        that.setData({
          allItems: allItems
        });
        
        that.updateCategoryCounts();
        
        // 默认显示第一个分类
        const categoryId = that.data.currentCategoryId || 1;
        const category = that.data.categories.find(cat => cat.id === categoryId);
        if (category) {
          const currentItems = allItems.filter(item => item.categoryId === categoryId);
          that.setData({
            currentCategoryId: categoryId,
            currentCategoryName: category.name,
            currentItemCount: currentItems.length,
            currentItems: currentItems
          });
        }
        
        wx.hideLoading();
      })
      .catch(error => {
        console.error('加载衣物数据失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '加载数据失败',
          icon: 'none',
          duration: 2000
        });
      });
  },

  /**
   * 更新分类数量
   */
  updateCategoryCounts: function() {
    const categories = this.data.categories.map(category => {
      const count = this.data.allItems.filter(item => item.categoryId === category.id).length;
      return { ...category, count };
    });
    
    this.setData({ categories });
  },

  /**
   * 切换分类
   */
  switchCategory: function(e) {
    const categoryId = parseInt(e.currentTarget.dataset.id);
    const category = this.data.categories.find(cat => cat.id === categoryId);
    const currentItems = this.data.allItems.filter(item => item.categoryId === categoryId);
    
    this.setData({
      currentCategoryId: categoryId,
      currentCategoryName: category.name,
      currentItemCount: currentItems.length,
      currentItems: currentItems
    });
  },

  /**
   * 搜索点击
   */
  onSearchTap: function() {
    wx.navigateTo({
      url: '/pages/search/search'
    });
  },

  /**
   * 显示添加菜单
   */
  showAddMenu: function() {
    this.setData({ showAddMenu: true });
  },

  /**
   * 隐藏添加菜单
   */
  hideAddMenu: function() {
    this.setData({ showAddMenu: false });
  },

  /**
   * 从相册选择
   */
  chooseFromAlbum: function() {
    this.hideAddMenu();
    this.chooseImage();
  },

  /**
   * 拍照添加
   */
  takePhoto: function() {
    this.hideAddMenu();
    this.chooseImage(true);
  },

  /**
   * 选择图片
   */
  chooseImage: function(camera = false) {
    const that = this;
    
    wx.chooseImage({
      count: 1,
      sourceType: camera ? ['camera'] : ['album'],
      success: function(res) {
        that.startAIRecognition(res.tempFilePaths[0]);
      },
      fail: function(err) {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  /**
   * 开始AI识别
   */
  startAIRecognition: function(imagePath) {
    const that = this;
    
    this.setData({ 
      showAIRecognition: true,
      recognitionProgress: 0
    });

    // 立即开始AI识别，使用真实的进度回调
    that.performAIRecognition(imagePath);
  },

  /**
   * 执行AI识别
   */
  performAIRecognition: function(imagePath) {
    const that = this;
    
    // 检查AI识别服务是否可用
    console.log('检查AI识别服务:', {
      aiRecognition: that.data.aiRecognition,
      type: typeof that.data.aiRecognition,
      hasRecognizeClothing: that.data.aiRecognition && typeof that.data.aiRecognition.recognizeClothing,
      recognizeClothingType: that.data.aiRecognition ? typeof that.data.aiRecognition.recognizeClothing : 'undefined'
    });
    
    if (!that.data.aiRecognition || typeof that.data.aiRecognition.recognizeClothing !== 'function') {
      console.error('AI识别服务不可用，请检查云函数是否已部署');
      console.error('aiRecognition对象:', that.data.aiRecognition);
      console.error('recognizeClothing类型:', that.data.aiRecognition ? typeof that.data.aiRecognition.recognizeClothing : 'undefined');
      
      that.setData({
        showAIRecognition: false
      });
      
      wx.showModal({
        title: 'AI识别服务不可用',
        content: '请确保aiRecognition云函数已正确部署到云端',
        showCancel: false,
        confirmText: '确定'
      });
      return;
    }
    
    // 进度回调函数
    const onProgress = (progressData) => {
      that.setData({
        recognitionProgress: Math.floor(progressData.progress) // 确保进度值取整
      });
    };
    
    // 调用AI识别服务
    that.data.aiRecognition.recognizeClothing(imagePath, {}, onProgress).then(result => {
      console.log('AI识别结果:', result);
      
      // 先完成进度条到100%
      that.setData({ recognitionProgress: 100 });
      
      // 延迟一点时间让用户看到100%完成
      setTimeout(() => {
        that.setData({
          aiResult: result,
          showAIRecognition: false
        });
        
        // 保存到数据库 - 使用result.data而不是result
        that.saveAIRecognitionToDatabase(imagePath, result.data);
        
      }, 300);
      
    }).catch(error => {
      console.error('AI识别失败:', error);
      
      // 先完成进度条到100%
      that.setData({ recognitionProgress: 100 });
      
      // 延迟一点时间让用户看到100%完成，然后隐藏
      setTimeout(() => {
        that.setData({ showAIRecognition: false });
        
        // AI识别失败时，使用默认识别结果
        const defaultResult = that.data.aiRecognition.getDefaultRecognitionResult();
        const newItem = {
          id: Date.now(),
          categoryId: defaultResult.categoryId,
          name: defaultResult.itemName,
          image: imagePath,
          tags: defaultResult.tags,
          style: defaultResult.style,
          color: defaultResult.color,
          confidence: defaultResult.confidence,
          aiGenerated: defaultResult.aiGenerated,
          addTime: new Date().toISOString().split('T')[0]
        };
        
        const allItems = [...that.data.allItems, newItem];
        that.setData({ allItems });
        that.updateCategoryCounts();
        
        // 切换到新添加物品的分类
        const categoryId = defaultResult.categoryId;
        const category = that.data.categories.find(cat => cat.id === categoryId);
        if (category) {
          const currentItems = allItems.filter(item => item.categoryId === categoryId);
          that.setData({
            currentCategoryId: categoryId,
            currentCategoryName: category.name,
            currentItemCount: currentItems.length,
            currentItems: currentItems
          });
        }
        
        wx.showToast({
          title: 'AI识别失败，已添加为未分类物品',
          icon: 'none'
        });
      }, 300);
    });
  },

  /**
   * 编辑物品
   */
  editItem: function(e) {
    console.log('=== 开始编辑物品 ===');
    console.log('事件对象:', e);
    
    if (!e || !e.currentTarget || !e.currentTarget.dataset) {
      console.error('editItem: 事件对象或dataset不存在');
      wx.showToast({
        title: '编辑失败，请重试',
        icon: 'none'
      });
      return;
    }
    
    const item = e.currentTarget.dataset.item;
    console.log('要编辑的物品:', item);
    
    if (!item) {
      console.error('editItem: 物品数据不存在');
      wx.showToast({
        title: '物品数据异常',
        icon: 'none'
      });
      return;
    }
    
    wx.showModal({
      title: '编辑物品',
      content: `编辑功能开发中\n物品: ${item.name || '未命名'}`,
      showCancel: false
    });
  },

  /**
   * 删除物品
   */
  deleteItem: function(e) {
    const item = e.currentTarget.dataset.item;
    const that = this;
    
    console.log('=== 开始删除物品 ===');
    console.log('要删除的物品:', item);
    console.log('物品图片URL (image字段):', item.image);
    console.log('物品图片URL (url字段):', item.url);
    
    // 优先使用image字段，如果没有则使用url字段
    const imageUrl = item.image || item.url;
    console.log('最终使用的图片URL:', imageUrl);
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件衣物吗？删除后无法恢复。',
      success: function(res) {
        if (res.confirm) {
          wx.showLoading({
            title: '删除中...'
          });
          
          // 先删除云存储中的图片文件
          that.deleteCloudStorageImage(imageUrl, function(imageDeleteSuccess) {
            console.log('云存储删除结果:', imageDeleteSuccess);
            
            // 然后从数据库中删除记录
            const db = wx.cloud.database();
            db.collection("clothes").doc(item.id).remove({
              success: function(deleteRes) {
                console.log('从数据库删除成功:', deleteRes);
                wx.hideLoading();
                
                // 重新加载数据
                that.loadUserClothes();
                
                if (imageDeleteSuccess) {
                  wx.showToast({
                    title: '删除成功',
                    icon: 'success'
                  });
                } else {
                  wx.showToast({
                    title: '数据已删除，但图片删除失败',
                    icon: 'none',
                    duration: 3000
                  });
                }
              },
              fail: function(error) {
                console.error('从数据库删除失败:', error);
                wx.hideLoading();
                wx.showToast({
                  title: '删除失败，请重试',
                  icon: 'none',
                  duration: 2000
                });
              }
            });
          });
        }
      }
    });
  },

  /**
   * 删除云存储中的图片文件
   */
  deleteCloudStorageImage: function(imageUrl, callback) {
    if (!imageUrl) {
      console.log('没有图片URL，跳过云存储删除');
      callback(true);
      return;
    }

    console.log('=== 开始删除云存储图片 ===');
    console.log('原始图片URL:', imageUrl);

    // 从fileID中提取文件路径
    let filePath = '';
    if (imageUrl.includes('tcb.qcloud.la')) {
      // 从完整URL中提取路径
      // https://xxx.tcb.qcloud.la/ai_recognition/1758546765072.jpg
      const urlParts = imageUrl.split('/');
      filePath = urlParts.slice(3).join('/'); // 去掉域名部分
    } else if (imageUrl.startsWith('cloud://')) {
      // 处理cloud://格式的fileID
      // cloud://cloud1-5g2ffclu18317b9c.636c-cloud1-5g2ffclu18317b9c-1378258181/ai_recognition/1758546765072.jpg
      // 需要提取 ai_recognition/1758546765072.jpg 部分
      const parts = imageUrl.split('/');
      if (parts.length > 3) {
        filePath = parts.slice(3).join('/'); // 去掉 cloud:// 和 env.bucket 部分
      } else {
        filePath = imageUrl; // 如果格式不对，直接使用原URL
      }
    } else {
      // 直接使用作为路径
      filePath = imageUrl;
    }

    console.log('提取的文件路径:', filePath);
    console.log('准备删除云存储文件:', filePath);

    // 尝试使用fileID直接删除
    wx.cloud.deleteFile({
      fileList: [imageUrl], // 直接使用原始fileID
      success: function(res) {
        console.log('云存储文件删除成功 (使用fileID):', res);
        callback(true);
      },
      fail: function(error) {
        console.error('使用fileID删除失败:', error);
        console.log('尝试使用文件路径删除...');
        
        // 如果fileID删除失败，尝试使用文件路径
        wx.cloud.deleteFile({
          fileList: [filePath],
          success: function(res) {
            console.log('云存储文件删除成功 (使用路径):', res);
            callback(true);
          },
          fail: function(error2) {
            console.error('使用文件路径删除也失败:', error2);
            console.error('删除失败的文件路径:', filePath);
            console.error('删除失败的fileID:', imageUrl);
            // 即使云存储删除失败，也继续删除数据库记录
            callback(false);
          }
        });
      }
    });
  },

  /**
   * 显示物品菜单
   */
  showItemMenu: function(e) {
    // 长按显示更多操作
    const item = e.currentTarget.dataset.item;
    const that = this;
    
    wx.showActionSheet({
      itemList: ['编辑', '删除', '查看详情'],
      success: function(res) {
        if (res.tapIndex === 0) {
          // 编辑
          that.editItem({ currentTarget: { dataset: { item: item } } });
        } else if (res.tapIndex === 1) {
          // 删除
          that.deleteItem({ currentTarget: { dataset: { item: item } } });
        } else if (res.tapIndex === 2) {
          // 查看详情
          that.viewItemDetails(item);
        }
      }
    });
  },

  /**
   * 查看物品详情
   */
  viewItemDetails: function(item) {
    console.log('=== 查看物品详情 ===');
    console.log('物品数据:', item);
    
    // 分类ID到分类名称的映射
    const categoryNames = {
      1: '上衣',
      2: '外套', 
      3: '裙装',
      4: '裤装',
      5: '鞋子',
      6: '配饰'
    };
    
    // 获取分类名称
    const categoryName = categoryNames[item.categoryId] || item.classify || '未分类';
    
    console.log('分类ID:', item.categoryId);
    console.log('分类名称:', categoryName);
    
    wx.showModal({
      title: item.name || '物品详情',
      content: `分类：${categoryName}\n风格：${item.style || '未知'}\n颜色：${item.color || '未知'}\n搭配建议：${item.stylingAdvice || '暂无建议'}`,
      showCancel: false,
      confirmText: '知道了'
    });
  },

  /**
   * 保存AI识别结果到数据库
   */
  saveAIRecognitionToDatabase: function(imagePath, aiResult) {
    const that = this;
    const app = getApp();
    const openid = app.globalData.openid;
    
    if (!openid) {
      console.error('用户openid不存在，无法保存数据');
      wx.showToast({
        title: '用户信息异常，请重新登录',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 先上传图片到云存储
    that.uploadImageForAIRecognition(imagePath, aiResult);
  },

  /**
   * 上传AI识别图片到云存储
   */
  uploadImageForAIRecognition: function(imagePath, aiResult) {
    const that = this;
    
    wx.showLoading({
      title: '上传图片中...',
    });
    
    // 生成云存储路径
    const timestamp = Date.now();
    const fileExtension = imagePath.match(/\.[^.]+?$/)[0] || '.jpg';
    const cloudPath = `ai_recognition/${timestamp}${fileExtension}`;
    
    console.log('开始上传AI识别图片:', {
      localPath: imagePath,
      cloudPath: cloudPath
    });
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: imagePath,
      success: res => {
        console.log('AI识别图片上传成功:', res);
        
        // 生成云存储URL - 使用正确的格式
        const imageUrl = res.fileID; // 使用云存储返回的fileID
        
        // 上传成功后保存到数据库
        that.saveToDatabaseWithCloudImage(imageUrl, aiResult);
        
      },
      fail: error => {
        console.error('AI识别图片上传失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '图片上传失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 使用云存储图片URL保存到数据库
   */
  saveToDatabaseWithCloudImage: function(imageUrl, aiResult) {
    const that = this;
    const app = getApp();
    const openid = app.globalData.openid;
    
    // 根据AI识别结果确定分类ID - 修复字段映射
    let categoryId = 1; // 默认分类
    if (aiResult.category || aiResult.categoryId) {
      categoryId = aiResult.category || aiResult.categoryId;
    }
    
    // 根据分类ID确定分类名称
    const categoryNames = {
      1: '上衣',
      2: '外套', 
      3: '裙装',
      4: '裤装',
      5: '鞋子',
      6: '配饰'
    };
    
    const db = wx.cloud.database();
    db.collection("clothes").add({
      data: {
        // 注意：_openid字段将由系统自动添加，不需要手动设置
        
        // 基本信息 - 根据AI识别结果生成有意义的名称
        name: that.generateItemName(aiResult, categoryNames[categoryId]),
        classify: categoryNames[categoryId] || '未分类',
        details: aiResult.details || 'AI识别',
        style: aiResult.style || '未知',
        color: aiResult.color || '未知',
        stylingAdvice: aiResult.stylingAdvice || '建议搭配基础款单品',
        
        // 图片信息 - 使用云存储URL
        url: imageUrl,  // ✅ 现在使用云存储URL
        imagefrom: 'ai_recognition',
        
        // 分类信息
        categoryId: categoryId,
        
        // AI识别信息
        confidence: aiResult.confidence || 0,
        aiGenerated: true,
        
        // 时间信息
        addTime: new Date().toISOString().split('T')[0],
        createTime: new Date(),
        
        // 标签信息
        tags: aiResult.tags || `${aiResult.style || '未知'} ${aiResult.color || '未知'}`,
        
        // 其他信息
        status: 'active',
        isDeleted: false
      },
      success: function(res) {
        console.log('保存AI识别结果到数据库成功:', res);
        wx.hideLoading();
        
        // 重新加载数据
        that.loadUserClothes();
        
        // 切换到新添加物品的分类
        const categoryId = aiResult.categoryId || 1;
        const category = that.data.categories.find(cat => cat.id === categoryId);
        if (category) {
          that.setData({
            currentCategoryId: categoryId,
            currentCategoryName: category.name
          });
        }
        
        wx.showToast({
          title: 'AI识别完成，添加成功！',
          icon: 'success'
        });
      },
      fail: function(error) {
        console.error('保存AI识别结果到数据库失败:', error);
        wx.hideLoading();
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 根据AI识别结果生成有意义的物品名称
   */
  generateItemName: function(aiResult, categoryName) {
    // 如果AI返回了明确的名称，直接使用 - 修复字段映射
    const itemName = aiResult.name || aiResult.itemName;
    if (itemName && itemName !== '未命名衣物') {
      return itemName;
    }
    
    // 根据AI识别结果组合生成名称
    const parts = [];
    
    // 添加分类名称
    if (categoryName && categoryName !== '未分类') {
      parts.push(categoryName);
    }
    
    // 添加颜色信息
    if (aiResult.color && aiResult.color !== '未知' && aiResult.color !== '智能识别') {
      parts.push(aiResult.color);
    }
    
    // 添加风格信息
    if (aiResult.style && aiResult.style !== '未知' && aiResult.style !== '智能识别') {
      parts.push(aiResult.style);
    }
    
    // 如果parts为空，使用默认名称
    if (parts.length === 0) {
      return 'AI识别衣物';
    }
    
    // 组合名称，最多3个部分
    const name = parts.slice(0, 3).join(' ');
    
    // 如果名称太长，截取前10个字符
    return name.length > 10 ? name.substring(0, 10) + '...' : name;
  },

  /**
   * 下拉刷新
   */
  onPullDownRefresh: function() {
    this.initData();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  }
})