// pages/collection/collection.js

const app = getApp()
const AIRecognition = require('../../utils/aiRecognition.js')
Page({

  /**
   * 页面的初始数据
   */
  data: {
    // 下拉菜单
    show:false,
    testbtn1:false,
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
    casArray4: [{id:1,child:['牛仔外套', '棒球服', '开衫外套', '轻薄外套', '宽松外套', '小个子外套', '针织衫外套', '背心款外套', '风衣外套', '早春外套', '西服外套', '夏款外套']}],
    casArray6: [{ id: 2, child: ['碎花裙', 'A字裙', '吊带裙', '仙女裙', '淑女裙', '背带裙', '半身裙', '长裙', '名媛裙', '蛋糕裙', '沙滩裙', '雪纺裙'] }],
    casArray7: [{ id: 3, child: ['短裤', '运动裤', '喇叭裤', '西装裤', '背带裤', '正装裤', '雪纺裤', '阔腿裤', '工装裤', '开叉裤', '牛仔裤', '休闲裤'] }],
    casArray8: [{ id: 4, child: ['豆豆鞋', '高跟鞋', '凉鞋', '英伦鞋', '小白鞋', '单鞋', '踩底鞋', '拖鞋', '长靴', '尖头鞋', '运动鞋', '帆布鞋'] }],

    casArray5: [{id:1,child:['休闲鞋', '小白鞋', '运动鞋', '短裤', '运动裤', '牛仔裤', '西裤', '背带裤', '休闲裤', '小脚裤', '哈伦裤', '九分裤']}],
    casArray9: [{id:0,child:['T恤', '卫衣', '衬衫', '夹克', '牛仔外套', '西装', '运动服', '长袖', '风衣', '背心', '毛衣', '羽绒服']}],
    casIndex1: 0,
    casIndex2: 0,
    casIndex3: 0,
    casIndex4: 0,
    casIndex5: 0,
    casIndex6: 0,
    casIndex7: 0,
    casIndex8: 0,
    casIndex9: 0,
    details: '卫衣',
    style: '日系甜美',
    color: '红',
    stylingAdvice: '建议搭配基础款单品',
    url: '',
    name: '',
    inputValue: '',
    fileID: '',
    classify: '',
    filePath:'',
    cloudPath:'',
    
    // AI识别相关
    aiRecognition: new AIRecognition(),
    showAIRecognition: false,
    recognitionProgress: 0,
    aiResult: null,
    isAIRecognized: false
  },
  // 关闭标题弹窗
  close(){
    this.setData({
      show:false
    })
    this.addImage1()
  },
  onClose(){
    this.setData({
      show:false
    })
  },
  // 下拉菜单
  select_item: function (e) {
    switch (e.currentTarget.dataset.item) {
      case "1":
        this.setData({
          rent: "男装"
        })
        if (this.data.select_area) {
          this.setData({
            select_area: false,
          });
        }
        else {
          this.setData({
            select_area: true,
            select_rent: false
          });
        }
        break;
      case "2":
        this.setData({
          area:"女装"
        })
        if (this.data.select_rent) {
          this.setData({
            select_rent: false,
          });
        }
        else {
          this.setData({
            select_area: false,
            select_rent: true
          });
        }
        break;
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
  inputText:function(e) {
    this.setData({
      name: e.detail.value.replace(/\ +/g, "")//去掉空格
    })
    // console.log(this.data.name)
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
    // console.log(this.data.casIndex1)
    console.log(this.data.classify)
  },
  bindCasPickerChange2: function (e) {
    var a = e.detail.value
    this.setData({
      testbtn1:true,
      casIndex2: e.detail.value,
      style: this.data.casArray2[a]
    })
    // console.log(this.data.casIndex2)
    console.log(this.data.style)
  },
  bindCasPickerChange3: function (e) {
    var a = e.detail.value
    this.setData({
      casIndex3: e.detail.value,
      color: this.data.casArray3[a]
    })
    console.log(this.data.color)
    // console.log(this.data.color)
  },
  bindCasPickerChange4: function (e) {
    var a = e.detail.value
    this.setData({
      area: this.data.casArray4[0].child[a],
      casIndex4: e.detail.value,
      details: this.data.casArray4[0].child[a],
      classify: '女士外套',
      select_area: false,
    })
    console.log(this.data.classify)
    // console.log(this.data.color)
  },
  bindCasPickerChange5: function (e) {
    var a = e.detail.value
    this.setData({
      rent: this.data.casArray5[0].child[a],
      casIndex5: e.detail.value,
      details: this.data.casArray5[0].child[a],
      classify: '男士裤鞋',
      select_rent: false,
    })
    // console.log(this.data.casIndex1)
    console.log(this.data.classify)
  },
  bindCasPickerChange6: function (e) {
    var a = e.detail.value
    this.setData({
      area: this.data.casArray6[0].child[a],
      casIndex6: e.detail.value,
      details: this.data.casArray6[0].child[a],
      classify: '女士裙子',
      select_area: false,
    })
    console.log(this.data.details)
    // console.log(this.data.color)
  },
  bindCasPickerChange7: function (e) {
    var a = e.detail.value
    this.setData({
      area: this.data.casArray7[0].child[a],
      casIndex7: e.detail.value,
      details: this.data.casArray7[0].child[a],
      classify: '女士裤子',
      select_area: false,
    })
    // console.log(this.data.casIndex7)
    console.log(this.data.classify)
  },
  bindCasPickerChange8: function (e) {
    var a = e.detail.value
    this.setData({
      area: this.data.casArray8[0].child[a],
      casIndex8: e.detail.value,
      details: this.data.casArray8[0].child[a],
      classify: '女鞋',
      select_area: false,
    })
    console.log(this.data.classify)
    // console.log(this.data.color)
  },
  bindCasPickerChange9: function (e) {
    var a = e.detail.value
    this.setData({
      rent: this.data.casArray9[0].child[a],
      casIndex9: e.detail.value,
      details: this.data.casArray9[0].child[a],
      classify: '男衣',
      select_rent: false,
    })
    console.log(this.data.classify)
    // console.log(this.data.color)
  },
  addImage(){
    this.setData({
      show:true
    })
  },
  // 上传图片
  addImage1: function () {
    var that = this;
    var name = that.data.name
    if (!name) {
      wx.showToast({
        title: '你忘记给图片起个名字啦',
        icon: 'none',
        duration: 1000
      })
    }
    else {
      // 选择图片
      wx.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: function (res) {
          const filePath = res.tempFilePaths[0]
          that.setData({
            filePath: filePath
          })
          
          // 开始AI识别
          that.startAIRecognition(filePath)
        },
        fail: e => {
          console.error(e)
          wx.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      })
    }
  },

  /**
   * 开始AI识别
   */
  startAIRecognition: function(imagePath) {
    const that = this;
    
    this.setData({ 
      showAIRecognition: true,
      recognitionProgress: 0,
      isAIRecognized: false
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
    
    // 调用AI识别服务
    that.data.aiRecognition.recognizeClothing(imagePath).then(result => {
      console.log('AI识别结果:', result);
      
      // 先完成进度条到100%
      that.setData({ recognitionProgress: 100 });
      
      // 延迟一点时间让用户看到100%完成
      setTimeout(() => {
        that.setData({
          aiResult: result,
          isAIRecognized: true,
          showAIRecognition: false
        });
        
        // 根据AI识别结果自动填充表单
        that.autoFillForm(result);
        
        // 上传图片到云存储
        that.uploadImageToCloud(imagePath, result);
      }, 300);
      
    }).catch(error => {
      console.error('AI识别失败:', error);
      
      // 先完成进度条到100%
      that.setData({ recognitionProgress: 100 });
      
      // 延迟一点时间让用户看到100%完成，然后隐藏
      setTimeout(() => {
        that.setData({
          showAIRecognition: false,
          isAIRecognized: false
        });
        
        wx.showToast({
          title: 'AI识别失败，请手动分类',
        icon: 'none',
        duration: 2000
      });
      
      // 即使AI识别失败，也继续上传图片
      that.uploadImageToCloud(imagePath, null);
    });
  },

  /**
   * 根据AI识别结果自动填充表单
   */
  autoFillForm: function(aiResult) {
    const that = this;
    
    // 根据分类设置对应的选择器索引
    let casIndex1 = 0, casIndex2 = 0, casIndex3 = 0;
    
    // 设置分类
    if (aiResult.categoryId === 1) { // 上衣
      casIndex1 = this.getCasIndex1(aiResult.itemName);
      that.setData({
        classify: '女士上衣',
        details: aiResult.itemName,
        area: aiResult.itemName,
        casIndex1: casIndex1
      });
    } else if (aiResult.categoryId === 2) { // 外套
      casIndex4 = this.getCasIndex4(aiResult.itemName);
      that.setData({
        classify: '女士外套',
        details: aiResult.itemName,
        area: aiResult.itemName,
        casIndex4: casIndex4
      });
    } else if (aiResult.categoryId === 3) { // 裙装
      casIndex6 = this.getCasIndex6(aiResult.itemName);
      that.setData({
        classify: '女士裙子',
        details: aiResult.itemName,
        area: aiResult.itemName,
        casIndex6: casIndex6
      });
    } else if (aiResult.categoryId === 4) { // 裤装
      casIndex7 = this.getCasIndex7(aiResult.itemName);
      that.setData({
        classify: '女士裤子',
        details: aiResult.itemName,
        area: aiResult.itemName,
        casIndex7: casIndex7
      });
    } else if (aiResult.categoryId === 5) { // 鞋子
      casIndex8 = this.getCasIndex8(aiResult.itemName);
      that.setData({
        classify: '女鞋',
        details: aiResult.itemName,
        area: aiResult.itemName,
        casIndex8: casIndex8
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
    
    const cloudPath = that.data.name + filePath.match(/\.[^.]+?$/)[0]
    console.log(cloudPath);
    
    wx.cloud.uploadFile({
      cloudPath,
      filePath,
      success: res => {
        console.log('[上传文件] 成功：', res)
        const imageUrl = 'https://7765-we-63574e-1258830969.tcb.qcloud.la/' + cloudPath;
        
        that.setData({
          cloudPath: cloudPath,
          url: imageUrl
        })
        
        // 如果有AI识别结果，自动保存到数据库
        if (aiResult) {
          that.saveToDatabase(imageUrl, aiResult);
        } else {
          wx.showToast({
            icon: 'none',
            title: '图片上传成功',
          })
        }
      },
      fail: e => {
        console.error('[上传文件] 失败：', e)
        wx.showToast({
          icon: 'none',
          title: '上传失败',
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
    
    // 根据AI识别结果确定分类ID
    let categoryId = 1; // 默认分类
    if (aiResult.categoryId) {
      categoryId = aiResult.categoryId;
    }
    
    const db = wx.cloud.database();
    db.collection("clothes").add({
      data: {
        name: aiResult.name || that.data.name,
        classify: aiResult.category || that.data.classify,
        details: aiResult.details || that.data.details,
        style: aiResult.style || that.data.style,
        color: aiResult.color || that.data.color,
        stylingAdvice: aiResult.stylingAdvice || that.data.stylingAdvice,
        url: imageUrl,
        imagefrom: 'up',
        categoryId: categoryId,
        confidence: aiResult.confidence || 0,
        aiGenerated: aiResult.aiGenerated || false,
        addTime: new Date().toISOString().split('T')[0]
      },
      success: function(res) {
        console.log('保存到数据库成功:', res);
        
        wx.showToast({
          title: 'AI识别完成，添加成功！',
          icon: 'success',
          duration: 2000
        });
        
        // 通知class页面更新数据
        that.notifyClassPageUpdate(res._id, categoryId, aiResult);
        
        // 延迟返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      },
      fail: function(error) {
        console.error('保存到数据库失败:', error);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none',
          duration: 2000
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
    const classPage = pages.find(page => page.route === 'pages/class/class');
    
    if (classPage) {
      // 创建新物品对象
      const newItem = {
        _id: itemId,
        name: aiResult.name || this.data.name,
        classify: aiResult.category || this.data.classify,
        details: aiResult.details || this.data.details,
        style: aiResult.style || this.data.style,
        color: aiResult.color || this.data.color,
        stylingAdvice: aiResult.stylingAdvice || this.data.stylingAdvice,
        url: this.data.url,
        imagefrom: 'up',
        categoryId: categoryId,
        confidence: aiResult.confidence || 0,
        aiGenerated: aiResult.aiGenerated || false,
        addTime: new Date().toISOString().split('T')[0]
      };
      
      // 更新class页面的数据
      const allItems = [...classPage.data.allItems, newItem];
      classPage.setData({ allItems });
      classPage.updateCategoryCounts();
      
      // 切换到新添加物品的分类
      const category = classPage.data.categories.find(cat => cat.id === categoryId);
      if (category) {
        const currentItems = allItems.filter(item => item.categoryId === categoryId);
        classPage.setData({
          currentCategoryId: categoryId,
          currentCategoryName: category.name,
          currentItemCount: currentItems.length,
          currentItems: currentItems
        });
      }
    }
  },

  // 辅助方法：根据物品名称获取对应的选择器索引
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
onLoad:function() {
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

},
  ok: function () {
    this.setData({
      showModal: false
    })
    const db = wx.cloud.database()
    db.collection('popuser').add({
      data: {
        pop:1
      }
      
    })
  }
})