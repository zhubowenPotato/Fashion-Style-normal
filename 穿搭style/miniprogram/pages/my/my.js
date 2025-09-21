const app = getApp();

Page({
  data: {
    userInfo: null,
    styleTags: ['甜美', '冷色调', '暖色调', '简约', '复古', '运动', '优雅', '休闲', '正式', '可爱'],
    selectedTags: [],
    customTags: [],
    customTagInput: '',
    showAddModal: false,
    profilePhoto: null
  },
  onLoad: function (options) {
    var that = this;
    
    // 优先从全局数据获取用户信息
    const app = getApp();
    if (app.globalData.userInfo) {
      // 确保用户信息结构正确
      const cleanUserInfo = {
        nickName: app.globalData.userInfo.nickName && app.globalData.userInfo.nickName.trim() ? app.globalData.userInfo.nickName : '微信用户',
        avatarUrl: app.globalData.userInfo.avatarUrl || '/images/default-avatar.svg',
        gender: app.globalData.userInfo.gender || 0,
        country: app.globalData.userInfo.country || '',
        province: app.globalData.userInfo.province || '',
        city: app.globalData.userInfo.city || '',
        language: app.globalData.userInfo.language || 'zh_CN'
      };
      that.setData({
        userInfo: cleanUserInfo
      });
    } else if (wx.getStorageSync('userInfo')) {
      const localUserInfo = wx.getStorageSync('userInfo');
      // 确保用户信息结构正确
      const cleanUserInfo = {
        nickName: localUserInfo.nickName && localUserInfo.nickName.trim() ? localUserInfo.nickName : '微信用户',
        avatarUrl: localUserInfo.avatarUrl || '/images/default-avatar.svg',
        gender: localUserInfo.gender || 0,
        country: localUserInfo.country || '',
        province: localUserInfo.province || '',
        city: localUserInfo.city || '',
        language: localUserInfo.language || 'zh_CN'
      };
      that.setData({
        userInfo: cleanUserInfo
      });
      // 同步到全局数据
      app.globalData.userInfo = cleanUserInfo;
    } else {
      // 如果都没有，尝试获取用户信息
      that.getUserInfo();
    }
    
    // 加载用户选择的标签
    this.loadUserTags();
    
    // 加载形象照
    this.loadProfilePhoto();
  },
  // 选择头像 - 使用新的方式
  onChooseAvatar(e) {
    console.log('选择头像:', e.detail.avatarUrl);
    const avatarUrl = e.detail.avatarUrl;
    
    // 更新用户信息
    const userInfo = this.data.userInfo || {};
    userInfo.avatarUrl = avatarUrl;
    
    this.setData({
      userInfo: userInfo
    });
    
    // 自动保存
    this.saveUserInfo();
  },

  // 输入昵称
  onNicknameInput(e) {
    console.log('输入昵称:', e.detail.value);
    const nickName = e.detail.value;
    
    // 更新用户信息
    const userInfo = this.data.userInfo || {};
    userInfo.nickName = nickName;
    
    this.setData({
      userInfo: userInfo
    });
  },

  // 保存用户信息
  saveUserInfo() {
    const userInfo = this.data.userInfo;
    if (!userInfo || !userInfo.nickName || !userInfo.avatarUrl) {
      wx.showToast({
        title: '请完善头像和昵称',
        icon: 'none'
      });
      return;
    }

    // 清理用户信息
    const cleanUserInfo = {
      nickName: userInfo.nickName.trim() || '用户',
      avatarUrl: userInfo.avatarUrl || '/images/default-avatar.svg',
      gender: userInfo.gender || 0,
      country: userInfo.country || '',
      province: userInfo.province || '',
      city: userInfo.city || '',
      language: userInfo.language || 'zh_CN'
    };

    console.log('保存用户信息:', cleanUserInfo);

    // 保存到本地存储
    wx.setStorageSync('userInfo', cleanUserInfo);
    
    // 更新全局数据
    const app = getApp();
    app.globalData.userInfo = cleanUserInfo;
    
    // 更新页面数据
    this.setData({
      userInfo: cleanUserInfo
    });

    wx.showToast({
      title: '保存成功',
      icon: 'success'
    });
  },

  // 获取用户信息 - 兼容旧版本（已废弃）
  getUserInfo() {
    wx.showToast({
      title: '请使用新的方式设置头像和昵称',
      icon: 'none'
    });
  },
  
  // 兼容旧方法名
  getuserinfo() {
    this.getUserInfo();
  },
  
  // 清理用户信息
  clearUserInfo: function() {
    console.log('清理用户信息');
    // 清除本地存储
    wx.removeStorageSync('userInfo');
    // 清除全局数据
    const app = getApp();
    app.globalData.userInfo = null;
    // 清除页面数据
    this.setData({
      userInfo: null
    });
    wx.showToast({
      title: '已清理用户信息',
      icon: 'success'
    });
  },

  onReady: function () {
    // 页面渲染完成后再次检查用户信息
    const app = getApp();
    if (app.globalData.userInfo && !this.data.userInfo) {
      this.setData({
        userInfo: app.globalData.userInfo
      });
    } else if (wx.getStorageSync('userInfo') && !this.data.userInfo) {
      const localUserInfo = wx.getStorageSync('userInfo');
      this.setData({
        userInfo: localUserInfo
      });
    }
  },
  
  onShow: function () {
    wx.setNavigationBarTitle({
      title: '个人主页'
    });
    
    // 刷新用户信息显示
    const app = getApp();
    if (app.globalData.userInfo) {
      console.log('onShow: 从全局数据刷新用户信息:', app.globalData.userInfo);
      this.setData({
        userInfo: app.globalData.userInfo
      });
    } else if (wx.getStorageSync('userInfo')) {
      const localUserInfo = wx.getStorageSync('userInfo');
      console.log('onShow: 从本地存储刷新用户信息:', localUserInfo);
      this.setData({
        userInfo: localUserInfo
      });
    }
  },
  about: function (e) {
    wx.showModal({
      title: '温馨提示',
      content:  '图片来自网络，若有侵权，请联系作者删除！' || '',
      showCancel: false
    });
  },

  // 加载用户标签
  loadUserTags: function() {
    const selectedTags = wx.getStorageSync('selectedTags') || [];
    const customTags = wx.getStorageSync('customTags') || [];
    this.setData({
      selectedTags: selectedTags,
      customTags: customTags
    });
  },

  // 保存用户标签
  saveUserTags: function() {
    wx.setStorageSync('selectedTags', this.data.selectedTags);
    wx.setStorageSync('customTags', this.data.customTags);
  },

  // 切换标签选择状态
  toggleTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    let selectedTags = this.data.selectedTags;
    const index = selectedTags.indexOf(tag);
    
    if (index > -1) {
      selectedTags.splice(index, 1);
    } else {
      selectedTags.push(tag);
    }
    
    this.setData({
      selectedTags: selectedTags
    });
    this.saveUserTags();
  },

  // 自定义标签输入
  onCustomTagInput: function(e) {
    this.setData({
      customTagInput: e.detail.value
    });
  },

  // 显示添加标签弹窗
  showAddTagModal: function() {
    this.setData({
      showAddModal: true,
      customTagInput: ''
    });
  },

  // 隐藏添加标签弹窗
  hideAddTagModal: function() {
    this.setData({
      showAddModal: false,
      customTagInput: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    // 空函数，用于阻止事件冒泡
  },

  // 添加自定义标签
  addCustomTag: function() {
    const customTag = this.data.customTagInput.trim();
    if (!customTag) {
      wx.showToast({
        title: '请输入标签内容',
        icon: 'none'
      });
      return;
    }
    
    if (customTag.length > 10) {
      wx.showToast({
        title: '标签名称不能超过10个字符',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.customTags.indexOf(customTag) > -1) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }
    
    const customTags = this.data.customTags;
    customTags.push(customTag);
    
    this.setData({
      customTags: customTags,
      customTagInput: '',
      showAddModal: false
    });
    this.saveUserTags();
    
    wx.showToast({
      title: '添加成功',
      icon: 'success'
    });
  },

  // 删除标签（预设标签）
  removeTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    let styleTags = this.data.styleTags;
    let selectedTags = this.data.selectedTags;
    
    const index = styleTags.indexOf(tag);
    if (index > -1) {
      styleTags.splice(index, 1);
    }
    
    // 如果该标签被选中，也要从选中列表中移除
    const selectedIndex = selectedTags.indexOf(tag);
    if (selectedIndex > -1) {
      selectedTags.splice(selectedIndex, 1);
    }
    
    this.setData({
      styleTags: styleTags,
      selectedTags: selectedTags
    });
    this.saveUserTags();
  },

  // 删除自定义标签
  removeCustomTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    let customTags = this.data.customTags;
    let selectedTags = this.data.selectedTags;
    
    const index = customTags.indexOf(tag);
    if (index > -1) {
      customTags.splice(index, 1);
    }
    
    // 如果该标签被选中，也要从选中列表中移除
    const selectedIndex = selectedTags.indexOf(tag);
    if (selectedIndex > -1) {
      selectedTags.splice(selectedIndex, 1);
    }
    
    this.setData({
      customTags: customTags,
      selectedTags: selectedTags
    });
    this.saveUserTags();
  },

  // 选择形象照
  chooseProfilePhoto: function() {
    const that = this;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      camera: 'back',
      success: function(res) {
        console.log('选择形象照成功:', res);
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        // 压缩图片
        wx.compressImage({
          src: tempFilePath,
          quality: 80,
          success: function(compressRes) {
            console.log('图片压缩成功:', compressRes);
            
            // 上传到服务器（这里先保存到本地，实际项目中需要上传到服务器）
            that.uploadProfilePhoto(compressRes.tempFilePath);
          },
          fail: function(err) {
            console.error('图片压缩失败:', err);
            // 压缩失败时使用原图
            that.uploadProfilePhoto(tempFilePath);
          }
        });
      },
      fail: function(err) {
        console.error('选择形象照失败:', err);
        wx.showToast({
          title: '选择照片失败',
          icon: 'none'
        });
      }
    });
  },

  // 上传形象照
  uploadProfilePhoto: function(filePath) {
    const that = this;
    
    wx.showLoading({
      title: '上传中...'
    });
    
    // 这里应该上传到服务器，现在先保存到本地存储
    // 实际项目中需要调用后端API上传图片
    setTimeout(() => {
      // 模拟上传成功
      that.setData({
        profilePhoto: filePath
      });
      
      // 保存到本地存储
      wx.setStorageSync('profilePhoto', filePath);
      
      wx.hideLoading();
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
    }, 1000);
  },

  // 加载形象照
  loadProfilePhoto: function() {
    const profilePhoto = wx.getStorageSync('profilePhoto');
    if (profilePhoto) {
      this.setData({
        profilePhoto: profilePhoto
      });
    }
  },

  // 删除形象照
  deleteProfilePhoto: function() {
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除当前的形象照吗？',
      success: function(res) {
        if (res.confirm) {
          that.setData({
            profilePhoto: null
          });
          
          // 从本地存储中删除
          wx.removeStorageSync('profilePhoto');
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        }
      }
    });
  }

});
