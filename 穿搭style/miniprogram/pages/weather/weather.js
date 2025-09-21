
Page({
  data:{
    shopList: [
      {
        id: 1,
        name: '时尚女装店',
        image: 'https://gitee.com/huanchi/wear_fashionstyle/raw/master/image/wear.png',
        description: '精选时尚女装，品质保证',
        taobaoUrl: 'https://shop123456.taobao.com',
        category: '女装',
        rating: 4.8,
        sales: 1200
      },
      {
        id: 2,
        name: '潮流男装店',
        image: 'https://gitee.com/huanchi/wear_fashionstyle/raw/master/image/wear.png',
        description: '潮流男装，个性搭配',
        taobaoUrl: 'https://shop789012.taobao.com',
        category: '男装',
        rating: 4.6,
        sales: 800
      },
      {
        id: 3,
        name: '配饰精品店',
        image: 'https://gitee.com/huanchi/wear_fashionstyle/raw/master/image/wear.png',
        description: '精美配饰，提升气质',
        taobaoUrl: 'https://shop345678.taobao.com',
        category: '配饰',
        rating: 4.9,
        sales: 1500
      },
      {
        id: 4,
        name: '运动休闲店',
        image: 'https://gitee.com/huanchi/wear_fashionstyle/raw/master/image/wear.png',
        description: '运动休闲，舒适时尚',
        taobaoUrl: 'https://shop901234.taobao.com',
        category: '运动',
        rating: 4.7,
        sales: 900
      },
      {
        id: 5,
        name: '鞋履专营店',
        image: 'https://gitee.com/huanchi/wear_fashionstyle/raw/master/image/wear.png',
        description: '时尚鞋履，舒适体验',
        taobaoUrl: 'https://shop567890.taobao.com',
        category: '鞋履',
        rating: 4.5,
        sales: 1100
      },
      {
        id: 6,
        name: '包包配饰店',
        image: 'https://gitee.com/huanchi/wear_fashionstyle/raw/master/image/wear.png',
        description: '精美包包，时尚百搭',
        taobaoUrl: 'https://shop234567.taobao.com',
        category: '包包',
        rating: 4.8,
        sales: 1300
      }
    ],
    categories: ['全部', '女装', '男装', '配饰', '运动', '鞋履', '包包'],
    selectedCategory: '全部'
  },

  // 跳转到淘宝店铺
  goToTaobao: function(e) {
    const taobaoUrl = e.currentTarget.dataset.url;
    wx.showModal({
      title: '跳转提示',
      content: '即将跳转到淘宝店铺，是否继续？',
      success: function(res) {
        if (res.confirm) {
          // 复制链接到剪贴板
          wx.setClipboardData({
            data: taobaoUrl,
            success: function() {
              wx.showToast({
                title: '链接已复制，请打开淘宝APP',
                icon: 'success',
                duration: 2000
              });
            }
          });
        }
      }
    });
  },

  // 筛选分类
  filterCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      selectedCategory: category
    });
  },

  // 获取筛选后的商品列表
  getFilteredShops: function() {
    const { shopList, selectedCategory } = this.data;
    if (selectedCategory === '全部') {
      return shopList;
    }
    return shopList.filter(shop => shop.category === selectedCategory);
  },

  onShow: function () {
    // 页面显示时的逻辑
    console.log('小铺页面显示');
  }
})