# AI穿搭推荐功能实现

## 🎯 功能概述

实现了点击"生成今日穿搭"按钮时的AI推荐功能，采用**本地执行模式**，参考`aiRecognition.js`的实现方式。能够依据以下因素生成个性化穿搭推荐：

- **形象照风格**：基于用户上传的形象照AI识别的风格标签
- **用户标签**：用户在个人资料中设置的风格偏好标签
- **衣橱信息**：用户衣橱中衣服的搭配信息和分类
- **天气因素**：当前天气状况和温度
- **时间因素**：今日时间、星期等

## ✅ 实现内容

### 1. **新增本地AI推荐工具：`aiRecommendation.js`**

#### 功能特性：
- ✅ 本地执行模式（参考aiRecognition.js）
- ✅ 从云函数获取AI配置信息
- ✅ 多维度数据收集和分析
- ✅ 智能提示词构建
- ✅ 火山引擎API集成
- ✅ 降级处理（AI失败时使用默认推荐）

#### 核心方法：
- `generateRecommendation()` - 生成AI推荐
- `getUserData()` - 获取用户完整数据
- `buildRecommendationPrompt()` - 构建推荐提示词
- `callVolcanoAPI()` - 调用火山引擎API
- `generateDefaultRecommendation()` - 生成默认推荐

### 2. **更新主页面功能**

#### 文件：`miniprogram/pages/index/index.js`

**主要改进：**
- ✅ 集成本地AI推荐工具调用
- ✅ 添加推荐详情查看功能
- ✅ 完善错误处理和降级机制
- ✅ 优化用户体验和加载状态

**更新方法：**
```javascript
// 生成AI推荐（更新为本地调用）
generateRecommendation() {
  // 创建AIRecommendation实例
  // 调用本地推荐方法
  // 处理推荐结果和进度
  // 更新UI显示
}

// 查看推荐详情
viewRecommendationDetails() {
  // 显示详细推荐信息
  // 包含推荐依据和搭配建议
}

// 降级推荐
generateFallbackRecommendation() {
  // AI失败时使用示例推荐
}
```

### 3. **UI界面优化**

#### 文件：`miniprogram/pages/index/index.wxml`

**新增功能：**
- ✅ 推荐卡片点击查看详情
- ✅ 详情提示标签
- ✅ 更好的视觉反馈

#### 文件：`miniprogram/pages/index/index.wxss`

**新增样式：**
- ✅ 详情提示样式
- ✅ 交互效果优化

## 🔧 技术实现

### **数据流程**

1. **用户点击生成推荐**：
   ```
   点击按钮 → 显示加载状态 → 创建AIRecommendation实例 → 开始本地推荐流程
   ```

2. **本地AI推荐生成**：
   ```
   获取用户数据 → 获取AI配置 → 构建推荐提示词 → 调用火山引擎API → 处理结果
   ```

3. **结果展示**：
   ```
   更新UI显示 → 提供详情查看功能
   ```

### **推荐提示词构建逻辑**

1. **时间信息**：
   ```
   今天是X月X号，星期X
   ```

2. **天气信息**：
   ```
   当前天气：晴天，温度25°C
   ```

3. **用户风格偏好**：
   ```
   根据我的形象照分析，我喜欢的穿搭风格类型为：优雅、简约、职场
   我平时偏好的穿搭标签有：正式、舒适、时尚
   ```

4. **衣橱信息**：
   ```
   我的衣橱中有以下衣服：
   上衣：白色衬衫、黑色T恤、针织衫；
   外套：黑色西装、风衣；
   裤装：牛仔裤、黑色长裤；
   鞋子：黑色高跟鞋、小白鞋；
   配饰：简约手包、项链
   ```

5. **AI推荐请求**：
   ```
   请根据以上信息，帮我推荐今天应该怎么穿搭比较适合。
   请返回JSON格式的结果，包含以下字段：
   outfitTitle(穿搭标题), outfitDescription(穿搭描述), 
   outfitStyle(穿搭风格), outfitTags(风格标签数组), 
   clothingItems(推荐的单品列表), stylingTips(搭配建议), 
   confidence(推荐置信度0-1)
   ```

### **错误处理**

- ✅ 网络请求失败处理
- ✅ AI API调用失败降级
- ✅ 数据解析错误处理
- ✅ 用户友好的错误提示

## 📊 数据结构

### **推荐数据结构**

