# 形象照数据库集成和用户信息存储修复

## 🎯 需求描述

用户希望形象照功能能够：
1. **不压缩图片**：上传完成后直接保存原图
2. **数据库存储**：用户信息/标签、形象照等个人信息应该存储到对应的数据库中

## ✅ 解决方案

### 1. **创建用户信息数据库存储结构**

#### 新增云函数：`cloudfunctions/userProfile/index.js`

**功能特性：**
- ✅ 用户基本信息管理（昵称、头像、性别、地区等）
- ✅ 形象照管理（上传、删除、获取）
- ✅ 风格标签管理（预设标签、自定义标签）
- ✅ 完整的用户档案管理

**数据库集合：`userProfiles`**

| 字段名 | 类型 | 说明 | 示例 |
|--------|------|------|------|
| _openid | String | 用户唯一标识 | "o1234567890" |
| nickName | String | 用户昵称 | "时尚达人" |
| avatarUrl | String | 用户头像URL | "cloud://xxx.jpg" |
| gender | Number | 性别 | 0-未知, 1-男, 2-女 |
| country | String | 国家 | "中国" |
| province | String | 省份 | "广东省" |
| city | String | 城市 | "深圳市" |
| language | String | 语言 | "zh_CN" |
| profilePhoto | String | 形象照URL | "cloud://profile.jpg" |
| styleTags | Array | 风格标签 | ["甜美", "简约", "休闲"] |
| createTime | Date | 创建时间 | 2024-01-01T00:00:00.000Z |
| updateTime | Date | 更新时间 | 2024-01-01T00:00:00.000Z |

### 2. **修改形象照上传逻辑**

#### 文件：`miniprogram/pages/my/my.js`

**主要改进：**

#### A. 移除图片压缩
```javascript
// 修复前：压缩图片
wx.compressImage({
  src: tempFilePath,
  quality: 80,
  success: function(compressRes) {
    that.uploadProfilePhoto(compressRes.tempFilePath);
  }
});

// 修复后：直接上传原图
that.uploadProfilePhoto(tempFilePath);
```

#### B. 上传到云存储
```javascript
// 上传到云存储
const cloudPath = `profile-photos/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;

