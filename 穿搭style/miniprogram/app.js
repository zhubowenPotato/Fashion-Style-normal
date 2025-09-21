//app.js

App({
  data: {
    imageAllList: [], //查询出来的图片url集合，
    total: 0,
    userInfo:null,
     searchnameImage:[],
    searchstyleImage: [],
    length:''
 },
  
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: 'cloud1-5g2ffclu18317b9c',
        traceUser: true,
      })
    }

    this.globalData = {}
    // 展示本地存储能力
    var logs = wx.getStorageSync('logs') || []
    logs.unshift(Date.now())
    wx.setStorageSync('logs', logs)
    
    // 获取用户openid和unionid
    this.getUserOpenId()
    
    // 获取地理位置
    wx.getLocation({
      success: res => {
        console.log(res,'地理位置')
      }
    })
    
    // 检查用户授权状态
    this.checkUserAuth()
  },
  
  // 获取用户openid和unionid
  getUserOpenId: function() {
    const that = this
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('云函数调用成功，完整返回结果:', res)
        console.log('云函数返回的result:', res.result)
        
        // 检查云函数返回结果
        if (res.result && res.result.success && res.result.openid) {
          console.log('用户登录成功:', res.result)
          that.globalData.openid = res.result.openid
          that.globalData.unionid = res.result.unionid || ''
          that.globalData.appid = res.result.appid || ''
          console.log('OpenID获取成功:', res.result.openid)
        } else {
          console.error('云函数返回结果异常:', res.result)
          // 如果云函数失败，尝试其他方式获取openid
          that.getOpenIdByWxLogin()
        }
      },
      fail: err => {
        console.error('获取用户openid失败:', err)
        // 云函数失败时，尝试其他方式
        that.getOpenIdByWxLogin()
      }
    })
  },
  
  // 备用方案：通过wx.login获取openid
  getOpenIdByWxLogin: function() {
    const that = this
    wx.login({
      success: res => {
        if (res.code) {
          console.log('获取code成功:', res.code)
          // 这里可以调用自己的服务器接口，用code换取openid
          // 或者直接使用code作为临时标识
          that.globalData.openid = res.code
          that.globalData.unionid = ''
          that.globalData.appid = ''
        } else {
          console.error('获取code失败:', res.errMsg)
        }
      },
      fail: err => {
        console.error('wx.login失败:', err)
      }
    })
  },
  
  // 检查用户授权状态
  checkUserAuth: function() {
    const that = this
    // 检查本地存储是否有用户信息
    const userInfo = wx.getStorageSync('userInfo')
    if (userInfo) {
      console.log('从本地存储获取用户信息:', userInfo)
      that.globalData.userInfo = userInfo
      // 触发回调
      if (that.userInfoReadyCallback) {
        that.userInfoReadyCallback({ userInfo: userInfo })
      }
    } else {
      console.log('用户未授权，需要引导授权')
    }
  },
  
  // 获取用户详细信息 - 注意：getUserProfile 已无法获取真实昵称和头像
  getUserInfo: function() {
    const that = this
    wx.getUserProfile({
      desc: '用于完善用户资料',
      success: res => {
        console.log('getUserProfile 返回结果:', res.userInfo)
        console.log('注意：nickName 和 avatarUrl 已无法获取真实信息')
        
          // 清理用户信息，处理可能的编码问题
          const cleanUserInfo = {
            nickName: '微信用户', // getUserProfile 已无法获取真实昵称
            avatarUrl: '/images/default-avatar.svg', // getUserProfile 已无法获取真实头像
            gender: res.userInfo.gender || 0,
            country: res.userInfo.country || '',
            province: res.userInfo.province || '',
            city: res.userInfo.city || '',
            language: res.userInfo.language || 'zh_CN'
          };
        
        console.log('清理后的用户信息:', cleanUserInfo);
        
        that.globalData.userInfo = cleanUserInfo
        // 保存到本地存储
        wx.setStorageSync('userInfo', cleanUserInfo)
        // 触发回调
        if (that.userInfoReadyCallback) {
          that.userInfoReadyCallback({...res, userInfo: cleanUserInfo})
        }
      },
      fail: err => {
        console.error('获取用户信息失败:', err)
      }
    })
  },
  
  // 用户信息获取完成回调
  userInfoReadyCallback: null,
  globalData: {
    userInfo: null,
    urlPath: "https://www.baidu.com/",
    about: '图片来自网络，若有侵权，请联系author_tel：15559193973删除！',
    openid:''
  }
}) 