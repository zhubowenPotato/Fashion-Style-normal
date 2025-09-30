// 云函数入口文件
const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前环境
})

const db = cloud.database()

/**
 * 用户信息管理云函数
 * 功能：
 * 1. 保存/更新用户基本信息
 * 2. 保存/更新用户形象照
 * 3. 保存/更新用户风格标签
 * 4. 获取用户完整信息
 */
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  if (!openid) {
    return {
      success: false,
      error: '用户未登录',
      data: null
    }
  }

  const { action, userInfo, profilePhoto, styleTags, userAnalysis } = event

  try {
    switch (action) {
      case 'saveUserInfo':
        return await saveUserInfo(openid, userInfo)
      case 'saveProfilePhoto':
        return await saveProfilePhoto(openid, profilePhoto)
      case 'saveStyleTags':
        return await saveStyleTags(openid, styleTags)
      case 'getUserProfile':
        return await getUserProfile(openid)
      case 'updateUserProfile':
        return await updateUserProfile(openid, event.data)
      case 'saveUserAnalysis':
        return await saveUserAnalysis(openid, userAnalysis)
      default:
        return {
          success: false,
          error: '未知操作类型',
          data: null
        }
    }
  } catch (error) {
    console.error('用户信息管理云函数错误:', error)
    return {
      success: false,
      error: error.message,
      data: null
    }
  }
}

/**
 * 保存用户基本信息
 */