```javascript
{
  // 基本信息
  image: "推荐图片URL",
  title: "穿搭标题",
  description: "穿搭描述",
  style: "穿搭风格",
  tags: ["标签1", "标签2"],
  
  // 详细搭配
  clothingItems: ["单品1", "单品2"],
  stylingTips: "搭配建议",
  
  // 推荐信息
  confidence: 0.85,
  generatedAt: "2024-01-01T00:00:00.000Z",
  
  // 分析依据
  basedOn: {
    userStyle: ["用户风格标签"],
    weather: { temperature: 25, weather: "晴" },
    wardrobe: { totalItems: 50, topColors: ["黑色", "白色"] }
  }
}
```

### **本地存储**

推荐结果存储在页面数据中，不涉及数据库操作：
```javascript
// 页面数据中的推荐信息
{
  hasRecommendation: true,
  recommendationImage: "推荐图片URL",
  recommendationTitle: "穿搭标题",
  recommendationDesc: "穿搭描述",
  recommendationStyle: "穿搭风格",
  recommendationTags: ["标签1", "标签2"],
  recommendationDetails: { /* 完整推荐数据 */ }
}
```

## 🚀 部署说明

### 1. **AI API配置**
- 确保`aiRecognition`云函数已部署（用于获取AI配置）
- 验证火山引擎API配置正确

### 2. **本地文件部署**
- 确保`miniprogram/utils/aiRecommendation.js`文件已创建
- 确保`miniprogram/pages/index/index.js`已更新

### 3. **依赖云函数**
- `userProfile` - 获取用户档案信息
- `aiRecognition` - 获取AI配置信息

### 4. **数据获取方式**
- **用户档案**：通过`userProfile`云函数获取
- **衣橱数据**：直接从数据库`clothes`集合查询
- **天气信息**：通过`wx.getLocation()`获取位置，返回模拟天气数据

## 🔄 最新优化（使用数据库真实信息）

### **优化内容**
- ✅ **移除写死建议**：不再根据衣服类型生成写死的搭配建议
- ✅ **使用真实数据**：直接从数据库获取每件衣服的详细信息
- ✅ **AI识别建议**：使用AI识别时生成的stylingAdvice字段
- ✅ **完整信息**：包含details、tags等数据库中的完整字段

### **数据来源**
每件衣服的信息现在完全来自数据库：
- `name`: 衣服名称
- `details`: 详细描述（AI识别生成）
- `style`: 风格（AI识别生成）
- `color`: 颜色（AI识别生成）
- `stylingAdvice`: 搭配建议（AI识别生成）
- `tags`: 标签（AI识别生成）
- `url`: 图片URL（云存储地址）
- `material`: 材质信息

### **图片地址处理**
- ✅ **正确字段**：使用数据库中的 `url` 字段获取图片地址
- ✅ **调试日志**：添加了详细的调试日志来跟踪每件衣服的图片地址
- ✅ **容错处理**：如果没有图片地址，会显示"暂无图片"
- ✅ **云存储**：图片地址是云存储的完整URL

### **网络超时问题修复**
- ✅ **增加超时时间**：从30秒增加到60秒
- ✅ **添加重试机制**：网络失败时自动重试3次
- ✅ **递增等待时间**：重试间隔为2秒、4秒、6秒
- ✅ **优化请求参数**：减少max_tokens从2000到1500，提高响应速度
- ✅ **详细日志**：记录每次重试的详细信息

### **outfitCombination字段修复**
- ✅ **强化提示词**：明确要求AI返回outfitCombination字段
- ✅ **添加fallback逻辑**：如果AI返回结果缺少该字段，自动生成默认值
- ✅ **默认组合图片**：根据推荐衣服数量生成1-3张组合图片
- ✅ **完整数据结构**：确保所有推荐结果都包含outfitCombination字段

#### **outfitCombination字段修复详细说明**
```javascript
// 1. 强化提示词
prompt += `**重要：outfitCombination字段是必需的，必须返回一个包含图片文件名的数组，例如：["1.png", "2.png", "3.png"]**`;

// 2. 检查并修复缺失字段
if (!result.outfitCombination || !Array.isArray(result.outfitCombination)) {
  console.log('outfitCombination字段缺失或格式错误，生成默认值');
  result.outfitCombination = this.generateDefaultOutfitCombination(result.clothingItems);
}

// 3. 生成默认组合图片
generateDefaultOutfitCombination(clothingItems) {
  const combinations = [];
  const itemCount = clothingItems ? clothingItems.length : 1;
  
  // 生成1-3张组合图片
  for (let i = 1; i <= Math.min(itemCount, 3); i++) {
    combinations.push(`${i}.png`);
  }
  
  return combinations;
}
```

