# 增强形象照分析功能 - 详细用户信息提取

## 🎯 功能概述

增强形象照分析功能，从用户上传的形象照中提取更详细的个人信息，包括年龄、性别、身高、体重、体型、肤色、脸型、发型等，这些信息将保存在数据库中，并在AI推荐时用于生成更精准的穿搭建议。

## ✅ 主要改进

### 1. **增强AI分析提示词**

#### 文件：`miniprogram/utils/aiRecognition.js`

**新增字段提取：**
- ✅ **年龄范围**：如"20-25岁"
- ✅ **性别**：男/女/未知
- ✅ **身高范围**：如"160-165cm"
- ✅ **体重范围**：如"50-55kg"
- ✅ **体型**：瘦/标准/偏胖/偏瘦等
- ✅ **肤色**：白皙/自然/偏黄/偏黑等
- ✅ **脸型**：圆脸/方脸/长脸/瓜子脸等
- ✅ **发型**：短发/长发/卷发/直发等
- ✅ **整体风格**：整体风格描述

**提示词示例：**
```javascript
"请分析这张形象照中人物的详细信息和穿搭风格，返回JSON格式的结果，包含以下字段：
- styleTags(风格标签数组)
- confidence(置信度0-1)
- description(风格描述)
- userInfo(用户详细信息对象，包含以下字段)：
  - age(年龄范围，如：20-25岁)
  - gender(性别：男/女/未知)
  - height(身高范围，如：160-165cm)
  - weight(体重范围，如：50-55kg)
  - bodyType(体型：瘦/标准/偏胖/偏瘦等)
  - skinTone(肤色：白皙/自然/偏黄/偏黑等)
  - faceShape(脸型：圆脸/方脸/长脸/瓜子脸等)
  - hairStyle(发型：短发/长发/卷发/直发等)
  - overallStyle(整体风格描述)"
```

### 2. **数据库结构扩展**

#### 文件：`cloudfunctions/userProfile/index.js`

**新增云函数操作：**
- ✅ **saveUserAnalysis**：保存用户分析信息
- ✅ **userAnalysis字段**：存储详细的用户分析数据