async function saveUserInfo(openid, userInfo) {
  try {
    const userData = {
      _openid: openid,
      nickName: userInfo.nickName || '微信用户',
      avatarUrl: userInfo.avatarUrl || '/images/default-avatar.svg',
      gender: userInfo.gender || 0,
      country: userInfo.country || '',
      province: userInfo.province || '',
      city: userInfo.city || '',
      language: userInfo.language || 'zh_CN',
      updateTime: new Date(),
      createTime: new Date()
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('userProfiles').where({
      _openid: openid
    }).get()

    if (existingUser.data.length > 0) {
      // 更新现有用户信息
      const result = await db.collection('userProfiles').where({
        _openid: openid
      }).update({
        data: {
          ...userData,
          createTime: existingUser.data[0].createTime // 保持原始创建时间
        }
      })

      return {
        success: true,
        message: '用户信息更新成功',
        data: userData
      }
    } else {
      // 创建新用户
      const result = await db.collection('userProfiles').add({
        data: userData
      })

      return {
        success: true,
        message: '用户信息创建成功',
        data: userData
      }
    }
  } catch (error) {
    console.error('保存用户信息失败:', error)
    throw error
  }
}

/**
 * 保存用户形象照
 */
async function saveProfilePhoto(openid, profilePhoto) {
  try {
    const photoData = {
      _openid: openid,
      profilePhoto: profilePhoto,
      updateTime: new Date()
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('userProfiles').where({
      _openid: openid
    }).get()

    if (existingUser.data.length > 0) {
      // 更新形象照
      const result = await db.collection('userProfiles').where({
        _openid: openid
      }).update({
        data: photoData
      })

      return {
        success: true,
        message: '形象照更新成功',
        data: photoData
      }
    } else {
      // 创建新用户记录
      const userData = {
        _openid: openid,
        nickName: '微信用户',
        avatarUrl: '/images/default-avatar.svg',
        gender: 0,
        country: '',
        province: '',
        city: '',
        language: 'zh_CN',
        profilePhoto: profilePhoto,
        createTime: new Date(),
        updateTime: new Date()
      }

      const result = await db.collection('userProfiles').add({
        data: userData
      })

      return {
        success: true,
        message: '形象照保存成功',
        data: userData
      }
    }
  } catch (error) {
    console.error('保存形象照失败:', error)
    throw error
  }
}

/**
 * 保存用户风格标签
 */
async function saveStyleTags(openid, styleTags) {
  try {
    const tagsData = {
      _openid: openid,
      styleTags: styleTags || [],
      updateTime: new Date()
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('userProfiles').where({
      _openid: openid
    }).get()

    if (existingUser.data.length > 0) {
      // 更新风格标签
      const result = await db.collection('userProfiles').where({
        _openid: openid
      }).update({
        data: tagsData
      })

      return {
        success: true,
        message: '风格标签更新成功',
        data: tagsData
      }
    } else {
      // 创建新用户记录
      const userData = {
        _openid: openid,
        nickName: '微信用户',
        avatarUrl: '/images/default-avatar.svg',
        gender: 0,
        country: '',
        province: '',
        city: '',
        language: 'zh_CN',
        styleTags: styleTags || [],
        createTime: new Date(),
        updateTime: new Date()
      }

      const result = await db.collection('userProfiles').add({
        data: userData
      })

      return {
        success: true,
        message: '风格标签保存成功',
        data: userData
      }
    }
  } catch (error) {
    console.error('保存风格标签失败:', error)
    throw error
  }
}

/**
 * 获取用户完整信息
 */
async function getUserProfile(openid) {
  try {
    const result = await db.collection('userProfiles').where({
      _openid: openid
    }).get()

    if (result.data.length > 0) {
      return {
        success: true,
        message: '获取用户信息成功',
        data: result.data[0]
      }
    } else {
      // 用户不存在，返回默认信息
      const defaultUserData = {
        _openid: openid,
        nickName: '微信用户',
        avatarUrl: '/images/default-avatar.svg',
        gender: 0,
        country: '',
        province: '',
        city: '',
        language: 'zh_CN',
        profilePhoto: null,
        styleTags: [],
        createTime: new Date(),
        updateTime: new Date()
      }

      return {
        success: true,
        message: '用户信息不存在，返回默认信息',
        data: defaultUserData
      }
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    throw error
  }
}

/**
 * 更新用户完整信息
 */
async function updateUserProfile(openid, data) {
  try {
    const updateData = {
      ...data,
      _openid: openid,
      updateTime: new Date()
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('userProfiles').where({
      _openid: openid
    }).get()

    if (existingUser.data.length > 0) {
      // 更新现有用户信息
      const result = await db.collection('userProfiles').where({
        _openid: openid
      }).update({
        data: {
          ...updateData,
          createTime: existingUser.data[0].createTime // 保持原始创建时间
        }
      })

      return {
        success: true,
        message: '用户信息更新成功',
        data: updateData
      }
    } else {
      // 创建新用户
      const userData = {
        ...updateData,
        createTime: new Date()
      }

      const result = await db.collection('userProfiles').add({
        data: userData
      })

      return {
        success: true,
        message: '用户信息创建成功',
        data: userData
      }
    }
  } catch (error) {
    console.error('更新用户信息失败:', error)
    throw error
  }
}

/**
 * 保存用户分析信息（从形象照提取的详细用户信息）
 */
async function saveUserAnalysis(openid, userAnalysis) {
  try {
    const analysisData = {
      userAnalysis: userAnalysis,
      updateTime: new Date()
    }

    // 检查用户是否已存在
    const existingUser = await db.collection('userProfiles').where({
      _openid: openid
    }).get()

    if (existingUser.data.length > 0) {
      // 更新现有用户的分析信息
      const result = await db.collection('userProfiles').where({
        _openid: openid
      }).update({
        data: analysisData
      })

      return {
        success: true,
        message: '用户分析信息更新成功',
        data: analysisData
      }
    } else {
      // 创建新用户记录
      const userData = {
        _openid: openid,
        nickName: '微信用户',
        avatarUrl: '/images/default-avatar.svg',
        gender: 0,
        country: '',
        province: '',
        city: '',
        language: 'zh_CN',
        profilePhoto: null,
        styleTags: [],
        userAnalysis: userAnalysis,
        createTime: new Date(),
        updateTime: new Date()
      }

      const result = await db.collection('userProfiles').add({
        data: userData
      })

      return {
        success: true,
        message: '用户分析信息保存成功',
        data: userData
      }
    }
  } catch (error) {
    console.error('保存用户分析信息失败:', error)
    throw error
  }
}