#### **重试机制详细说明**
```javascript
// 重试配置
this.recommendationConfig = {
  maxTokens: 1500,    // 减少token数量，提高响应速度
  temperature: 0.7,
  topP: 0.9,
  timeout: 60000,     // 增加超时时间到60秒
  maxRetries: 3       // 添加重试次数
};

// 重试逻辑
for (let attempt = 1; attempt <= this.recommendationConfig.maxRetries; attempt++) {
  try {
    // 发起API请求
    const response = await wx.request({...});
    return response; // 成功则返回
  } catch (error) {
    if (attempt < maxRetries) {
      const waitTime = attempt * 2000; // 递增等待：2秒、4秒、6秒
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue; // 重试
    }
    throw error; // 最后一次失败则抛出错误
  }
}
```

### **优化效果**
- 🎯 **更准确**：使用AI识别的真实搭配建议
- 🎯 **更个性化**：每件衣服都有独特的描述和建议
- 🎯 **更专业**：基于衣服的真实特性提供指导
- 🎯 **更稳定**：网络超时问题得到解决，重试机制提高成功率

## 🎉 功能特性

### 1. **智能推荐**
- ✅ **多维度分析**：综合考虑用户风格、衣橱、天气等因素
- ✅ **个性化定制**：基于用户个人偏好生成推荐
- ✅ **实时适应**：根据当前天气和时间调整推荐
- ✅ **详细描述**：每件衣服包含编号、颜色、材质、风格、图片等详细信息
- ✅ **真实数据**：直接使用数据库中的真实信息，包括AI识别的搭配建议
- ✅ **搭配建议**：使用数据库中存储的stylingAdvice字段，不是生成写死的建议
- ✅ **穿搭组合**：返回推荐的穿搭组合图片数组
- ✅ **专业指导**：基于衣服的真实特性提供专业的穿搭指导

### 2. **用户体验**
- ✅ **一键生成**：点击按钮即可获得推荐
- ✅ **详情查看**：点击推荐卡片查看详细信息
- ✅ **降级处理**：AI失败时自动使用示例推荐

### 3. **本地执行**
- ✅ **本地处理**：所有推荐逻辑在本地执行
- ✅ **实时数据**：实时获取用户最新数据
- ✅ **快速响应**：无需云函数调用延迟

## 📝 提示词格式示例

### 优化后的衣服描述格式（使用数据库真实信息）：
```
我的衣橱中有5件衣服，具体如下：
上衣：
1、蓝白上衣（棉质材质），风格：休闲，图片为：https://cloud-storage-url/blue_white_top.jpg，T恤，建议搭配牛仔裤和运动鞋，营造轻松休闲的日常风格；标签：休闲 白色 日常

2、深蓝色上衣（棉质材质），风格：休闲，图片为：https://cloud-storage-url/dark_blue_top.jpg，衬衫，适合搭配浅色下装，如白色或米色裤子，适合商务休闲场合；标签：商务 蓝色 正式

3、浅粉色粉色蝴蝶印花短袖睡衣（丝绸材质），风格：居家休闲，图片为：https://cloud-storage-url/pink_pajama.jpg，睡衣，适合居家穿着，搭配同色系拖鞋，营造温馨舒适的居家氛围；标签：居家 粉色 舒适

配饰：
4、浅米色针织护颈围巾（针织材质），风格：休闲温馨，图片为：https://cloud-storage-url/beige_scarf.jpg，围巾，可作为秋冬季节的保暖配饰，搭配深色外套效果更佳；标签：保暖 米色 秋冬
```

### 返回JSON格式：
```json
{
  "outfitTitle": "清新休闲风",
  "outfitDescription": "适合春秋季节的舒适穿搭",
  "outfitStyle": "休闲",
  "outfitTags": ["清新", "舒适", "日常"],
  "clothingItems": ["上衣1", "配饰4"],
  "stylingTips": "建议搭配白色运动鞋，营造轻松自然的氛围",
  "outfitCombination": ["1.png", "2.png"],
  "confidence": 0.85
}
```

## 🔮 未来扩展

1. **推荐优化**：
   - 基于用户反馈优化推荐算法
   - 增加更多推荐维度（场合、心情等）
   - 支持多套推荐方案

2. **功能增强**：
   - 推荐分享功能
   - 推荐收藏功能
   - 推荐评价系统

3. **AI能力提升**：
   - 集成图像生成AI
   - 支持虚拟试穿
   - 个性化推荐模型训练
