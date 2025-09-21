const app = getApp();
Page({
  data: {
    // 用户信息
    userInfo: {
      nickName: '',
      avatarUrl: '/images/default-avatar.svg'
    }
  },
  
  onLoad: function () {
    var that = this;
    // 检查是否已有用户信息
    if (app.globalData.userInfo || wx.getStorageSync('userInfo')) {
      // 已有用户信息，直接跳转
      wx.switchTab({
        url: '/pages/my/my'
      })
    }
  },
  
  // 选择头像
  onChooseAvatar: function(e) {
    console.log('选择头像:', e.detail.avatarUrl);
    const avatarUrl = e.detail.avatarUrl;
    
    this.setData({
      'userInfo.avatarUrl': avatarUrl
    });
  },

  // 输入昵称
  onNicknameInput: function(e) {
    console.log('输入昵称:', e.detail.value);
    const nickName = e.detail.value;
    
    this.setData({
      'userInfo.nickName': nickName
    });
  },

  // 保存用户信息
  saveUserInfo: function() {
    const userInfo = this.data.userInfo;
    
    if (!userInfo.nickName || !userInfo.avatarUrl) {
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
      gender: 0,
      country: '',
      province: '',
      city: '',
      language: 'zh_CN'
    };

    console.log('保存用户信息:', cleanUserInfo);

    // 保存到本地存储
    wx.setStorageSync('userInfo', cleanUserInfo);
    
    // 更新全局数据
    app.globalData.userInfo = cleanUserInfo;
    
    wx.showToast({
      title: '设置成功',
      icon: 'success'
    });
    
    // 跳转到个人中心
    setTimeout(() => {
      wx.switchTab({
        url: '/pages/my/my'
      });
    }, 1500);
  }
});