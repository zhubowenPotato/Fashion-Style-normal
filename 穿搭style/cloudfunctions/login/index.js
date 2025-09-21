// 云函数模板
// 部署：在 cloud-functions/login 文件夹右击选择 "上传并部署"

const cloud = require('wx-server-sdk')

// 初始化 cloud
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV // 使用当前环境
})

/**
 * 这个示例将经自动鉴权过的小程序用户 openid 返回给小程序端
 * 
 * event 参数包含小程序端调用传入的 data
 * 
 */
exports.main = async (event, context) => {
  console.log('云函数被调用，event:', event)
  console.log('云函数被调用，context:', context)

  try {
    // 获取 WX Context (微信调用上下文)，包括 OPENID、APPID、及 UNIONID（需满足 UNIONID 获取条件）
    const wxContext = cloud.getWXContext()
    
    console.log('获取到的微信上下文:', wxContext)

    const result = {
      success: true,
      openid: wxContext.OPENID,
      appid: wxContext.APPID,
      unionid: wxContext.UNIONID,
      timestamp: new Date().getTime()
    }

    console.log('云函数返回结果:', result)
    return result

  } catch (error) {
    console.error('云函数执行错误:', error)
    return {
      success: false,
      error: error.message,
      openid: null,
      appid: null,
      unionid: null
    }
  }
}
