// pages/collection/collection.js

const app = getApp()
const AIRecognition = require('../../utils/aiRecognition.js')

Page({
  /**
   * 页面的初始数据
   */
  data: {
    // 下拉菜单
    show: false,
    testbtn1: false,
    testbtn2: false,
    testbtn3: false,
    testbtn4: false,
    showModal: false,
    area_list: [
      { key: 1, value: "女士上衣" },
      { key: 2, value: "女士外套" },
      { key: 3, value: "女裙" },
      { key: 4, value: "女裤" },
      { key: 5, value: "女鞋" },
    ],
    rent_list: [
      { key: 1, value: "男衣" },
      { key: 2, value: "男裤或男鞋" }
    ],
    area: '女装',
    rent: '男装',
    select_area: false,
    select_rent: false,
    // 下拉菜单结束
    imagefilepath: '', //字符数组很好的定义解决了preview的问题
    imageList: [],
    // allList:app.allImageList,
    bigImg: '',

    casArray2: ['日系甜美', '淑女优雅', '文艺复古', '恋爱气息', '职场穿搭', '国民风尚', '个性潮流', '运动休闲', '绅士熟男', '简约时尚'],
    casArray3: ['红', '橙', '黄', '绿', '蓝', '黑', '白', '紫'],
    casArray1: [
      {
        id: 0,
        child: ['卫衣', 'T恤', '雪纺', '西装', '衬衫', '一字肩', '针织衫', '背心', '棒球服', '小个子上衣', '羽绒服', '毛衣']
      }
    ],
    casArray4: [{ id: 1, child: ['牛仔外套', '棒球服', '开衫外套', '轻薄外套', '宽松外套', '小个子外套', '针织衫外套', '背心款外套', '风衣外套', '早春外套', '西服外套', '夏款外套'] }],
    casArray6: [{ id: 2, child: ['碎花裙', 'A字裙', '吊带裙', '仙女裙', '淑女裙', '背带裙', '半身裙', '长裙', '名媛裙', '蛋糕裙', '沙滩裙', '雪纺裙'] }],
    casArray7: [{ id: 3, child: ['短裤', '运动裤', '喇叭裤', '西装裤', '背带裤', '正装裤', '雪纺裤', '阔腿裤', '工装裤', '开叉裤', '牛仔裤', '休闲裤'] }],
    casArray8: [{ id: 4, child: ['豆豆鞋', '高跟鞋', '凉鞋', '英伦鞋', '小白鞋', '单鞋', '踩底鞋', '拖鞋', '长靴', '尖头鞋', '运动鞋', '帆布鞋'] }],

    casIndex1: 0,
    casIndex2: 0,
    casIndex3: 0,
    casIndex4: 0,
    casIndex6: 0,
    casIndex7: 0,
    casIndex8: 0,

    name: '',
    classify: '',
    details: '',
    style: '',
    color: '',
    url: '',
    cloudPath: '',
    stylingAdvice: '',

    // AI识别相关
    isRecognizing: false,
    aiRecognition: null,
    aiResult: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function() {
    var that = this
    var pop
    var length
    const db = wx.cloud.database()
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log(res.result.openid)
        db.collection('popuser').where({
          _openid: res.result.openid
        }).get({
          success(res) {
            console.log(res)
            if (res.data.length == 0) {
              that.setData({
                showModal: true
              })
              console.log(that.data.showModal)
            }
          }
        })
      }
    })

    // 初始化AI识别服务
    const aiService = new AIRecognition();
    this.setData({
      aiRecognition: aiService
    });
  },

  /**
   * 选择图片
   */
  chooseImage: function() {
    const that = this;
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.setData({
          imagefilepath: tempFilePath,
          imageList: [tempFilePath]
        });
        
        // 开始AI识别
        that.startAIRecognition(tempFilePath);
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
      isRecognizing: true,
      aiResult: null,
      recognitionProgress: 0,
      recognitionMessage: '正在初始化...'
    });

    // 调用AI识别服务
    if (!that.data.aiRecognition) {
      console.error('AI识别服务未初始化');
      wx.showToast({
        title: 'AI识别服务未初始化',
        icon: 'none'
      });
      return;
    }

    // 进度回调函数
    const onProgress = (progressData) => {
      that.setData({
        recognitionProgress: Math.floor(progressData.progress), // 确保进度值取整
        recognitionMessage: progressData.message
      });
    };

    that.data.aiRecognition.recognizeClothing(imagePath, {}, onProgress)
      .then(result => {
        console.log('AI识别结果:', result);
        
        that.setData({
          aiResult: result,
          isRecognizing: false,
          recognitionProgress: 100,
          recognitionMessage: '识别完成'
        });
        
        // 自动填充表单 - 使用result.data
        that.autoFillForm(result.data);
        
        // 上传图片到云存储 - 使用result.data
        that.uploadImageToCloud(imagePath, result.data);
        
      })
      .catch(error => {
        console.error('AI识别失败:', error);
        
        that.setData({
          isRecognizing: false,
          recognitionProgress: 0,
          recognitionMessage: '识别失败'
        });
        
        wx.showToast({
          title: 'AI识别失败，请手动填写',
          icon: 'none',
          duration: 2000
        });
      });
  },

  /**
   * 根据AI识别结果自动填充表单
   */
  autoFillForm: function(aiResult) {
    const that = this;
    
    console.log('开始自动填充表单，AI结果:', aiResult);
    
    // 根据分类设置对应的选择器索引
    let casIndex1 = 0, casIndex2 = 0, casIndex3 = 0, casIndex4 = 0, casIndex6 = 0, casIndex7 = 0, casIndex8 = 0;
    
    // 设置分类 - 修复字段映射：优先使用 category，其次 categoryId
    const categoryId = aiResult.category || aiResult.categoryId || 1;
    const itemName = aiResult.name || aiResult.itemName || '未知';
    
    console.log('分类ID:', categoryId, '物品名称:', itemName);
    
    if (categoryId === 1) { // 上衣
      casIndex1 = this.getCasIndex1(itemName);
      that.setData({
        classify: '女士上衣',
        details: itemName,
        area: itemName,
        casIndex1: casIndex1,
        name: itemName  // 设置名称
      });
    } else if (categoryId === 2) { // 外套
      casIndex4 = this.getCasIndex4(itemName);
      that.setData({
        classify: '女士外套',
        details: itemName,
        area: itemName,
        casIndex4: casIndex4,
        name: itemName  // 设置名称
      });
    } else if (categoryId === 3) { // 裙装
      casIndex6 = this.getCasIndex6(itemName);
      that.setData({
        classify: '女士裙子',
        details: itemName,
        area: itemName,
        casIndex6: casIndex6,
        name: itemName  // 设置名称
      });
    } else if (categoryId === 4) { // 裤装
      casIndex7 = this.getCasIndex7(itemName);
      that.setData({
        classify: '女士裤子',
        details: itemName,
        area: itemName,
        casIndex7: casIndex7,
        name: itemName  // 设置名称
      });
    } else if (categoryId === 5) { // 鞋子
      casIndex8 = this.getCasIndex8(itemName);
      that.setData({
        classify: '女鞋',
        details: itemName,
        area: itemName,
        casIndex8: casIndex8,
        name: itemName  // 设置名称
      });
    }
    
    // 设置风格
    casIndex2 = this.getCasIndex2(aiResult.style);
    that.setData({
      style: aiResult.style,
      casIndex2: casIndex2
    });
    
    // 设置颜色
    casIndex3 = this.getCasIndex3(aiResult.color);
    that.setData({
      color: aiResult.color,
      casIndex3: casIndex3
    });
    
    // 设置搭配建议
    that.setData({
      stylingAdvice: aiResult.stylingAdvice || '建议搭配基础款单品'
    });
    
    console.log('表单填充完成');
    
    wx.showToast({
      title: 'AI已自动识别并分类',
      icon: 'success',
      duration: 2000
    });
  },

  /**
   * 上传图片到云存储
   */
  uploadImageToCloud: function(filePath, aiResult = null) {
    const that = this;
    
    wx.showLoading({
      title: '上传中',
    })
    
    // 生成唯一的云存储路径
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const fileExt = filePath.match(/\.[^.]+?$/)[0];
    const cloudPath = `ai_recognition/${timestamp}_${randomStr}${fileExt}`;
    
    console.log('准备上传到云存储，路径:', cloudPath);
    console.log('本地文件路径:', filePath);
    
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        console.log('[上传文件] 成功：', res);
        console.log('云存储fileID:', res.fileID);
        
        // 使用返回的fileID作为图片URL
        const imageUrl = res.fileID;
        
        that.setData({
          cloudPath: cloudPath,
          url: imageUrl
        });
        
        console.log('图片上传成功，URL:', imageUrl);
        
        // 如果有AI识别结果，自动保存到数据库
        if (aiResult) {
          console.log('开始保存AI识别结果到数据库...');
          that.saveToDatabase(imageUrl, aiResult);
        } else {
          wx.showToast({
            icon: 'none',
            title: '图片上传成功',
          })
        }
      },
      fail: e => {
        console.error('[上传文件] 失败：', e);
        console.error('错误详情:', {
          errCode: e.errCode,
          errMsg: e.errMsg
        });
        
        wx.showToast({
          icon: 'none',
          title: '上传失败: ' + (e.errMsg || '未知错误'),
          duration: 3000
        })
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },

  /**
   * 保存到数据库
   */
  saveToDatabase: function(imageUrl, aiResult) {
    const that = this;
    
    console.log('=== 开始保存到数据库 ===');
    console.log('图片URL:', imageUrl);
    console.log('AI识别结果:', aiResult);
    
    // 根据AI识别结果确定分类ID - 修复字段映射：category 或 categoryId
    let categoryId = 1; // 默认分类
    if (aiResult.category) {
      categoryId = aiResult.category;
    } else if (aiResult.categoryId) {
      categoryId = aiResult.categoryId;
    }
    
    console.log('识别的分类ID:', categoryId);
    
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
    
    // 生成物品名称（如果AI识别结果中没有name）
    const itemName = aiResult.name || that.data.name || `${categoryNames[categoryId] || '衣物'}_${Date.now()}`;
    
    // 准备要保存的数据
    const dataToSave = {
      // 基本信息
      name: itemName,
      classify: categoryNames[categoryId] || '未分类',
      details: aiResult.name || aiResult.details || that.data.details || 'AI识别',
      style: aiResult.style || that.data.style || '未知',
      color: aiResult.color || that.data.color || '未知',
      stylingAdvice: aiResult.stylingAdvice || that.data.stylingAdvice || '建议搭配基础款单品',
      
      // 图片信息
      url: imageUrl,
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
      tags: Array.isArray(aiResult.tags) ? aiResult.tags.join(' ') : (aiResult.tags || `${aiResult.style || '未知'} ${aiResult.color || '未知'}`),
      
      // 其他信息
      status: 'active',
      isDeleted: false
    };
    
    console.log('准备保存的数据:', dataToSave);
    console.log('注意：_openid字段将由系统自动添加');
    
    db.collection("clothes").add({
      data: dataToSave,
      success: function(res) {
        console.log('✅ 保存到数据库成功!');
        console.log('新增记录ID:', res._id);
        console.log('完整响应:', res);
        
        wx.showToast({
          title: 'AI识别完成，已添加到橱窗！',
          icon: 'success',
          duration: 2000
        });
        
        // 通知class页面更新数据
        that.notifyClassPageUpdate(res._id, categoryId, aiResult);
        
        // 延迟返回上一页，让用户看到成功提示
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      },
      fail: function(error) {
        console.error('❌ 保存到数据库失败!');
        console.error('错误对象:', error);
        console.error('错误详情:', {
          errCode: error.errCode,
          errMsg: error.errMsg,
          stack: error.stack
        });
        
        // 提供更详细的错误信息
        let errorMsg = '保存失败';
        if (error.errMsg) {
          if (error.errMsg.includes('permission')) {
            errorMsg = '没有权限，请检查数据库权限设置';
          } else if (error.errMsg.includes('timeout')) {
            errorMsg = '保存超时，请检查网络';
          } else {
            errorMsg = error.errMsg;
          }
        }
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 3000
        });
      }
    });
  },

  /**
   * 通知class页面更新数据
   */
  notifyClassPageUpdate: function(itemId, categoryId, aiResult) {
    // 获取页面栈
    const pages = getCurrentPages();
    const prevPage = pages[pages.length - 2];
    
    if (prevPage && prevPage.route === 'pages/class/class') {
      // 通知class页面刷新数据
      if (typeof prevPage.loadUserClothes === 'function') {
        prevPage.loadUserClothes();
      }
    }
  },

  // 下拉菜单
  formSubmit: function (e) {
    var that = this
    var name = that.data.name
    var cloudPath = that.data.cloudPath
    var style = that.data.style
    var color = that.data.color
    if(!name) {
      wx.showToast({
        title: '你忘记给图片起个名字啦',
        icon: 'none',
        duration: 1000
      })
    }
   else if(!cloudPath) {
      wx.showToast({
        title: '请上传图片哦',
        icon: 'none',
        duration: 1000
      })
   }
else {
    const db = wx.cloud.database();
    db.collection("clothes").add({
      data: {
        name: that.data.name,
        classify: that.data.classify,
        details: that.data.details,
        style: that.data.style,
        color: that.data.color,
        url: that.data.url,
        imagefrom:'up'
      },
      success: function () {
        wx.showToast({
          title: '提交成功',
          'icon': 'none',
          duration: 3000,
        })
        console.log(that.data.details)
      },
      fail: function () {
        wx.showToast({
          title: '提交失败',
          'icon': 'none',
          duration: 3000
        })
      }
    })
}
  },

  // 获取输入框的值
  inputText: function(e) {
    this.setData({
      name: e.detail.value.replace(/\ +/g, "")//去掉空格
    })
  },

  // 三个picker_view
  bindCasPickerChange1: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex1: e.detail.value,
      details: this.data.casArray1[0].child[a],
      area: this.data.casArray1[0].child[a],
      classify: '女士上衣',
      select_area: false
    })
  },

  bindCasPickerChange2: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex2: e.detail.value,
      style: this.data.casArray2[a],
      testbtn2: false
    })
  },

  bindCasPickerChange3: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex3: e.detail.value,
      color: this.data.casArray3[a],
      testbtn3: false
    })
  },

  bindCasPickerChange4: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex4: e.detail.value,
      details: this.data.casArray4[0].child[a],
      area: this.data.casArray4[0].child[a],
      classify: '女士外套',
      select_area: false
    })
  },

  bindCasPickerChange6: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex6: e.detail.value,
      details: this.data.casArray6[0].child[a],
      area: this.data.casArray6[0].child[a],
      classify: '女士裙子',
      select_area: false
    })
  },

  bindCasPickerChange7: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex7: e.detail.value,
      details: this.data.casArray7[0].child[a],
      area: this.data.casArray7[0].child[a],
      classify: '女士裤子',
      select_area: false
    })
  },

  bindCasPickerChange8: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex8: e.detail.value,
      details: this.data.casArray8[0].child[a],
      area: this.data.casArray8[0].child[a],
      classify: '女鞋',
      select_area: false
    })
  },

  // 下拉菜单
  show: function () {
    this.setData({
      show: !this.data.show
    })
  },

  testbtn1: function () {
    this.setData({
      testbtn1: !this.data.testbtn1,
      select_area: true
    })
  },

  testbtn2: function () {
    this.setData({
      testbtn2: !this.data.testbtn2
    })
  },

  testbtn3: function () {
    this.setData({
      testbtn3: !this.data.testbtn3
    })
  },

  testbtn4: function () {
    this.setData({
      testbtn4: !this.data.testbtn4
    })
  },

  // 预览图片
  previewImage: function(e) {
    const current = e.target.dataset.src;
    wx.previewImage({
      current: current,
      urls: this.data.imageList
    });
  },

  // 删除图片
  deleteImage: function(e) {
    const index = e.target.dataset.index;
    const imageList = this.data.imageList;
    imageList.splice(index, 1);
    this.setData({
      imageList: imageList,
      imagefilepath: imageList.length > 0 ? imageList[0] : ''
    });
  },

  getCasIndex1: function(itemName) {
    const items = this.data.casArray1[0].child;
    return items.findIndex(item => item.includes(itemName) || itemName.includes(item)) || 0;
  },

  getCasIndex2: function(style) {
    return this.data.casArray2.findIndex(item => item.includes(style) || style.includes(item)) || 0;
  },

  getCasIndex3: function(color) {
    return this.data.casArray3.findIndex(item => item.includes(color) || color.includes(item)) || 0;
  },

  getCasIndex4: function(itemName) {
    const items = this.data.casArray4[0].child;
    return items.findIndex(item => item.includes(itemName) || itemName.includes(item)) || 0;
  },

  getCasIndex6: function(itemName) {
    const items = this.data.casArray6[0].child;
    return items.findIndex(item => item.includes(itemName) || itemName.includes(item)) || 0;
  },

  getCasIndex7: function(itemName) {
    const items = this.data.casArray7[0].child;
    return items.findIndex(item => item.includes(itemName) || itemName.includes(item)) || 0;
  },

  getCasIndex8: function(itemName) {
    const items = this.data.casArray8[0].child;
    return items.findIndex(item => item.includes(itemName) || itemName.includes(item)) || 0;
  },

  ok: function () {
    this.setData({
      showModal: false
    })
    const db = wx.cloud.database()
    db.collection('popuser').add({
      data: {
        pop: 1
      }
    })
  }
})
