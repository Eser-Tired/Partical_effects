/**
 * AetherFlow - Application Main Controller
 * 协调摄像头、AI手势检测器、粒子引擎与控制面板 UI 的交互
 */

import { ParticleSystem } from './particleSystem.js';
import { HandDetector } from './handDetector.js';

document.addEventListener('DOMContentLoaded', () => {
  // ==========================================================================
  // 1. 获取 DOM 节点
  // ==========================================================================
  const videoElement = document.getElementById('webcam');
  const canvasElement = document.getElementById('particle-canvas');
  const loadingScreen = document.getElementById('loading-screen');
  const loadingStatusText = loadingScreen.querySelector('.status-msg');
  const progressFill = loadingScreen.querySelector('.progress-fill');
  
  // UI 控制项
  const themeButtons = document.querySelectorAll('.theme-btn');
  const cameraOpacityInput = document.getElementById('camera-opacity');
  const cameraOpacityDisplay = cameraOpacityInput.nextElementSibling;
  const toggleLandmarksCheckbox = document.getElementById('toggle-landmarks');
  const particleDensityInput = document.getElementById('particle-density');
  const particleDensityDisplay = particleDensityInput.nextElementSibling;
  // 各主题粒子大小控制项
  const sizeFireInput = document.getElementById('size-fire');
  const sizeFireDisplay = sizeFireInput.nextElementSibling;
  const sizeAuroraInput = document.getElementById('size-aurora');
  const sizeAuroraDisplay = sizeAuroraInput.nextElementSibling;
  const sizeCyberInput = document.getElementById('size-cyber');
  const sizeCyberDisplay = sizeCyberInput.nextElementSibling;
  const sizeVoidInput = document.getElementById('size-void');
  const sizeVoidDisplay = sizeVoidInput.nextElementSibling;
  
  // 虚空引力强度控制项
  const voidGravityMultInput = document.getElementById('void-gravity-mult');
  const voidGravityMultDisplay = voidGravityMultInput.nextElementSibling;
  
  // 运行诊断项
  const gestureNameDisplay = document.getElementById('gesture-name');
  const fpsDisplay = document.getElementById('fps-display');
  const handsCountDisplay = document.getElementById('hands-count');
  const particleCountDisplay = document.getElementById('particle-count');
  
  // 互动指南
  const gestureGuide = document.getElementById('gesture-guide');
  const guideToggle = gestureGuide.querySelector('.guide-toggle');

  // ==========================================================================
  // 2. 初始化核心系统
  // ==========================================================================
  const particleSystem = new ParticleSystem(canvasElement);
  
  // 存储最新的一帧手势数据，供 60 FPS 渲染循环读取（解耦 30fps 识别与 60fps 特效）
  let latestHandsData = [];
  
  // 记录双手靠近触发超新星碰撞的状态转换标志
  let handsCloseLastFrame = false;
  
  // 手势状态记录，用于检测状态突变（例如从 拳头 突然 展开手掌）
  const previousGestures = { Left: 'Normal', Right: 'Normal' };

  // 初始化手势检测器
  const handDetector = new HandDetector(videoElement, (processedHands) => {
    // 缓存最新检测结果
    latestHandsData = processedHands;
  });

  // 监听模型加载进度，更新遮罩 UI
  handDetector.onProgress((progress, statusText) => {
    if (progress === -1) {
      // 报错状态
      loadingStatusText.textContent = statusText;
      loadingStatusText.style.color = 'var(--color-secondary)';
      progressFill.style.width = '100%';
      progressFill.style.background = 'var(--color-secondary)';
      return;
    }

    progressFill.style.width = `${progress}%`;
    loadingStatusText.textContent = statusText;

    if (progress === 100) {
      // 延时淡出加载屏幕
      setTimeout(() => {
        loadingScreen.classList.remove('active');
        loadingScreen.classList.add('inactive');
      }, 800);
    }
  });

  // ==========================================================================
  // 3. UI 交互事件绑定
  // ==========================================================================
  
  // 指南展开与收缩
  guideToggle.addEventListener('click', () => {
    gestureGuide.classList.toggle('expanded');
  });

  // 主题切换按钮
  themeButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      // 移除原激活样式
      themeButtons.forEach(b => b.classList.remove('active'));
      
      const themeName = btn.dataset.theme;
      btn.classList.add('active');
      
      // 更新粒子引擎主题
      particleSystem.setTheme(themeName);
      
      // 更新诊断系统高亮颜色
      const rootStyles = getComputedStyle(document.documentElement);
      const activeColor = rootStyles.getPropertyValue(`--theme-${themeName}`).trim();
      gestureNameDisplay.style.color = activeColor;
      gestureNameDisplay.style.textShadow = `0 0 10px ${activeColor}`;
    });
  });

  // 摄像头画面透明度修改
  cameraOpacityInput.addEventListener('input', (e) => {
    const val = e.target.value;
    videoElement.style.opacity = val / 100;
    cameraOpacityDisplay.textContent = `${val}%`;
  });

  // 粒子生成速率（密度）修改
  const densityLabels = ["极低", "超低", "偏低", "较低", "中等", "偏高", "较高", "超高", "爆发", "无尽"];
  particleDensityInput.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    particleSystem.density = val;
    particleDensityDisplay.textContent = densityLabels[val - 1] || "中等";
  });

  // 烈焰粒子大小修改
  sizeFireInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    particleSystem.themeSizes.fire = val;
    sizeFireDisplay.textContent = `${val.toFixed(1)}px`;
  });

  // 极光粒子大小修改
  sizeAuroraInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    particleSystem.themeSizes.aurora = val;
    sizeAuroraDisplay.textContent = `${val.toFixed(1)}px`;
  });

  // 火花粒子粗细修改
  sizeCyberInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    particleSystem.themeSizes.cyber = val;
    sizeCyberDisplay.textContent = `${val.toFixed(1)}px`;
  });

  // 虚空粒子大小修改
  sizeVoidInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    particleSystem.themeSizes.void = val;
    sizeVoidDisplay.textContent = `${val.toFixed(1)}px`;
  });

  // 虚空引力场倍率控制 (从 0 到无穷大)
  voidGravityMultInput.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value);
    if (val >= 10.0) {
      // 设定极高引力，拉满时形成瞬间吸附视界，即为“无穷大”
      particleSystem.voidGravityMultiplier = 800.0;
      voidGravityMultDisplay.textContent = "∞ (无穷大)";
    } else if (val === 0.0) {
      particleSystem.voidGravityMultiplier = 0.0;
      voidGravityMultDisplay.textContent = "0.0x (无引力)";
    } else {
      // 采用二次方曲线，使低段和高段的操作范围更具对比性
      const mappedVal = Math.pow(val, 2.0);
      particleSystem.voidGravityMultiplier = mappedVal;
      voidGravityMultDisplay.textContent = `${val.toFixed(1)}x`;
    }
  });

  // ==========================================================================
  // 4. 60 FPS 物理渲染主循环 (The MainLoop)
  // ==========================================================================
  let lastTime = performance.now();
  let frameCount = 0;
  let fps = 60;

  // 定时更新诊断面板（降低 DOM 操作频率至每秒 2 次）
  setInterval(() => {
    fpsDisplay.textContent = `${fps} FPS`;
    particleCountDisplay.textContent = particleSystem.particles.length;
    handsCountDisplay.textContent = `${latestHandsData.length} / 2`;
    
    if (latestHandsData.length === 0) {
      gestureNameDisplay.textContent = "未检测到手";
      gestureNameDisplay.classList.remove('text-glow');
    } else {
      const gestureStatusList = latestHandsData.map(h => {
        const gestureLabels = {
          Normal: '普通移动',
          Open: '张开手掌',
          Fist: '握拳凝聚',
          V: '极光胜利'
        };
        const handLabel = h.label === 'Left' ? '左手' : '右手';
        return `${handLabel}:${gestureLabels[h.gesture] || '未知'}`;
      });
      gestureNameDisplay.textContent = gestureStatusList.join(' | ');
      gestureNameDisplay.classList.add('text-glow');
    }
  }, 500);

  function mainLoop(timestamp) {
    // 4.1 计算实时 FPS
    frameCount++;
    const elapsed = timestamp - lastTime;
    if (elapsed >= 1000) {
      fps = Math.round((frameCount * 1000) / elapsed);
      frameCount = 0;
      lastTime = timestamp;
    }

    // 4.2 获取 Canvas 分辨率大小 (已考虑 DPR 缩放)
    const canvasWidth = canvasElement.width / (window.devicePixelRatio || 1);
    const canvasHeight = canvasElement.height / (window.devicePixelRatio || 1);

    // 4.3 检测到的手势映射到粒子物理驱动中
    if (latestHandsData.length > 0) {
      // 记录手部坐标中心，用于虚空主题的引力或者旋转算法
      let firstHand = latestHandsData[0];
      const mainEmitterX = (1 - firstHand.palmCenter.x) * canvasWidth;
      const mainEmitterY = firstHand.palmCenter.y * canvasHeight;

      // ==========================================================================
      // 【新增逻辑】自动手势转换粒子特效主题
      // 👋 张手 -> 🔥 烈焰风暴 (fire)
      // ✊ 握拳 -> 🌀 虚空引力 (void)
      // ✌️ 胜利 (V) -> 🌌 极光魔幻 (aurora)
      // 普通跟随 -> ⚡ 霓虹赛博 (cyber)
      // ==========================================================================
      let targetTheme = 'cyber'; // 默认为赛博主题
      
      const activeGestures = latestHandsData.map(h => h.gesture);
      if (activeGestures.includes('Open')) {
        targetTheme = 'fire';
      } else if (activeGestures.includes('Fist')) {
        targetTheme = 'void';
      } else if (activeGestures.includes('V')) {
        targetTheme = 'aurora';
      }

      // 如果目标手势对应的主题与当前粒子引擎主题不一致，则进行切换并同步 UI 状态
      if (particleSystem.themeName !== targetTheme) {
        particleSystem.setTheme(targetTheme);
        
        // 自动同步点亮右上角控制面板中对应的按钮
        themeButtons.forEach(btn => {
          if (btn.dataset.theme === targetTheme) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });

        // 动态变更手势状态霓虹字体的发光色彩
        const rootStyles = getComputedStyle(document.documentElement);
        const activeColor = rootStyles.getPropertyValue(`--theme-${targetTheme}`).trim();
        gestureNameDisplay.style.color = activeColor;
        gestureNameDisplay.style.textShadow = `0 0 10px ${activeColor}`;
      }

      // 更新粒子物理场（传递手部坐标中心给 update 修改器）
      particleSystem.update(mainEmitterX, mainEmitterY);

      // 处理每只手的特定手势逻辑
      latestHandsData.forEach(hand => {
        // 由于摄像头镜像是翻转的，我们将 normalized 的 X 轴进行翻转 (1 - x)
        const palmX = (1 - hand.palmCenter.x) * canvasWidth;
        const palmY = hand.palmCenter.y * canvasHeight;
        
        const indexX = (1 - hand.indexTip.x) * canvasWidth;
        const indexY = hand.indexTip.y * canvasHeight;
        
        const middleX = (1 - hand.middleTip.x) * canvasWidth;
        const middleY = hand.middleTip.y * canvasHeight;

        const label = hand.label; // "Left" 或 "Right"
        const currentGesture = hand.gesture;
        const prevGesture = previousGestures[label] || 'Normal';

        // 核心动作处理
        if (currentGesture === 'Open') {
          // 张掌状态：
          // (A) 如果是刚刚从其他状态转为“张掌”，瞬间触发大爆发 (Burst)
          if (prevGesture !== 'Open') {
            particleSystem.triggerBurst(palmX, palmY);
          }
          // (B) 持续张掌期间，保持掌心高亮生成轻微散射拖尾
          particleSystem.emitTrail(palmX, palmY, 1.5);
          
        } else if (currentGesture === 'Fist') {
          // 握拳状态：对所有场内粒子施加重力凝聚，向拳头中心吸引
          particleSystem.applyGravityWell(palmX, palmY);
          
        } else if (currentGesture === 'V') {
          // 胜利手势状态：食指与中指尖端各自拉出彩色流光线
          particleSystem.emitAuroraDoubleTrail(
            { x: indexX, y: indexY },
            { x: middleX, y: middleY }
          );
          
        } else {
          // 普通状态：跟随食指尖产生常规拖尾
          particleSystem.emitTrail(indexX, indexY, 1.0);
        }

        // 更新状态机的上一次状态
        previousGestures[label] = currentGesture;
      });

      // 4.3.1 双手协同联动判定：电弧连线与超新星大引爆
      if (latestHandsData.length === 2) {
        const hand1 = latestHandsData[0];
        const hand2 = latestHandsData[1];

        const palm1X = (1 - hand1.palmCenter.x) * canvasWidth;
        const palm1Y = hand1.palmCenter.y * canvasHeight;
        const palm2X = (1 - hand2.palmCenter.x) * canvasWidth;
        const palm2Y = hand2.palmCenter.y * canvasHeight;

        const distance = Math.hypot(palm1X - palm2X, palm1Y - palm2Y);

        // 1) 掌心靠近大引爆判定
        if (distance < 110) {
          if (!handsCloseLastFrame) {
            const cx = (palm1X + palm2X) / 2;
            const cy = (palm1Y + palm2Y) / 2;
            particleSystem.triggerSupernova(cx, cy);
            handsCloseLastFrame = true;
          }
        } else if (distance > 150) {
          // 重新激活判定迟滞区间
          handsCloseLastFrame = false;
        }

        // 2) 指尖连线高压电弧判定
        if (distance >= 110) {
          const index1X = (1 - hand1.indexTip.x) * canvasWidth;
          const index1Y = hand1.indexTip.y * canvasHeight;
          const index2X = (1 - hand2.indexTip.x) * canvasWidth;
          const index2Y = hand2.indexTip.y * canvasHeight;

          // 绘制跳动的电磁光线连线
          particleSystem.drawLightningArc(
            { x: index1X, y: index1Y },
            { x: index2X, y: index2Y }
          );
        }
      } else {
        handsCloseLastFrame = false;
      }

      // 获取当前摄像头透明度参数
      const camOpacity = parseFloat(cameraOpacityInput.value);

      // 4.4 渲染 MediaPipe 霓虹手部骨骼 (若勾选)
      if (toggleLandmarksCheckbox.checked) {
        particleSystem.draw(videoElement, camOpacity); // 绘制视频与粒子
        // 叠加在粒子上方绘制骨骼
        handDetector.drawSkeleton(particleSystem.ctx, latestHandsData, canvasWidth, canvasHeight);
      } else {
        particleSystem.draw(videoElement, camOpacity); // 纯粒子绘制
      }

    } else {
      // 获取当前摄像头透明度参数
      const camOpacity = parseFloat(cameraOpacityInput.value);

      // 4.5 未检测到手势：粒子系统自主演化，发射器停止
      particleSystem.update();
      particleSystem.draw(videoElement, camOpacity);
      
      // 重置状态机
      previousGestures.Left = 'Normal';
      previousGestures.Right = 'Normal';
    }

    // 循环调用
    requestAnimationFrame(mainLoop);
  }

  // 启动 60fps 渲染循环
  requestAnimationFrame(mainLoop);

  // ==========================================================================
  // 5. 视频录制逻辑 (MediaRecorder API)
  // ==========================================================================
  const recordBtn = document.getElementById('record-btn');
  const recordBtnText = document.getElementById('record-btn-text');
  const recordTimer = document.getElementById('record-timer');
  const recordFormatSelect = document.getElementById('record-format');
  
  let mediaRecorder = null;
  let recordedChunks = [];
  let isRecording = false;
  let recordStartTime = 0;
  let timerInterval = null;
  
  // 更新录制计时器 UI
  function updateTimer() {
    const elapsedMs = Date.now() - recordStartTime;
    const totalSec = Math.floor(elapsedMs / 1000);
    const min = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const sec = (totalSec % 60).toString().padStart(2, '0');
    recordTimer.textContent = `${min}:${sec}`;
  }
  
  // 切换录制状态
  function toggleRecording() {
    if (!isRecording) {
      // 1. 开始录制
      recordedChunks = [];
      
      // 将 Canvas 捕获帧率直接提升至 60 FPS (实现 60 帧极速录制)
      const canvasStream = canvasElement.captureStream(60);
      
      // 读取用户选择的导出格式
      const selectedFormat = recordFormatSelect.value;
      let options = { mimeType: 'video/webm;codecs=vp9' };
      
      if (selectedFormat === 'mp4') {
        // 自适应探测高兼容的 MP4 硬件编码
        if (MediaRecorder.isTypeSupported('video/mp4;codecs=h264')) {
          options = { mimeType: 'video/mp4;codecs=h264' };
        } else if (MediaRecorder.isTypeSupported('video/mp4')) {
          options = { mimeType: 'video/mp4' };
        } else {
          // 若浏览器不支持，退回 WebM 录制，稍后下载重写扩展名
          options = { mimeType: 'video/webm;codecs=vp9' };
          console.warn("浏览器不支持原生 MP4 编码，将使用 WebM 编码并存为 .mp4 容器后缀");
        }
      } else if (selectedFormat === 'avi') {
        // 浏览器原生不支持 AVI 容器，采用 WebM 编码并以 .avi 格式输出
        options = { mimeType: 'video/webm;codecs=vp9' };
      } else {
        // webm 模式下检测支持的最优 WebM 编码
        if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
          options = { mimeType: 'video/webm;codecs=vp9' };
        } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
          options = { mimeType: 'video/webm;codecs=vp8' };
        } else {
          options = { mimeType: 'video/webm' };
        }
      }
      
      try {
        mediaRecorder = new MediaRecorder(canvasStream, options);
      } catch (err) {
        console.error("初始化 MediaRecorder 失败:", err);
        alert("您的浏览器不支持视频录制功能！");
        return;
      }
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunks.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // 根据实际编码配置 Blob 的类型
        const blobType = options.mimeType.split(';')[0];
        const blob = new Blob(recordedChunks, { type: blobType });
        const url = URL.createObjectURL(blob);
        
        // 自动下载视频，并以用户所选的视频后缀（mp4/avi/webm）保存
        const a = document.createElement('a');
        a.href = url;
        a.download = `AetherFlow-AR-${Date.now()}.${selectedFormat}`;
        document.body.appendChild(a);
        a.click();
        
        // 释放临时内存
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        
        recordTimer.textContent = "00:00";
      };
      
      // 启动录制，每 200ms 推送一次数据块以防崩溃
      mediaRecorder.start(200);
      isRecording = true;
      recordStartTime = Date.now();
      
      // 激活 UI 状态
      recordBtn.classList.add('recording');
      recordBtnText.textContent = "停止录制";
      timerInterval = setInterval(updateTimer, 500);
      
    } else {
      // 2. 停止录制
      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        mediaRecorder.stop();
      }
      isRecording = false;
      
      // 清除 UI 状态
      recordBtn.classList.remove('recording');
      recordBtnText.textContent = "开始录制";
      clearInterval(timerInterval);
    }
  }
  
  recordBtn.addEventListener('click', toggleRecording);
});
