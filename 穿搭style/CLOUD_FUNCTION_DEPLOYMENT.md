# AI识别云函数部署指南

## 概述

AI识别功能已重构为云函数架构，提供更好的安全性、性能和可维护性。

## 架构优势

### 🔒 安全性
- API Key存储在云函数中，不会暴露给客户端
- 减少敏感信息泄露风险
- 支持更严格的访问控制

### ⚡ 性能
- 减少小程序包大小
- 提升客户端加载速度
- 云函数自动扩缩容

### 🛠️ 维护性
- 集中管理API逻辑
- 便于更新和调试
- 统一的错误处理

## 部署步骤

### 1. 配置云函数

编辑 `cloudfunctions/aiRecognition/index.js` 文件：

```javascript
// 火山引擎方舟API配置
const AI_CONFIG = {
  apiKey: 'your-volcano-api-key-here', // 替换为您的实际API Key
  model: 'your-model-id-here', // 替换为您的实际模型ID
  baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  timeout: 30000,
  retryCount: 2
};
```

### 2. 安装依赖

在 `cloudfunctions/aiRecognition/` 目录下运行：

```bash
npm install
```

### 3. 部署云函数

#### 方法一：使用微信开发者工具
1. 右键点击 `cloudfunctions/aiRecognition` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 等待部署完成

#### 方法二：使用命令行
```bash
# 在项目根目录执行
wx-cli cloud functions deploy aiRecognition
```

### 4. 测试云函数

在微信开发者工具中：
1. 打开"云开发"控制台
2. 进入"云函数"页面
3. 找到 `aiRecognition` 函数
4. 点击"测试"按钮
5. 输入测试数据：
```json
{
  "imageBase64": "your-base64-image-data"
}
```

## 配置说明

### 云函数配置

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `apiKey` | 火山引擎API Key | 必填 |
| `model` | 推理接入点ID | 必填 |
| `baseUrl` | API地址 | `https://ark.cn-beijing.volces.com/api/v3` |
| `timeout` | 请求超时时间(ms) | `30000` |
| `retryCount` | 重试次数 | `2` |

### 客户端配置

客户端代码无需额外配置，会自动调用云函数：

```javascript
const aiRecognition = new AIRecognition();
const result = await aiRecognition.recognizeClothing(imagePath);
```

## 错误处理

### 云函数错误
- API Key无效：返回模拟数据
- 网络超时：自动重试后返回模拟数据
- 图片格式错误：返回错误信息

### 客户端错误
- 云函数调用失败：自动降级到模拟数据
- 图片读取失败：显示错误提示
- 网络连接问题：显示重试选项

## 监控和日志

### 云函数日志
1. 在微信开发者工具中查看云函数日志
2. 监控API调用成功率和响应时间
3. 查看错误详情和堆栈信息

### 性能监控
- 云函数执行时间
- 内存使用情况
- 调用频率统计

## 成本优化

### 云函数成本
- 按调用次数计费
- 建议设置合理的超时时间
- 监控异常调用

### API调用成本
- 火山引擎按调用次数计费
- 建议在开发阶段使用模拟数据
- 生产环境启用前确认计费规则

## 故障排除

### 常见问题

1. **云函数部署失败**
   - 检查 `package.json` 配置
   - 确认依赖安装完整
   - 查看部署日志

2. **API调用失败**
   - 验证API Key和模型ID
   - 检查网络连接
   - 查看云函数日志

3. **图片处理失败**
   - 确认图片格式支持
   - 检查图片大小限制
   - 验证base64编码

### 调试技巧

1. **本地调试**
   ```javascript
   // 在云函数中添加详细日志
   console.log('API请求数据:', requestData);
   console.log('API响应:', response);
   ```

2. **客户端调试**
   ```javascript
   // 在客户端添加错误处理
   try {
     const result = await aiRecognition.recognizeClothing(imagePath);
     console.log('识别结果:', result);
   } catch (error) {
     console.error('识别失败:', error);
   }
   ```

## 版本管理

### 云函数版本
- 使用语义化版本号
- 记录每次更新的变更
- 保留稳定版本备份

### 配置管理
- 使用环境变量管理敏感配置
- 区分开发和生产环境
- 定期更新API配置

---

*最后更新：2024年*