wx.cloud.uploadFile({
  cloudPath: cloudPath,
  filePath: filePath,
  success: function(uploadRes) {
    // 保存到数据库
    that.saveProfilePhotoToDatabase(uploadRes.fileID);
  }
});
```

#### C. 保存到数据库
```javascript
// 保存形象照到数据库
saveProfilePhotoToDatabase: function(fileID) {
  wx.cloud.callFunction({
    name: 'userProfile',
    data: {
      action: 'saveProfilePhoto',
      profilePhoto: fileID
    },
    success: function(res) {
      // 更新页面显示和本地存储
      that.setData({ profilePhoto: fileID });
      wx.setStorageSync('profilePhoto', fileID);
    }
  });
}
```

### 3. **用户信息数据库存储**

#### A. 保存用户基本信息
```javascript
// 保存用户信息
saveUserInfo() {
  // 保存到数据库
  wx.cloud.callFunction({
    name: 'userProfile',
    data: {
      action: 'saveUserInfo',
      userInfo: cleanUserInfo
    }
  });
  
  // 同时保存到本地存储和全局数据
  wx.setStorageSync('userInfo', cleanUserInfo);
  app.globalData.userInfo = cleanUserInfo;
}
```

#### B. 保存风格标签
```javascript
// 保存用户标签
saveUserTags: function() {
  const allTags = [...selectedTags, ...customTags];
  
  // 保存到数据库
  wx.cloud.callFunction({
    name: 'userProfile',
    data: {
      action: 'saveStyleTags',
      styleTags: allTags
    }
  });
  
  // 保存到本地存储
  wx.setStorageSync('selectedTags', selectedTags);
  wx.setStorageSync('customTags', customTags);
}
```

### 4. **数据加载和同步**

#### A. 从数据库加载用户完整信息
```javascript
// 从数据库加载用户完整信息
loadUserProfileFromDatabase: function() {
  wx.cloud.callFunction({
    name: 'userProfile',
    data: { action: 'getUserProfile' },
    success: function(res) {
      if (res.result.success && res.result.data) {
        const userData = res.result.data;
        
        // 更新用户信息
        that.setData({ userInfo: cleanUserInfo });
        
        // 更新风格标签
        that.setData({ 
          selectedTags: selectedTags,
          customTags: customTags 
        });
        
        // 同步到本地存储和全局数据
        wx.setStorageSync('userInfo', cleanUserInfo);
        app.globalData.userInfo = cleanUserInfo;
      }
    }
  });
}
```

#### B. 形象照加载
```javascript
// 加载形象照
loadProfilePhoto: function() {
  // 先从本地存储加载（快速显示）
  const localProfilePhoto = wx.getStorageSync('profilePhoto');
  if (localProfilePhoto) {
    that.setData({ profilePhoto: localProfilePhoto });
  }
  
  // 从数据库加载最新数据
  wx.cloud.callFunction({
    name: 'userProfile',
    data: { action: 'getUserProfile' },
    success: function(res) {
      if (res.result.data.profilePhoto) {
        that.setData({ profilePhoto: res.result.data.profilePhoto });
        wx.setStorageSync('profilePhoto', res.result.data.profilePhoto);
      }
    }
  });
}
```

### 5. **删除功能完善**

#### 形象照删除
```javascript
// 删除形象照
deleteProfilePhoto: function() {
  // 删除云存储中的文件
  wx.cloud.deleteFile({
    fileList: [that.data.profilePhoto]
  });
  
  // 从数据库中删除
  wx.cloud.callFunction({
    name: 'userProfile',
    data: {
      action: 'saveProfilePhoto',
      profilePhoto: null
    }
  });
  
  // 更新页面显示和本地存储
  that.setData({ profilePhoto: null });
  wx.removeStorageSync('profilePhoto');
}
```

## 🔧 技术实现细节

### **数据流程**

1. **形象照上传流程**：
   ```
   选择图片 → 直接上传到云存储 → 保存fileID到数据库 → 更新UI显示 → 同步本地存储
   ```

2. **用户信息保存流程**：
   ```
   用户输入 → 保存到数据库 → 更新全局数据 → 同步本地存储 → 更新UI显示
   ```

3. **数据加载流程**：
   ```
   页面加载 → 从数据库获取完整信息 → 更新UI显示 → 同步本地存储和全局数据
   ```

### **存储策略**

- **云存储**：形象照原图，不压缩
- **数据库**：用户完整信息，包括形象照URL
- **本地存储**：快速访问缓存
- **全局数据**：运行时快速访问

### **错误处理**

- ✅ 网络请求失败处理
- ✅ 云存储上传失败处理
- ✅ 数据库操作失败处理
- ✅ 本地存储降级处理

## 📊 数据库结构

### **userProfiles集合**

```javascript
{
  "_id": "auto_generated_id",
  "_openid": "user_openid",
  "nickName": "用户昵称",
  "avatarUrl": "用户头像URL",
  "gender": 0,
  "country": "中国",
  "province": "广东省", 
  "city": "深圳市",
  "language": "zh_CN",
  "profilePhoto": "形象照云存储URL",
  "styleTags": ["甜美", "简约", "休闲"],
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-01-01T00:00:00.000Z"
}
```

## 🚀 部署说明

### 1. **云函数部署**
```bash
# 部署用户信息管理云函数
cd cloudfunctions/userProfile
npm install
# 在微信开发者工具中右键部署
```

### 2. **数据库权限设置**
- 设置`userProfiles`集合的读写权限
- 确保用户只能访问自己的数据（通过_openid过滤）

### 3. **云存储配置**
- 设置`profile-photos/`目录的访问权限
- 配置图片访问域名白名单

## 🎉 预期效果

### 1. **形象照功能**
- ✅ **原图保存**：上传的形象照保持原始质量，不压缩
- ✅ **云端存储**：形象照存储在云存储中，支持多设备同步
- ✅ **数据库管理**：形象照URL存储在数据库中，便于管理

### 2. **用户信息管理**
- ✅ **完整存储**：用户昵称、头像、性别、地区等信息完整存储
- ✅ **风格标签**：预设标签和自定义标签统一管理
- ✅ **数据同步**：多设备间数据自动同步

### 3. **性能优化**
- ✅ **快速加载**：本地存储优先，数据库同步
- ✅ **离线支持**：本地存储确保离线可用
- ✅ **数据一致性**：数据库作为权威数据源

## 🔧 后续优化建议

1. **图片优化**：
   - 添加图片格式验证
   - 支持多种图片格式
   - 添加图片大小限制

2. **数据备份**：
   - 定期数据备份
   - 数据恢复机制
   - 数据迁移工具

3. **用户体验**：
   - 上传进度显示
   - 批量操作支持
   - 数据导入导出

4. **安全性**：
   - 数据加密存储
   - 访问权限控制
   - 敏感信息脱敏

现在您的小程序已经具备了完整的用户信息数据库存储功能，形象照将保存原图质量，所有用户信息都会安全地存储在云端数据库中！🎊