**数据库字段：**
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
  "userAnalysis": {  // ← 新增字段
    "age": "20-25岁",
    "gender": "女",
    "height": "160-165cm",
    "weight": "50-55kg",
    "bodyType": "标准",
    "skinTone": "白皙",
    "faceShape": "瓜子脸",
    "hairStyle": "长发",
    "overallStyle": "清新甜美风格"
  },
  "createTime": "2024-01-01T00:00:00.000Z",
  "updateTime": "2024-01-01T00:00:00.000Z"
}
```

### 3. **AI推荐提示词增强**

#### 文件：`miniprogram/utils/aiRecommendation.js`

**新增用户信息描述：**
```javascript
// 添加详细的用户分析信息
if (userData.profile && userData.profile.userAnalysis) {
  const analysis = userData.profile.userAnalysis;
  prompt += `根据我的形象照详细分析，我的个人信息如下：`;
  
  if (analysis.age && analysis.age !== '未知') {
    prompt += `年龄：${analysis.age}；`;
  }
  if (analysis.gender && analysis.gender !== '未知') {
    prompt += `性别：${analysis.gender}；`;
  }
  if (analysis.height && analysis.height !== '未知') {
    prompt += `身高：${analysis.height}；`;
  }
  if (analysis.weight && analysis.weight !== '未知') {
    prompt += `体重：${analysis.weight}；`;
  }
  if (analysis.bodyType && analysis.bodyType !== '未知') {
    prompt += `体型：${analysis.bodyType}；`;
  }
  if (analysis.skinTone && analysis.skinTone !== '未知') {
    prompt += `肤色：${analysis.skinTone}；`;
  }
  if (analysis.faceShape && analysis.faceShape !== '未知') {
    prompt += `脸型：${analysis.faceShape}；`;
  }
  if (analysis.hairStyle && analysis.hairStyle !== '未知') {
    prompt += `发型：${analysis.hairStyle}；`;
  }
  if (analysis.overallStyle && analysis.overallStyle !== '未知') {
    prompt += `整体风格：${analysis.overallStyle}。`;
  }
}
```

### 4. **前端集成**

#### 文件：`miniprogram/pages/my/my.js`

**新增功能：**
- ✅ **saveUserAnalysisToDatabase**：保存用户分析信息到数据库
- ✅ **自动保存**：形象照分析完成后自动保存详细信息
- ✅ **数据同步**：更新本地存储和全局数据
- ✅ **数据加载**：页面加载时获取用户分析信息

**工作流程：**
```javascript
// 1. 形象照分析完成
if (result.success && result.data.styleTags && result.data.styleTags.length > 0) {
  // 识别成功，保存详细的用户分析信息到数据库
  if (result.data.userInfo) {
    that.saveUserAnalysisToDatabase(result.data.userInfo);
  }
  
  // 显示结果弹窗
  that.setData({
    aiRecognitionResult: result.data,
    aiRecognizedTags: result.data.styleTags,
    aiConfidencePercent: Math.round((result.data.confidence || 0) * 100),
    showAiResultModal: true
  });
}
```

## 🚀 使用流程

### 1. **用户上传形象照**
```
用户选择形象照 → 上传到云存储 → 触发AI分析
```

### 2. **AI详细分析**
```
AI分析形象照 → 提取风格标签 + 详细用户信息 → 返回完整分析结果
```

### 3. **数据保存**
```
分析结果 → 保存风格标签到数据库 → 保存详细用户信息到数据库 → 更新本地存储
```

### 4. **AI推荐使用**
```
获取用户数据 → 包含详细用户信息 → 构建增强提示词 → 生成精准推荐
```

## 📊 数据示例

### **AI分析结果示例**
```javascript
{
  "styleTags": ["甜美", "清新", "休闲"],
  "confidence": 0.85,
  "description": "清新甜美的休闲风格",
  "userInfo": {
    "age": "22-26岁",
    "gender": "女",
    "height": "160-165cm",
    "weight": "50-55kg",
    "bodyType": "标准",
    "skinTone": "白皙",
    "faceShape": "瓜子脸",
    "hairStyle": "长发",
    "overallStyle": "清新甜美的年轻女性风格"
  }
}
```

### **AI推荐提示词示例**
```
今天是12月15号，周日。当前天气：晴天，温度25°C。
根据我的形象照分析，我喜欢的穿搭风格类型为：甜美、清新、休闲。
根据我的形象照详细分析，我的个人信息如下：年龄：22-26岁；性别：女；身高：160-165cm；体重：50-55kg；体型：标准；肤色：白皙；脸型：瓜子脸；发型：长发；整体风格：清新甜美的年轻女性风格。
我平时偏好的穿搭标签有：简约、舒适。
我的衣橱中有15件衣服，具体如下：
上衣：1、白色衬衫（棉质材质），风格：简约，图片为：https://xxx.jpg，适合日常通勤，建议搭配深色下装；标签：通勤、简约
...
```

## 🎉 预期效果

### 1. **更精准的推荐**
- ✅ **个性化程度提升**：基于详细的用户信息生成推荐
- ✅ **体型适配**：根据身高体重推荐合适的衣服尺寸
- ✅ **肤色搭配**：根据肤色推荐合适的颜色搭配
- ✅ **风格匹配**：根据脸型、发型推荐合适的风格

### 2. **数据完整性**
- ✅ **详细用户画像**：完整的用户信息档案
- ✅ **数据持久化**：信息保存在数据库中
- ✅ **多端同步**：支持多设备数据同步

### 3. **用户体验**
- ✅ **无需手动输入**：自动从形象照提取信息
- ✅ **隐私保护**：详细信息不在UI上显示
- ✅ **智能推荐**：基于完整信息的精准推荐

## 🔧 部署说明

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

### 3. **测试验证**
1. 上传形象照进行AI分析
2. 检查数据库中的userAnalysis字段
3. 测试AI推荐功能是否包含详细用户信息
4. 验证推荐结果的个性化程度

## 📝 注意事项

1. **隐私保护**：详细的用户信息不在UI上显示，仅用于AI推荐
2. **数据准确性**：AI分析结果可能存在误差，建议用户验证
3. **存储成本**：详细用户信息会增加数据库存储量
4. **API调用**：增强的分析会增加API调用成本

## 🎯 未来扩展

1. **更多分析维度**：可以添加身材比例、气质类型等
2. **历史记录**：保存用户形象变化的历史记录
3. **个性化建议**：基于详细信息的个性化穿搭建议
4. **社交功能**：基于相似用户信息的推荐
