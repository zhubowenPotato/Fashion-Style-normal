const app = getApp();

Page({
  data: {
    userInfo: null,
    presetTags: [], // 所有可选的预设标签
    selectedTags: [], // 用户已选择的标签
    customTags: [], // 用户自定义标签
    customTagInput: '',
    showAddModal: false,
    profilePhoto: null,
    // AI识别相关
    aiRecognitionResult: null, // AI识别结果
    showAiResultModal: false, // 是否显示AI识别结果弹窗
    aiRecognizedTags: [], // AI识别的标签
    aiConfidencePercent: 0, // AI识别置信度百分比
    isRecognizing: false // 是否正在识别中
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
    
    // 从数据库加载用户完整信息
    this.loadUserProfileFromDatabase();
    
    // 加载用户选择的标签
    this.loadUserTags();
    
    // 加载形象照
    this.loadProfilePhoto();
  },

  // 从数据库加载用户完整信息
  loadUserProfileFromDatabase: function() {
    const that = this;
    
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'getUserProfile'
      },
      success: function(res) {
        if (res.result.success && res.result.data) {
          const userData = res.result.data;
          console.log('从数据库加载用户信息成功:', userData);
          
          // 更新用户信息
          if (userData.nickName || userData.avatarUrl) {
            const cleanUserInfo = {
              nickName: userData.nickName || '微信用户',
              avatarUrl: userData.avatarUrl || '/images/default-avatar.svg',
              gender: userData.gender || 0,
              country: userData.country || '',
              province: userData.province || '',
              city: userData.city || '',
              language: userData.language || 'zh_CN'
            };
            
            that.setData({
              userInfo: cleanUserInfo
            });
            
            // 更新全局数据
            const app = getApp();
            app.globalData.userInfo = cleanUserInfo;
            
            // 更新本地存储
            wx.setStorageSync('userInfo', cleanUserInfo);
          }
          
          // 标签信息由 loadUserTags 函数单独处理
        }
      },
      fail: function(err) {
        console.error('从数据库加载用户信息失败:', err);
        // 失败时继续使用本地数据
      }
    });
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

    // 保存到数据库
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'saveUserInfo',
        userInfo: cleanUserInfo
      },
      success: function(res) {
        console.log('用户信息保存到数据库成功:', res);
      },
      fail: function(err) {
        console.error('用户信息保存到数据库失败:', err);
      }
    });

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
    const that = this;
    
    // 先从本地存储加载（快速显示）
    const localSelectedTags = wx.getStorageSync('selectedTags') || [];
    const localCustomTags = wx.getStorageSync('customTags') || [];
    that.setData({
      selectedTags: localSelectedTags,
      customTags: localCustomTags
    });
    
    // 从数据库加载最新标签数据
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'getUserProfile'
      },
      success: function(res) {
        if (res.result.success && res.result.data && res.result.data.styleTags) {
          const styleTags = res.result.data.styleTags;
          const selectedTags = [];
          const customTags = [];
          
          // 分离预设标签和自定义标签
          const presetTags = that.data.presetTags;
          
          styleTags.forEach(tag => {
            if (presetTags.includes(tag)) {
              selectedTags.push(tag);
            } else {
              customTags.push(tag);
            }
          });
          
          that.setData({
            selectedTags: selectedTags,
            customTags: customTags
          });
          
          // 更新本地存储
          wx.setStorageSync('selectedTags', selectedTags);
          wx.setStorageSync('customTags', customTags);
          
          console.log('从数据库加载标签成功:', { selectedTags, customTags });
        } else {
          console.log('数据库中没有标签数据，使用本地存储');
        }
      },
      fail: function(err) {
        console.error('从数据库加载标签失败:', err);
        // 失败时继续使用本地存储的数据
      }
    });
  },

  // 保存用户标签
  saveUserTags: function() {
    const selectedTags = this.data.selectedTags;
    const customTags = this.data.customTags;
    const allTags = [...selectedTags, ...customTags];
    
    console.log('保存标签到数据库:', { selectedTags, customTags, allTags });
    
    // 保存到数据库
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'saveStyleTags',
        styleTags: allTags
      },
      success: function(res) {
        console.log('风格标签保存到数据库成功:', res);
      },
      fail: function(err) {
        console.error('风格标签保存到数据库失败:', err);
        wx.showToast({
          title: '保存失败',
          icon: 'error'
        });
      }
    });
    
    // 保存到本地存储
    wx.setStorageSync('selectedTags', selectedTags);
    wx.setStorageSync('customTags', customTags);
  },

  // 调试函数：测试标签同步
  testTagsSync: function() {
    console.log('=== 标签同步测试 ===');
    console.log('当前页面标签:', {
      presetTags: this.data.presetTags,
      selectedTags: this.data.selectedTags,
      customTags: this.data.customTags
    });
    console.log('本地存储标签:', {
      selectedTags: wx.getStorageSync('selectedTags'),
      customTags: wx.getStorageSync('customTags')
    });
    
    // 从数据库重新加载
    this.loadUserTags();
  },

  // 强制同步标签到数据库
  forceSyncTags: function() {
    console.log('=== 强制同步标签到数据库 ===');
    const allTags = [...this.data.selectedTags, ...this.data.customTags];
    console.log('要同步的标签:', allTags);
    
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'saveStyleTags',
        styleTags: allTags
      },
      success: function(res) {
        console.log('强制同步成功:', res);
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        });
      },
      fail: function(err) {
        console.error('强制同步失败:', err);
        wx.showToast({
          title: '同步失败',
          icon: 'error'
        });
      }
    });
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
    let selectedTags = this.data.selectedTags;
    
    // 从选中列表中移除该标签
    const selectedIndex = selectedTags.indexOf(tag);
    if (selectedIndex > -1) {
      selectedTags.splice(selectedIndex, 1);
      
      this.setData({
        selectedTags: selectedTags
      });
      
      // 保存到数据库
      this.saveUserTags();
      
      wx.showToast({
        title: '已删除标签',
        icon: 'success'
      });
    }
  },

  // 删除自定义标签
  removeCustomTag: function(e) {
    const tag = e.currentTarget.dataset.tag;
    let customTags = this.data.customTags;
    
    const index = customTags.indexOf(tag);
    if (index > -1) {
      customTags.splice(index, 1);
      
      this.setData({
        customTags: customTags
      });
      
      // 保存到数据库
      this.saveUserTags();
      
      wx.showToast({
        title: '已删除标签',
        icon: 'success'
      });
    }
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
        
        // 直接上传原图，不压缩
        that.uploadProfilePhoto(tempFilePath);
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
    
    // 上传到云存储
    const cloudPath = `profile-photos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: function(uploadRes) {
        console.log('形象照上传成功:', uploadRes);
        
        // 保存到数据库
        that.saveProfilePhotoToDatabase(uploadRes.fileID, filePath);
      },
      fail: function(err) {
        console.error('形象照上传失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
      }
    });
  },

  // 保存形象照到数据库
  saveProfilePhotoToDatabase: function(fileID, originalFilePath) {
    const that = this;
    
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'saveProfilePhoto',
        profilePhoto: fileID
      },
      success: function(res) {
        console.log('形象照保存到数据库成功:', res);
        
        // 更新页面显示
        that.setData({
          profilePhoto: fileID
        });
        
        // 保存到本地存储作为备份
        wx.setStorageSync('profilePhoto', fileID);
        
        wx.hideLoading();
        wx.showToast({
          title: '上传成功',
          icon: 'success'
        });
        
        // 开始AI风格识别
        if (originalFilePath) {
          that.recognizeProfileStyle(originalFilePath);
        }
      },
      fail: function(err) {
        console.error('形象照保存到数据库失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },

  // AI识别形象照风格
  recognizeProfileStyle: function(filePath) {
    const that = this;
    
    // 检查用户是否已有自定义标签
    if (that.data.customTags && that.data.customTags.length > 0) {
      console.log('用户已有自定义标签，跳过AI识别');
      wx.showToast({
        title: '您已有自定义标签，无需AI识别',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 引入AI识别工具
    const AIRecognition = require('../../utils/aiRecognition.js');
    const aiRecognition = new AIRecognition();
    
    // 设置识别状态
    that.setData({
      isRecognizing: true
    });
    
    // 显示识别进度
    wx.showLoading({
      title: '风格识别中...',
      mask: true
    });
    
    // 开始识别
    aiRecognition.recognizeProfileStyle(filePath, function(progress) {
      console.log('AI识别进度:', progress);
      
      // 更新进度提示
      if (progress.stage === 'recognition') {
        wx.showLoading({
          title: '风格识别中...',
          mask: true
        });
      }
    }).then(function(result) {
      console.log('AI风格识别完成:', result);
      
      that.setData({
        isRecognizing: false
      });
      
      wx.hideLoading();
      
      if (result.success && result.data.styleTags && result.data.styleTags.length > 0) {
        // 识别成功，显示结果弹窗
        that.setData({
          aiRecognitionResult: result.data,
          aiRecognizedTags: result.data.styleTags,
          aiConfidencePercent: Math.round((result.data.confidence || 0) * 100),
          showAiResultModal: true
        });
      } else {
        // 识别失败或没有识别到标签
        wx.showToast({
          title: 'AI识别失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(function(error) {
      console.error('AI风格识别失败:', error);
      
      that.setData({
        isRecognizing: false
      });
      
      wx.hideLoading();
      wx.showToast({
        title: 'AI识别失败，请重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // 应用AI识别的标签
  applyAiRecognizedTags: function() {
    const that = this;
    const aiTags = that.data.aiRecognizedTags;
    let selectedTags = [...that.data.selectedTags];
    let customTags = [...that.data.customTags];
    const presetTags = that.data.presetTags;
    
    // 添加AI识别的标签（避免重复）
    aiTags.forEach(function(tag) {
      // 检查是否在预设标签中
      if (presetTags.includes(tag)) {
        // 是预设标签，添加到selectedTags
        if (selectedTags.indexOf(tag) === -1) {
          selectedTags.push(tag);
        }
      } else {
        // 是自定义标签，添加到customTags
        if (customTags.indexOf(tag) === -1) {
          customTags.push(tag);
        }
      }
    });
    
    that.setData({
      selectedTags: selectedTags,
      customTags: customTags,
      showAiResultModal: false,
      aiRecognitionResult: null,
      aiRecognizedTags: [],
      aiConfidencePercent: 0
    });
    
    // 保存到数据库
    that.saveUserTags();
    
    wx.showToast({
      title: `已添加${aiTags.length}个风格标签`,
      icon: 'success'
    });
  },

  // 忽略AI识别的标签
  ignoreAiRecognizedTags: function() {
    this.setData({
      showAiResultModal: false,
      aiRecognitionResult: null,
      aiRecognizedTags: [],
      aiConfidencePercent: 0
    });
  },

  // 加载形象照
  loadProfilePhoto: function() {
    const that = this;
    
    // 先从本地存储加载（快速显示）
    const localProfilePhoto = wx.getStorageSync('profilePhoto');
    if (localProfilePhoto) {
      that.setData({
        profilePhoto: localProfilePhoto
      });
    }
    
    // 从数据库加载最新数据
    wx.cloud.callFunction({
      name: 'userProfile',
      data: {
        action: 'getUserProfile'
      },
      success: function(res) {
        if (res.result.success && res.result.data.profilePhoto) {
          console.log('从数据库加载形象照成功:', res.result.data.profilePhoto);
          that.setData({
            profilePhoto: res.result.data.profilePhoto
          });
          
          // 更新本地存储
          wx.setStorageSync('profilePhoto', res.result.data.profilePhoto);
        }
      },
      fail: function(err) {
        console.error('从数据库加载形象照失败:', err);
        // 失败时继续使用本地存储的数据
      }
    });
  },

  // 删除形象照
  deleteProfilePhoto: function() {
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除当前的形象照吗？',
      success: function(res) {
        if (res.confirm) {
          // 删除云存储中的文件
          if (that.data.profilePhoto) {
            wx.cloud.deleteFile({
              fileList: [that.data.profilePhoto],
              success: function(deleteRes) {
                console.log('云存储文件删除成功:', deleteRes);
              },
              fail: function(err) {
                console.error('云存储文件删除失败:', err);
              }
            });
          }
          
          // 从数据库中删除
          wx.cloud.callFunction({
            name: 'userProfile',
            data: {
              action: 'saveProfilePhoto',
              profilePhoto: null
            },
            success: function(res) {
              console.log('数据库形象照删除成功:', res);
            },
            fail: function(err) {
              console.error('数据库形象照删除失败:', err);
            }
          });
          
          // 更新页面显示
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
