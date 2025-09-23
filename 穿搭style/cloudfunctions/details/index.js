
const cloud = require('wx-server-sdk')
cloud.init()
const db = cloud.database()
const MAX_LIMIT = 100

exports.main = async (event, context) => {
  // 获取用户openid
  const wxContext = cloud.getWXContext()
  const openid = wxContext.OPENID
  
  if (!openid) {
    return {
      success: false,
      error: '用户未登录',
      data: []
    }
  }
  
  try {
    // 先取出集合记录总数
    const countResult = await db.collection('clothes').where({
      _openid: openid,
      details: event.a,
      classify: event.b,
      isDeleted: false
    }).count()
    const total = countResult.total
    
    // 计算需分几次取
    const batchTimes = Math.ceil(total / 100)
    
    // 承载所有读操作的 promise 的数组
    const tasks = []
    for (let i = 0; i < batchTimes; i++) {
      const promise = db.collection('clothes').where({
        _openid: openid,
        details: event.a,
        classify: event.b,
        isDeleted: false
      }).skip(i * MAX_LIMIT).limit(MAX_LIMIT).get()
      tasks.push(promise)
    }
    
    // 等待所有
    const result = (await Promise.all(tasks)).reduce((acc, cur) => {
      return {
        data: acc.data.concat(cur.data),
        errMsg: acc.errMsg,
      }
    })
    
    return {
      success: true,
      data: result.data,
      total: total
    }
  } catch (error) {
    console.error('查询衣物详情失败:', error)
    return {
      success: false,
      error: error.message,
      data: []
    }
  }
}
    


