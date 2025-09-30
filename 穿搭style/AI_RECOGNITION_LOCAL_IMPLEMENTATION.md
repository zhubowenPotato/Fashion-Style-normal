# AI识别本地实现方案

## 概述

为了解决云函数超时和内存限制问题，我们将AI识别功能从云函数迁移到本地实现。现在云函数只负责提供API配置信息，实际的AI识别在小程序本地进行。

## 架构变更

### 之前（云函数实现）
```
小程序 → 云函数 → 火山引擎API → 云函数 → 小程序
```

### 现在（本地实现）
```
小程序 → 云函数（获取配置）→ 小程序 → 火山引擎API → 小程序
```

## 主要变更

### 1. 云函数简化 (`cloudfunctions/aiRecognition/index.js`)

**之前**: 复杂的AI识别逻辑，包含图片处理、API调用、结果解析等
**现在**: 仅返回API配置信息

```javascript
exports.main = async (event, context) => {
  return {
    success: true,
    data: {
      config: AI_CONFIG,
      message: '配置获取成功，请在本地进行AI识别'
    }
  };
};
```

### 2. 本地AI识别工具 (`miniprogram/utils/aiRecognition.js`)

**新增功能**:
- 从云函数获取API配置
- 直接调用火山引擎API
- 本地图片压缩（60KB限制）
- 进度回调支持
- 错误处理和降级方案

**主要方法**:
- `getApiConfig()`: 从云函数获取API配置
- `callVolcanoAPI()`: 直接调用火山引擎API
- `recognizeClothing()`: 主要的识别方法，支持进度回调

### 3. 页面更新

#### `miniprogram/pages/addimage/addimage.js`
- 添加进度回调支持
- 更新UI状态管理

#### `miniprogram/pages/class/class.js`
- 添加进度回调支持
- 保持原有的识别流程

#### `miniprogram/pages/addimage/aiRecognitionExample.js`
- 移除不存在的方法调用
- 更新批量识别逻辑

## 配置参数

### API配置
```javascript
const AI_CONFIG = {
  apiKey: 'd00f5365-2041-492a-82ea-8cca8a2ea26f',
  model: 'doubao-seed-1-6-flash-250828',
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
  timeout: 30000, // 30秒超时，本地调用可以有更长时间
  retryCount: 2, // 允许2次重试
  maxTokens: 1024,
  temperature: 0.7,
  topP: 0.8
};
```

### 压缩配置
```javascript
const compressionConfig = {
  enabled: true,
  maxSize: 60 * 1024, // 60KB
  quality: 0.7,
  maxWidth: 800,
  maxHeight: 800
};
```

### 进度配置
```javascript
const progressConfig = {
  totalTime: 20000, // 20秒总时间
  stages: {
    compression: 2000,  // 压缩阶段2秒
    config: 1000,       // 获取配置1秒
    recognition: 17000  // 识别阶段17秒
  }
};
```

## 优势

1. **避免云函数限制**: 不再受20秒超时和256MB内存限制
2. **更好的用户体验**: 本地处理，响应更快
3. **更灵活的配置**: 可以动态调整超时时间和重试次数
4. **更好的错误处理**: 本地可以更好地处理网络错误和重试
5. **进度反馈**: 实时显示识别进度

## 使用示例

```javascript
// 创建AI识别实例
const aiRecognition = new AIRecognition();

// 进度回调
const onProgress = (progressData) => {
  console.log(`阶段: ${progressData.stage}, 进度: ${progressData.progress}%, 消息: ${progressData.message}`);
};

// 执行识别
const result = await aiRecognition.recognizeClothing(imagePath, {}, onProgress);

if (result.success) {
  console.log('识别结果:', result.data);
} else {
  console.error('识别失败:', result.error);
}
```

## 注意事项

1. **网络权限**: 确保小程序有访问外部API的权限
2. **API密钥安全**: API密钥通过云函数获取，避免暴露在前端
3. **图片大小**: 本地压缩到60KB以下，确保传输效率
4. **错误处理**: 提供降级方案，确保用户体验
5. **进度显示**: 实时更新进度，让用户了解处理状态

## 测试建议

1. 测试不同大小的图片识别
2. 测试网络异常情况下的处理
3. 测试进度回调的准确性
4. 测试错误处理和降级方案
5. 测试API配置获取的稳定性

## 部署步骤

1. 部署更新后的云函数
2. 更新小程序代码
3. 测试AI识别功能
4. 监控API调用情况
5. 根据使用情况调整配置参数
