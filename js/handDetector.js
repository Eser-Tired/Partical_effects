/**
 * AetherFlow - Hand Detector & Gesture Classifier
 * 封装 MediaPipe Hands 算法，实现手势分类识别，并渲染科幻感十足的霓虹手部骨骼
 */

export class HandDetector {
  constructor(videoElement, onResultsCallback) {
    this.videoElement = videoElement;
    this.onResultsCallback = onResultsCallback;
    this.hands = null;
    this.camera = null;
    this.isLoaded = false;
    this.progressCallback = null;
    
    this.init();
  }

  // 设置模型加载进度回调
  onProgress(callback) {
    this.progressCallback = callback;
    if (this.isLoaded && this.progressCallback) {
      this.progressCallback(100, "初始化完成");
    }
  }

  // 初始化 MediaPipe Hands 和摄像头
  init() {
    if (!window.Hands) {
      console.error("MediaPipe Hands SDK 尚未加载，请检查网络或 CDN 引入！");
      if (this.progressCallback) {
        this.progressCallback(0, "SDK 加载失败，请刷新重试");
      }
      return;
    }

    if (this.progressCallback) this.progressCallback(30, "正在编译 AI 网络结构...");

    // 1. 创建 Hands 实例，配置 localFile 地址为 jsDelivr CDN
    this.hands = new window.Hands({
      locateFile: (file) => {
        if (this.progressCallback) {
          this.progressCallback(60, `正在下载 AI 模型: ${file}`);
        }
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    // 2. 配置手势参数
    this.hands.setOptions({
      maxNumHands: 2,             // 支持双手检测
      modelComplexity: 1,         // 复杂度为 1，兼顾性能与精度
      minDetectionConfidence: 0.65, // 检出阈值
      minTrackingConfidence: 0.60  // 跟踪阈值
    });

    // 3. 绑定检测结果回调
    this.hands.onResults((results) => {
      if (!this.isLoaded) {
        this.isLoaded = true;
        if (this.progressCallback) {
          this.progressCallback(100, "系统就绪");
        }
      }
      
      // 处理检测结果，提取手势类型
      const processedHands = this.processGesture(results);
      this.onResultsCallback(processedHands, results);
    });

    if (this.progressCallback) this.progressCallback(80, "请求摄像头授权...");

    // 4. 初始化 MediaPipe Camera 辅助工具
    if (window.Camera) {
      this.camera = new window.Camera(this.videoElement, {
        onFrame: async () => {
          await this.hands.send({ image: this.videoElement });
        },
        width: 1280,
        height: 720
      });
      
      this.camera.start().catch(err => {
        console.error("无法启动摄像头:", err);
        if (this.progressCallback) {
          this.progressCallback(-1, `摄像头授权失败: ${err.message}`);
        }
      });
    } else {
      console.error("MediaPipe Camera 辅助工具未找到！");
    }
  }

  // 核心：计算三维欧几里得距离
  getDistance(p1, p2) {
    return Math.hypot(p1.x - p2.x, p1.y - p2.y, p1.z - p2.z);
  }

  // 核心手势判定与数据处理
  processGesture(results) {
    const processedHands = [];
    
    if (results.multiHandLandmarks && results.multiHandedness) {
      for (let i = 0; i < results.multiHandLandmarks.length; i++) {
        const landmarks = results.multiHandLandmarks[i];
        const handedness = results.multiHandedness[i]; // Left / Right
        
        // 1. 获取各个核心指节的位置
        const wrist = landmarks[0];
        
        // 2. 使用“指尖到手腕”与“第二指节到手腕”的距离比判断手指伸缩（旋转无关算法）
        // 关键点映射：4-拇指尖，8-食指尖，12-中指尖，16-无名指尖，20-小指尖
        // 关节映射：2-拇指根部，6-食指第二指节，10-中指第二指节，14-无名指第二指节，18-小指第二指节
        const indexExtended = this.getDistance(wrist, landmarks[8]) > this.getDistance(wrist, landmarks[6]) * 1.12;
        const middleExtended = this.getDistance(wrist, landmarks[12]) > this.getDistance(wrist, landmarks[10]) * 1.12;
        const ringExtended = this.getDistance(wrist, landmarks[16]) > this.getDistance(wrist, landmarks[14]) * 1.12;
        const pinkyExtended = this.getDistance(wrist, landmarks[20]) > this.getDistance(wrist, landmarks[18]) * 1.12;
        
        // 大拇指判定：检查大拇指尖 (4) 与食指根部 (5) 的距离是否舒展开
        const thumbExtended = this.getDistance(wrist, landmarks[4]) > this.getDistance(wrist, landmarks[2]) * 1.15;

        // 3. 判定手势分类
        let gesture = 'Normal';
        
        if (indexExtended && middleExtended && ringExtended && pinkyExtended) {
          gesture = 'Open';   // 张掌
        } else if (!indexExtended && !middleExtended && !ringExtended && !pinkyExtended) {
          gesture = 'Fist';   // 握拳
        } else if (indexExtended && middleExtended && !ringExtended && !pinkyExtended) {
          gesture = 'V';      // 胜利手势
        }
        
        // 4. 计算手掌的近似中心点（使用手掌根部、食指根部、小指根部中点）
        const palmCenterX = (landmarks[0].x + landmarks[5].x + landmarks[17].x) / 3;
        const palmCenterY = (landmarks[0].y + landmarks[5].y + landmarks[17].y) / 3;

        processedHands.push({
          landmarks,
          label: handedness.label, // "Left" 或 "Right"
          gesture,
          palmCenter: { x: palmCenterX, y: palmCenterY },
          indexTip: landmarks[8],
          middleTip: landmarks[12]
        });
      }
    }
    
    return processedHands;
  }

  // 渲染自定义的科幻发光手部骨骼连线
  drawSkeleton(ctx, processedHands, canvasWidth, canvasHeight) {
    ctx.save();
    
    // 配置发光样式
    ctx.shadowBlur = 8;
    
    processedHands.forEach(hand => {
      const landmarks = hand.landmarks;
      
      // 根据手势变换骨骼颜色，增强交互感
      let boneColor = 'rgba(0, 240, 255, 0.6)'; // 霓虹青 (默认)
      let jointColor = '#ffffff';
      
      if (hand.gesture === 'Open') {
        boneColor = 'rgba(0, 255, 170, 0.7)';  // 霓虹绿
      } else if (hand.gesture === 'Fist') {
        boneColor = 'rgba(255, 0, 127, 0.7)';   // 霓虹粉
      } else if (hand.gesture === 'V') {
        boneColor = 'rgba(255, 215, 0, 0.7)';   // 霓虹黄
      }
      
      ctx.strokeStyle = boneColor;
      ctx.shadowColor = boneColor;
      ctx.lineWidth = 3;

      // 骨骼连线数组
      const connections = [
        // 掌心基座
        [0, 1], [1, 2], [2, 3], [3, 4],     // 大拇指
        [0, 5], [5, 6], [6, 7], [7, 8],     // 食指
        [5, 9], [9, 10], [10, 11], [11, 12], // 中指
        [9, 13], [13, 14], [14, 15], [15, 16],// 无名指
        [13, 17], [17, 18], [18, 19], [19, 20],// 小指
        [0, 17]                             // 掌心外延
      ];

      // 1. 绘制关节连线
      ctx.beginPath();
      connections.forEach(([start, end]) => {
        const pStart = landmarks[start];
        const pEnd = landmarks[end];
        
        // 注意：由于摄像头镜像是水平翻转的，绘制坐标也需要水平翻转 (1 - x)
        const sx = (1 - pStart.x) * canvasWidth;
        const sy = pStart.y * canvasHeight;
        const ex = (1 - pEnd.x) * canvasWidth;
        const ey = pEnd.y * canvasHeight;
        
        ctx.moveTo(sx, sy);
        ctx.lineTo(ex, ey);
      });
      ctx.stroke();

      // 2. 绘制关节球
      landmarks.forEach((lm, idx) => {
        const x = (1 - lm.x) * canvasWidth;
        const y = lm.y * canvasHeight;
        
        ctx.beginPath();
        // 指尖（4, 8, 12, 16, 20）绘制大一些并赋予高亮
        if ([4, 8, 12, 16, 20].includes(idx)) {
          ctx.arc(x, y, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.shadowBlur = 12;
        } else {
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fillStyle = boneColor;
          ctx.shadowBlur = 4;
        }
        ctx.fill();
      });
    });

    ctx.restore();
  }
}
