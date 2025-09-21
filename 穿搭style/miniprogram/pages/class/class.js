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
      },
      {
        id: 7,
        name: '内衣',
        icon: 'https://img.icons8.com/fluency/96/ff6b9d/bra.png',
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
    this.updateCategoryCounts();
    
    // 默认显示第一个分类
    const categoryId = 1;
    const category = this.data.categories.find(cat => cat.id === categoryId);
    if (category) {
      const currentItems = this.data.allItems.filter(item => item.categoryId === categoryId);
      this.setData({
        currentCategoryId: categoryId,
        currentCategoryName: category.name,
        currentItemCount: currentItems.length,
        currentItems: currentItems
      });
    }
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

    // 立即开始进度条动画，让用户感受到即时反馈
    let progress = 0;
    const progressInterval = setInterval(() => {
      // 使用更平滑的进度递增，模拟真实的AI识别过程
      if (progress < 20) {
        progress += Math.random() * 3 + 1; // 初始阶段快速增长
      } else if (progress < 60) {
        progress += Math.random() * 2 + 0.5; // 中期阶段中等速度
      } else if (progress < 90) {
        progress += Math.random() * 1 + 0.3; // 后期阶段较慢
      } else {
        progress += Math.random() * 0.5 + 0.1; // 最后阶段很慢
      }
      
      // 确保进度不超过95%，留5%给实际完成
      progress = Math.min(progress, 95);
      
      that.setData({ recognitionProgress: Math.floor(progress) });
      
      // 当进度达到95%时，开始实际的AI识别
      if (progress >= 95) {
        clearInterval(progressInterval);
        that.performAIRecognition(imagePath);
      }
    }, 100); // 更频繁的更新，让动画更流畅
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
    
    // 调用AI识别服务
    that.data.aiRecognition.recognizeClothing(imagePath).then(result => {
      console.log('AI识别结果:', result);
      
      // 先完成进度条到100%
      that.setData({ recognitionProgress: 100 });
      
      // 延迟一点时间让用户看到100%完成
      setTimeout(() => {
        that.setData({
          aiResult: result,
          showAIRecognition: false
        });
        
        // 添加新物品
        const newItem = {
          id: Date.now(),
          categoryId: result.categoryId,
          name: result.itemName,
          image: imagePath,
          tags: result.tags,
          style: result.style,
          color: result.color,
          confidence: result.confidence,
          aiGenerated: result.aiGenerated,
          addTime: new Date().toISOString().split('T')[0]
        };
        
        const allItems = [...that.data.allItems, newItem];
        that.setData({ allItems });
        that.updateCategoryCounts();
        
        // 切换到新添加物品的分类
        const categoryId = result.categoryId;
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
          title: 'AI识别完成，添加成功！',
          icon: 'success'
        });
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
    const item = e.currentTarget.dataset.item;
    wx.showModal({
      title: '编辑物品',
      content: '编辑功能开发中',
      showCancel: false
    });
  },

  /**
   * 删除物品
   */
  deleteItem: function(e) {
    const item = e.currentTarget.dataset.item;
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件衣物吗？',
      success: function(res) {
        if (res.confirm) {
          const allItems = that.data.allItems.filter(i => i.id !== item.id);
          that.setData({ allItems });
          that.updateCategoryCounts();
          
          // 刷新当前分类显示
          const categoryId = that.data.currentCategoryId;
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
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 显示物品菜单
   */
  showItemMenu: function(e) {
    // 长按显示更多操作
    const item = e.currentTarget.dataset.item;
    wx.showActionSheet({
      itemList: ['编辑', '删除', '查看详情'],
      success: function(res) {
        if (res.tapIndex === 0) {
          // 编辑
        } else if (res.tapIndex === 1) {
          // 删除
        } else if (res.tapIndex === 2) {
          // 查看详情
        }
      }
    });
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