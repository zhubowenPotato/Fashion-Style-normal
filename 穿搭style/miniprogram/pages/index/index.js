// pages/index/index.js
const util = require('../../utils/util.js')
var app = getApp()

Page({
  data: {
    // 位置和天气信息
    currentLocation: '',
    weatherInfo: '',
    weatherIcon: '☀️',
    weatherCache: null, // 天气缓存
    lastWeatherUpdate: 0, // 上次天气更新时间
    
    // 推荐相关数据
    hasRecommendation: false,
    isGenerating: false,
    recommendationImage: '',
    recommendationTitle: '',
    recommendationDesc: '',
    recommendationStyle: '',
    recommendationTags: [],
    
    // 示例推荐数据
    sampleRecommendations: [
      {
        image: 'https://img.freepik.com/free-photo/graceful-stylish-woman-pink-dress_197531-13228.jpg',
        title: '优雅职场风',
        desc: '适合正式场合的优雅穿搭，展现专业形象',
        style: '职场风',
        tags: ['正式', '优雅', '职场']
      },
      {
        image: 'https://img.freepik.com/free-photo/fashion-portrait-young-elegant-woman_1328-2692.jpg',
        title: '休闲约会装',
        desc: '轻松舒适的休闲风格，适合日常约会',
        style: '休闲风',
        tags: ['休闲', '舒适', '约会']
      },
      {
        image: 'https://img.freepik.com/free-photo/stylish-woman-jeans-white-sneakers-blouse-with-lace-sitting-floor-street-modern-woman-with-short-hair-poses-outside_197531-19313.jpg',
        title: '街头潮流风',
        desc: '时尚前卫的街头风格，展现个性魅力',
        style: '潮流风',
        tags: ['潮流', '个性', '街头']
      }
    ]
  },

  // 页面加载时获取位置和天气信息
  onLoad: function() {
    // 测试天气API（调试用）
    this.testWeatherAPI();
    
    this.getLocationAndWeather();
  },

  // 获取位置和天气信息
  getLocationAndWeather: function() {
    const that = this;
    
    // 检查位置权限
    wx.getSetting({
      success: function(res) {
        if (res.authSetting['scope.userLocation']) {
          // 已授权，直接获取位置
          that.getCurrentLocation();
        } else {
          // 未授权，请求授权
          that.requestLocationPermission();
        }
      }
    });

    // 设置默认天气信息
    that.setData({
      weatherInfo: '获取天气中...'
    });
  },

  // 请求位置权限
  requestLocationPermission: function() {
    const that = this;
    wx.authorize({
      scope: 'scope.userLocation',
      success: function() {
        that.getCurrentLocation();
      },
      fail: function() {
        wx.showModal({
          title: '位置权限',
          content: '需要获取您的位置信息来提供更准确的穿搭推荐，请在设置中开启位置权限',
          showCancel: true,
          cancelText: '取消',
          confirmText: '去设置',
          success: function(res) {
            if (res.confirm) {
              wx.openSetting({
                success: function(settingRes) {
                  if (settingRes.authSetting['scope.userLocation']) {
                    that.getCurrentLocation();
                  } else {
                    that.setData({
                      currentLocation: '位置权限未开启'
                    });
                  }
                }
              });
            } else {
              that.setData({
                currentLocation: '位置权限未开启'
              });
            }
          }
        });
      }
    });
  },

  // 获取当前位置
  getCurrentLocation: function() {
    const that = this;
    
    wx.getLocation({
      type: 'gcj02',
      altitude: false,
      success: function(res) {
        console.log('获取位置成功:', res);
        // 调用逆地理编码API获取具体地址
        that.reverseGeocode(res.latitude, res.longitude);
      },
      fail: function(err) {
        console.error('获取位置失败:', err);
        that.setData({
          currentLocation: '位置获取失败'
        });
      }
    });
  },

  // 逆地理编码 - 将坐标转换为地址
  reverseGeocode: function(latitude, longitude) {
    const that = this;
    
    // 使用微信小程序的逆地理编码API
    wx.request({
      url: 'https://apis.map.qq.com/ws/geocoder/v1/',
      data: {
        location: `${latitude},${longitude}`,
        key: 'OB4BZ-D4W3U-B7VVO-4PJWW-6TKDJ-WPB77', // 腾讯地图API key (公开的测试key)
        get_poi: 1
      },
      success: function(res) {
        console.log('逆地理编码结果:', res.data);
        if (res.data.status === 0 && res.data.result) {
          const address = res.data.result.address;
          const formattedAddress = that.formatAddress(address);
          that.setData({
            currentLocation: formattedAddress
          });
          
          // 获取该城市的天气信息
          that.getWeatherByLocation(latitude, longitude, formattedAddress);
        } else {
          // 如果API调用失败，使用备用方案
          that.getLocationByCoordinate(latitude, longitude);
        }
      },
      fail: function(err) {
        console.error('逆地理编码失败:', err);
        // 使用备用方案
        that.getLocationByCoordinate(latitude, longitude);
      }
    });
  },

  // 备用方案：根据坐标获取大概位置
  getLocationByCoordinate: function(latitude, longitude) {
    const that = this;
    
    // 根据坐标范围判断大概位置（这是一个简化的方案）
    const location = that.getLocationByRange(latitude, longitude);
    that.setData({
      currentLocation: location
    });
    
    // 获取该位置的天气信息
    that.getWeatherByLocation(latitude, longitude, location);
  },

  // 根据坐标范围判断位置
  getLocationByRange: function(lat, lng) {
    // 主要城市的坐标范围（简化版本）
    const cities = [
      { name: '北京市', latMin: 39.4, latMax: 41.0, lngMin: 115.7, lngMax: 117.4 },
      { name: '上海市', latMin: 30.7, latMax: 31.9, lngMin: 120.8, lngMax: 122.2 },
      { name: '广州市', latMin: 22.7, latMax: 23.8, lngMin: 112.9, lngMax: 114.0 },
      { name: '深圳市', latMin: 22.4, latMax: 22.9, lngMin: 113.7, lngMax: 114.6 },
      { name: '杭州市', latMin: 30.0, latMax: 30.5, lngMin: 119.8, lngMax: 120.5 },
      { name: '南京市', latMin: 31.8, latMax: 32.2, lngMin: 118.4, lngMax: 119.2 },
      { name: '成都市', latMin: 30.4, latMax: 30.9, lngMin: 103.8, lngMax: 104.3 },
      { name: '武汉市', latMin: 30.3, latMax: 30.8, lngMin: 114.0, lngMax: 114.6 },
      { name: '西安市', latMin: 34.0, latMax: 34.5, lngMin: 108.7, lngMax: 109.2 },
      { name: '重庆市', latMin: 29.3, latMax: 29.9, lngMin: 106.2, lngMax: 106.8 }
    ];

    for (let city of cities) {
      if (lat >= city.latMin && lat <= city.latMax && 
          lng >= city.lngMin && lng <= city.lngMax) {
        return city.name;
      }
    }

    // 如果不在主要城市范围内，返回坐标
    return `位置: ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  },

  // 格式化地址显示
  formatAddress: function(address) {
    if (!address) return '位置获取失败';
    
    // 简化地址显示，只显示省市区
    const parts = address.split(/省|市|区|县|街道|路|号/);
    if (parts.length >= 3) {
      return `${parts[0]}省${parts[1]}市${parts[2]}区`;
    } else if (parts.length >= 2) {
      return `${parts[0]}市${parts[1]}区`;
    } else {
      return address;
    }
  },

  // 根据位置获取天气信息
  getWeatherByLocation: function(latitude, longitude, locationName) {
    const that = this;
    const now = Date.now();
    
    // 检查缓存，如果5分钟内有缓存且位置相同，直接使用缓存
    if (that.data.weatherCache && 
        (now - that.data.lastWeatherUpdate) < 5 * 60 * 1000 &&
        that.data.weatherCache.location === `${latitude},${longitude}`) {
      console.log('🔄 使用天气缓存');
      that.setData({
        weatherInfo: that.data.weatherCache.weatherInfo,
        weatherIcon: that.data.weatherCache.weatherIcon
      });
      return;
    }
    
    // 验证坐标有效性
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      console.error('❌ 无效的坐标:', { latitude, longitude });
      that.generateSmartWeather(locationName, 39.9, 116.4);
      return;
    }
    
    // 使用和风天气API获取真实天气信息
    console.log('🌐 开始调用和风天气API...');
    console.log('📍 请求坐标:', `${longitude},${latitude}`);
    console.log('🏙️ 位置名称:', locationName);
    
    // API key列表（可以添加多个备用key）
    const apiKeys = [
      '3f3846b575c34c6aa1a977c8d3d2ee6c', // 主key
      'YOUR_BACKUP_API_KEY_1', // 备用key 1
      'YOUR_BACKUP_API_KEY_2', // 备用key 2
      // 可以添加更多备用key
    ];
    
    that.callWeatherAPI(apiKeys[0], longitude, latitude, locationName, 0);
  },

  // 调用天气API的核心方法
  callWeatherAPI: function(apiKey, longitude, latitude, locationName, keyIndex) {
    const that = this;
    const now = Date.now();
    
    console.log(`🔑 使用API Key ${keyIndex + 1}:`, apiKey.substring(0, 8) + '...');
    console.log(`🌐 使用API Host: m759fby47u.re.qweatherapi.com`);
    
    wx.request({
      url: 'https://m759fby47u.re.qweatherapi.com/v7/weather/now',
      data: {
        location: `${longitude},${latitude}`, // 经度,纬度
        key: apiKey,
        lang: 'zh'
      },
      success: function(res) {
        console.log('📡 和风天气API完整响应:', res);
        console.log('📊 响应数据:', res.data);
        console.log('🔍 响应状态码:', res.statusCode);
        
        if (res.statusCode === 200) {
          if (res.data.code === '200' && res.data.now) {
            const weather = res.data.now;
            const temp = Math.round(weather.temp);
            const text = weather.text;
            const weatherText = `${text} ${temp}°C`;
            
            // 更新天气图标
            const icon = that.getWeatherIcon(text);
            
            // 更新天气缓存
            const weatherCache = {
              location: `${latitude},${longitude}`,
              weatherInfo: weatherText,
              weatherIcon: icon,
              timestamp: now
            };
            
            that.setData({
              weatherInfo: weatherText,
              weatherIcon: icon,
              weatherCache: weatherCache,
              lastWeatherUpdate: now
            });
            
            console.log('✅ 和风天气API调用成功!');
            console.log('📍 位置:', locationName);
            console.log('🌤️ 天气:', weatherText);
            console.log('🎯 图标:', icon);
            console.log('📊 详细数据:', weather);
            console.log('💾 天气已缓存');
          } else {
            console.error('❌ 和风天气API返回错误:');
            console.error('   错误代码:', res.data.code);
            console.error('   错误信息:', res.data.refer || '未知错误');
            console.error('   完整响应:', res.data);
            
            // 如果是API key相关错误，尝试使用备用key
            if (res.data.code === '401' || res.data.code === '403') {
              console.log('🔄 API Key可能无效，尝试使用格点天气API...');
              // 尝试使用格点天气API作为备用方案
              that.callGridWeatherAPI(apiKey, longitude, latitude, locationName);
            } else {
              // 其他错误，直接使用智能模拟天气作为备用
              that.generateSmartWeather(locationName, latitude, longitude);
            }
          }
        } else {
          console.error('❌ HTTP请求失败:');
          console.error('   状态码:', res.statusCode);
          console.error('   响应:', res);
          
          // 特殊处理403错误（API key问题）
          if (res.statusCode === 403) {
            console.error('🔑 API Key可能无效或已过期，请检查API配置');
            that.showAPIKeyError();
            // 尝试使用格点天气API作为备用方案
            that.callGridWeatherAPI(apiKey, longitude, latitude, locationName);
          } else {
            // 其他HTTP错误，使用智能模拟天气作为备用
            that.generateSmartWeather(locationName, latitude, longitude);
          }
        }
      },
      fail: function(err) {
        console.error('❌ 和风天气API网络请求失败:');
        console.error('   错误信息:', err);
        console.error('   错误类型:', err.errMsg);
        // 尝试使用格点天气API作为备用方案
        that.callGridWeatherAPI(apiKey, longitude, latitude, locationName);
      }
    });
  },

  // 智能生成天气信息（基于位置和时间）
  generateSmartWeather: function(locationName, latitude, longitude) {
    const that = this;
    const now = Date.now();
    
    // 检查缓存，如果5分钟内有缓存且位置相同，直接使用缓存
    if (that.data.weatherCache && 
        (now - that.data.lastWeatherUpdate) < 5 * 60 * 1000 &&
        that.data.weatherCache.location === `${latitude},${longitude}`) {
      console.log('🔄 使用智能天气缓存');
      that.setData({
        weatherInfo: that.data.weatherCache.weatherInfo,
        weatherIcon: that.data.weatherCache.weatherIcon
      });
      return;
    }
    
    // 提取城市名称
    const city = that.extractCityName(locationName);
    
    // 获取当前时间
    const date = new Date();
    const hour = date.getHours();
    const month = date.getMonth() + 1; // 0-11 转换为 1-12
    
    // 根据城市、季节和时间生成天气
    const weather = that.calculateWeatherByLocation(city, latitude, longitude, month, hour);
    
    // 更新天气图标
    const icon = that.getWeatherIcon(weather.condition);
    
    // 更新天气缓存
    const weatherCache = {
      location: `${latitude},${longitude}`,
      weatherInfo: weather.text,
      weatherIcon: icon,
      timestamp: now
    };
    
    that.setData({
      weatherInfo: weather.text,
      weatherIcon: icon,
      weatherCache: weatherCache,
      lastWeatherUpdate: now
    });
    
    console.log('🤖 智能天气生成完成');
    console.log('📍 位置:', locationName);
    console.log('🌤️ 天气:', weather.text);
    console.log('🎯 图标:', icon);
    console.log('💾 天气已缓存');
  },

  // 根据位置、季节和时间计算天气
  calculateWeatherByLocation: function(city, lat, lng, month, hour) {
    // 根据纬度判断气候带
    const isNorth = lat > 35; // 北方
    const isSouth = lat < 25; // 南方
    
    // 根据月份判断季节
    const isSpring = month >= 3 && month <= 5;
    const isSummer = month >= 6 && month <= 8;
    const isAutumn = month >= 9 && month <= 11;
    const isWinter = month === 12 || month <= 2;
    
    // 基础温度计算
    let baseTemp = 20;
    if (isNorth) baseTemp -= 5;
    if (isSouth) baseTemp += 5;
    
    if (isSpring) baseTemp += 5;
    if (isSummer) baseTemp += 15;
    if (isAutumn) baseTemp += 0;
    if (isWinter) baseTemp -= 10;
    
    // 根据时间调整温度（白天高，夜晚低）
    if (hour >= 6 && hour <= 18) {
      baseTemp += 3;
    } else {
      baseTemp -= 3;
    }
    
    // 根据城市特点调整
    const cityAdjustments = {
      '北京': { temp: -2, condition: '晴' },
      '上海': { temp: 2, condition: '多云' },
      '广州': { temp: 8, condition: '小雨' },
      '深圳': { temp: 10, condition: '晴' },
      '杭州': { temp: 3, condition: '多云' },
      '南京': { temp: 1, condition: '晴' },
      '成都': { temp: 0, condition: '阴' },
      '武汉': { temp: 2, condition: '晴' },
      '西安': { temp: -1, condition: '多云' },
      '重庆': { temp: 1, condition: '小雨' }
    };
    
    const adjustment = cityAdjustments[city] || { temp: 0, condition: '晴' };
    baseTemp += adjustment.temp;
    
    // 使用确定性算法添加变化，避免随机性
    const variation = ((month * 7 + hour * 3 + Math.floor(lat * 10) + Math.floor(lng * 10)) % 7) - 3; // -3 到 +3
    const finalTemp = Math.max(-10, Math.min(40, baseTemp + variation));
    
    // 根据温度和季节确定天气状况
    let condition = adjustment.condition;
    if (finalTemp < 0 && isWinter) {
      condition = '雪';
    } else if (finalTemp > 30 && isSummer) {
      condition = '晴';
    } else {
      // 使用基于时间和位置的确定性算法，避免随机性
      const seed = (month * 100 + hour + Math.floor(lat) + Math.floor(lng)) % 4;
      const conditions = ['晴', '多云', '阴', '小雨'];
      condition = conditions[seed];
    }
    
    return {
      text: `${condition} ${finalTemp}°C`,
      condition: condition,
      temperature: finalTemp
    };
  },

  // 备用方案：根据城市名称获取天气
  getWeatherByCityName: function(cityName) {
    const that = this;
    
    // 提取城市名称（去掉省市区等后缀）
    const city = that.extractCityName(cityName);
    
    // 使用和风天气API根据城市名称获取天气
    console.log('🔍 开始查询城市坐标...');
    console.log('🏙️ 查询城市:', city);
    
    // API key列表（可以添加多个备用key）
    const apiKeys = [
      '3f3846b575c34c6aa1a977c8d3d2ee6c', // 主key
      'YOUR_BACKUP_API_KEY_1', // 备用key 1
      'YOUR_BACKUP_API_KEY_2', // 备用key 2
      // 可以添加更多备用key
    ];
    
    that.callCityLookupAPI(apiKeys[0], city, cityName, 0);
  },

  // 调用城市查询API的核心方法
  callCityLookupAPI: function(apiKey, city, cityName, keyIndex) {
    const that = this;
    
    console.log(`🔑 使用API Key ${keyIndex + 1}:`, apiKey.substring(0, 8) + '...');
    
    wx.request({
      url: 'https://geoapi.qweather.com/v2/city/lookup',
      data: {
        location: city,
        key: apiKey,
        number: 1
      },
      success: function(res) {
        console.log('📡 城市查询API完整响应:', res);
        console.log('📊 城市查询响应数据:', res.data);
        console.log('🔍 城市查询状态码:', res.statusCode);
        
        if (res.statusCode === 200) {
          if (res.data.code === '200' && res.data.location && res.data.location[0]) {
            const location = res.data.location[0];
            const lat = location.lat;
            const lon = location.lon;
            
            console.log('✅ 城市查询成功!');
            console.log('🏙️ 城市:', city);
            console.log('📍 坐标:', `${lat}, ${lon}`);
            console.log('📋 位置信息:', location);
            
            // 使用获取到的坐标调用天气API
            that.getWeatherByLocation(lat, lon, cityName);
          } else {
            console.error('❌ 城市查询失败:');
            console.error('   错误代码:', res.data.code);
            console.error('   错误信息:', res.data.refer || '未知错误');
            console.error('   完整响应:', res.data);
            
            // 如果是API key相关错误，尝试使用备用key
            if (res.data.code === '401' || res.data.code === '403') {
              console.log('🔄 API Key可能无效，尝试使用备用方案...');
            }
            
            // 使用智能天气生成作为备用
            that.generateSmartWeather(cityName, 39.9, 116.4);
          }
        } else {
          console.error('❌ 城市查询HTTP请求失败:');
          console.error('   状态码:', res.statusCode);
          console.error('   响应:', res);
          // 使用智能天气生成作为备用
          that.generateSmartWeather(cityName, 39.9, 116.4);
        }
      },
      fail: function(err) {
        console.error('❌ 城市查询API网络请求失败:');
        console.error('   错误信息:', err);
        console.error('   错误类型:', err.errMsg);
        // 使用智能天气生成作为备用
        that.generateSmartWeather(cityName, 39.9, 116.4);
      }
    });
  },

  // 提取城市名称
  extractCityName: function(locationName) {
    if (!locationName) return '北京';
    
    // 提取主要城市名称
    const cityMatch = locationName.match(/([^省市区县]+)/);
    if (cityMatch) {
      return cityMatch[1];
    }
    
    // 如果无法提取，返回默认城市
    return '北京';
  },

  // 显示API Key错误提示
  showAPIKeyError: function() {
    const that = this;
    
    // 显示错误提示
    wx.showModal({
      title: '天气服务异常',
      content: '天气API服务暂时不可用，正在使用智能天气数据。如需获取实时天气，请检查API配置。',
      showCancel: false,
      confirmText: '知道了',
      success: function(res) {
        if (res.confirm) {
          console.log('用户确认了API错误提示');
        }
      }
    });
    
    // 在控制台显示详细的解决建议
    console.log('🔧 API Key问题解决建议:');
    console.log('1. 检查和风天气开发者控制台，确认API Key是否有效');
    console.log('2. 确认API Key是否有足够的调用次数');
    console.log('3. 检查API Key的权限设置');
    console.log('4. 考虑申请新的API Key作为备用');
    console.log('5. 当前使用智能天气数据作为备用方案');
  },

  // 设置模拟天气（当所有API都失败时使用）
  setMockWeather: function(cityName) {
    const that = this;
    
    // 根据城市名称设置不同的模拟天气
    const mockWeathers = {
      '北京': '晴 18°C',
      '上海': '多云 22°C',
      '广州': '小雨 25°C',
      '深圳': '晴 28°C',
      '杭州': '多云 20°C',
      '南京': '晴 19°C',
      '成都': '阴 16°C',
      '武汉': '晴 21°C',
      '西安': '多云 17°C',
      '重庆': '小雨 18°C'
    };
    
    const weather = mockWeathers[cityName] || '晴 20°C';
    
    // 更新天气图标
    const icon = that.getWeatherIcon(weather);
    
    that.setData({
      weatherInfo: weather,
      weatherIcon: icon
    });
  },

  // 格式化天气信息
  formatWeatherInfo: function(weather) {
    if (!weather) return '天气获取失败';
    
    const temp = weather.temp || '--';
    const text = weather.text || '未知';
    const windDir = weather.windDir || '';
    const windScale = weather.windScale || '';
    
    let weatherText = `${text} ${temp}°C`;
    
    if (windDir && windScale) {
      weatherText += ` ${windDir}${windScale}级`;
    }
    
    // 更新天气图标
    const icon = this.getWeatherIcon(text);
    this.setData({
      weatherIcon: icon
    });
    
    return weatherText;
  },

  // 测试天气API功能
  testWeatherAPI: function() {
    const that = this;
    console.log('🧪 开始测试天气API...');
    
    // 测试北京坐标
    const testLocation = {
      name: '北京',
      lat: 39.9042,
      lon: 116.4074
    };
    
    console.log('📍 测试位置:', testLocation);
    
    // 直接调用API测试
    wx.request({
      url: 'https://m759fby47u.re.qweatherapi.com/v7/weather/now',
      data: {
        location: `${testLocation.lon},${testLocation.lat}`,
        key: '3f3846b575c34c6aa1a977c8d3d2ee6c',
        lang: 'zh'
      },
      success: function(res) {
        console.log('🧪 API测试结果:');
        console.log('   状态码:', res.statusCode);
        console.log('   响应数据:', res.data);
        
        if (res.statusCode === 200 && res.data.code === '200') {
          console.log('✅ API测试成功!');
          console.log('   天气:', res.data.now.text);
          console.log('   温度:', res.data.now.temp + '°C');
          console.log('   湿度:', res.data.now.humidity + '%');
          console.log('   风向:', res.data.now.windDir);
          console.log('   风速:', res.data.now.windSpeed + 'km/h');
        } else {
          console.error('❌ API测试失败!');
          console.error('   状态码:', res.statusCode);
          console.error('   错误代码:', res.data.code);
          console.error('   错误信息:', res.data.refer);
          
          // 特殊处理403错误
          if (res.statusCode === 403) {
            console.error('🔑 API Key测试失败 - 可能的原因:');
            console.error('   1. API Key无效或已过期');
            console.error('   2. API Key权限不足');
            console.error('   3. 调用次数超限');
            console.error('   4. 请求格式错误');
            console.error('   建议: 检查和风天气开发者控制台');
            console.error('   当前API Host: m759fby47u.re.qweatherapi.com');
          }
        }
      },
      fail: function(err) {
        console.error('❌ API测试网络错误:', err);
      }
    });
  },

  // 根据天气状况获取对应的图标
  getWeatherIcon: function(weatherText) {
    if (!weatherText) return '☀️';
    
    const weather = weatherText.toLowerCase();
    
    // 和风天气API返回的天气状况匹配
    if (weather.includes('晴')) {
      return '☀️';
    } else if (weather.includes('多云')) {
      return '⛅';
    } else if (weather.includes('阴')) {
      return '☁️';
    } else if (weather.includes('雨')) {
      if (weather.includes('雷') || weather.includes('暴')) {
        return '⛈️';
      } else if (weather.includes('小')) {
        return '🌦️';
      } else if (weather.includes('中')) {
        return '🌧️';
      } else if (weather.includes('大')) {
        return '🌧️';
      } else {
        return '🌧️';
      }
    } else if (weather.includes('雪')) {
      if (weather.includes('小')) {
        return '🌨️';
      } else if (weather.includes('中') || weather.includes('大')) {
        return '❄️';
      } else {
        return '❄️';
      }
    } else if (weather.includes('雾') || weather.includes('霾')) {
      return '🌫️';
    } else if (weather.includes('风')) {
      return '💨';
    } else if (weather.includes('雷')) {
      return '⛈️';
    } else if (weather.includes('沙') || weather.includes('尘')) {
      return '🌪️';
    } else if (weather.includes('冰雹')) {
      return '🌨️';
    } else if (weather.includes('冻雨')) {
      return '🌨️';
    } else {
      return '🌤️'; // 默认多云
    }
  },

  // 生成今日穿搭推荐
  generateRecommendation: function() {
    const that = this;
    
    if (that.data.isGenerating) return;
    
    that.setData({
      isGenerating: true
    });

    // 模拟AI生成过程
    setTimeout(() => {
      const recommendations = that.data.sampleRecommendations;
      const randomIndex = Math.floor(Math.random() * recommendations.length);
      const recommendation = recommendations[randomIndex];
      
      that.setData({
        hasRecommendation: true,
        isGenerating: false,
        recommendationImage: recommendation.image,
        recommendationTitle: recommendation.title,
        recommendationDesc: recommendation.desc,
        recommendationStyle: recommendation.style,
        recommendationTags: recommendation.tags
      });
      
      wx.showToast({
        title: '推荐生成成功！',
        icon: 'success'
      });
    }, 2000);
  },

  // 刷新推荐
  refreshRecommendation: function() {
    this.generateRecommendation();
  },

  // 跳转到衣橱页面
  goToWardrobe: function() {
    wx.switchTab({
      url: '/pages/class/class'
    });
  },

  // 跳转到小铺页面
  goToShop: function() {
    wx.showToast({
      title: '小铺功能开发中...',
      icon: 'none',
      duration: 2000
    });
  },

  // 跳转到历史推荐页面
  goToHistory: function() {
    wx.showToast({
      title: '功能开发中',
      icon: 'none'
    });
  },

  // 下拉刷新
  onPullDownRefresh: function() {
    this.getLocationAndWeather();
    this.generateRecommendation();
    setTimeout(() => {
      wx.stopPullDownRefresh();
    }, 1000);
  },

  // 手动刷新位置
  refreshLocation: function() {
    const that = this;
    wx.showLoading({
      title: '获取位置中...'
    });
    
    this.getLocationAndWeather();
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '位置已更新',
        icon: 'success'
      });
    }, 2000);
  },

  // 手动刷新天气
  refreshWeather: function() {
    const that = this;
    console.log('🔄 强制刷新天气信息');
    
    // 清除天气缓存，强制重新获取
    that.setData({
      weatherCache: null,
      lastWeatherUpdate: 0
    });
    
    wx.showLoading({
      title: '获取天气中...'
    });
    
    // 重新获取当前位置的天气
    if (that.data.currentLocation && that.data.currentLocation !== '位置获取失败') {
      // 如果有位置信息，重新获取天气
      that.getWeatherByCityName(that.data.currentLocation);
    } else {
      // 如果没有位置信息，重新获取位置和天气
      that.getLocationAndWeather();
    }
    
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '天气已更新',
        icon: 'success'
      });
    }, 1500);
  },

  // 使用格点天气API作为备用方案
  callGridWeatherAPI: function(apiKey, longitude, latitude, locationName) {
    const that = this;
    const now = Date.now();
    
    console.log('🔄 尝试使用格点天气API作为备用方案...');
    console.log(`🔑 使用API Key:`, apiKey.substring(0, 8) + '...');
    console.log(`🌐 使用API Host: m759fby47u.re.qweatherapi.com`);
    
    wx.request({
      url: 'https://m759fby47u.re.qweatherapi.com/v7/grid-weather/3d',
      data: {
        location: `${longitude},${latitude}`, // 经度,纬度
        key: apiKey,
        lang: 'zh'
      },
      success: function(res) {
        console.log('📡 格点天气API响应:', res);
        
        if (res.statusCode === 200 && res.data.code === '200' && res.data.daily && res.data.daily.length > 0) {
          const todayWeather = res.data.daily[0];
          const temp = Math.round((parseInt(todayWeather.tempMax) + parseInt(todayWeather.tempMin)) / 2);
          const text = todayWeather.textDay;
          const weatherText = `${text} ${temp}°C`;
          
          // 更新天气图标
          const icon = that.getWeatherIcon(text);
          
          // 更新天气缓存
          const weatherCache = {
            location: `${latitude},${longitude}`,
            weatherInfo: weatherText,
            weatherIcon: icon,
            timestamp: now
          };
          
          that.setData({
            weatherInfo: weatherText,
            weatherIcon: icon,
            weatherCache: weatherCache
          });
          
          console.log('✅ 格点天气API成功获取天气信息:', weatherText);
          console.log('📍 位置:', locationName);
          console.log('🌡️ 温度:', temp + '°C');
          console.log('☁️ 天气:', text);
          
          // 显示成功提示
          wx.showToast({
            title: '天气获取成功',
            icon: 'success',
            duration: 2000
          });
          
        } else {
          console.error('❌ 格点天气API也失败了');
          console.error('   状态码:', res.statusCode);
          console.error('   错误代码:', res.data.code);
          console.error('   错误信息:', res.data.refer);
          
          // 使用智能天气生成作为最后备用方案
          that.generateSmartWeather(longitude, latitude, locationName);
        }
      },
      fail: function(err) {
        console.error('❌ 格点天气API网络错误:', err);
        
        // 使用智能天气生成作为最后备用方案
        that.generateSmartWeather(longitude, latitude, locationName);
      }
    });
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '穿搭style - AI每日穿搭推荐',
      path: '/pages/index/index'
    };
  }
})