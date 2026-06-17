/**
 * AetherFlow - Particle Physics Engine
 * 管理单个粒子的物理学属性（速度、阻尼、重力、形状）以及粒子系统的发射与生命周期更新
 */

import { themes } from './particleThemes.js';

class Particle {
  constructor(x, y, vx, vy, size, color, shape, maxLife, isBurst = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.originalSize = size;
    this.color = color;
    this.shape = shape;
    this.maxLife = maxLife;
    this.age = 0;
    this.alpha = 1;
    this.isBurst = isBurst; // 标记是否为爆发产生的粒子
  }

  update(themeConfig, emitterX, emitterY, system) {
    // 1. 施加阻尼（摩擦力）
    this.vx *= themeConfig.friction;
    this.vy *= themeConfig.friction;

    // 2. 施加重力加速度
    this.vx += themeConfig.gravityX;
    this.vy += themeConfig.gravityY;

    // 3. 应用自定义运动修改器（如正弦波动、轨道环绕等）
    if (themeConfig.updateModifier) {
      themeConfig.updateModifier(this, emitterX, emitterY, system);
    }

    // 4. 更新坐标位置
    this.x += this.vx;
    this.y += this.vy;

    // 5. 递增生命周期并计算不透明度衰减
    this.age++;
    this.alpha = 1 - (this.age / this.maxLife);

    // 6. 赛博风格等可能出现的尺寸微缩
    if (themeConfig.name === '霓虹赛博') {
      this.size = this.originalSize * this.alpha;
    }
  }

  draw(ctx, system) {
    ctx.save();
    
    // 设置透明度
    ctx.globalAlpha = this.alpha;

    if (this.shape === 'streak-spark') {
      // 真实金属/电脉冲火花：基于运动速度向量拉伸的线段 (实现物理运动模糊)
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.size * 0.45;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      // 向速度相反方向拉伸线段
      ctx.lineTo(this.x - this.vx * 1.5, this.y - this.vy * 1.5);
      ctx.stroke();
    } else {
      // 气态/火星/烟雾粒子：从 JIT 缓存中读取软梯度发光精灵图进行高速渲染
      const sprite = system.getSprite(this.color);
      ctx.drawImage(
        sprite,
        this.x - this.size,
        this.y - this.size,
        this.size * 2,
        this.size * 2
      );
    }
    
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.shockwaves = []; // 存储双手靠近产生大爆炸时的电磁震荡冲击波
    
    // 默认系统配置
    this.themeName = 'fire';
    this.density = 5;      // 粒子生成速率因子
    
    // 支持分别调节每个特效的粒子大小
    this.themeSizes = {
      fire: 4.0,
      aurora: 5.0,
      cyber: 3.5,
      void: 4.0
    };
    // 虚空引力倍率（从 0 到无限大）
    this.voidGravityMultiplier = 1.0;
    
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  // 响应窗口缩放并适配高分辨率 Retina 屏幕
  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
  }

  get config() {
    return themes[this.themeName];
  }

  setTheme(themeName) {
    if (themes[themeName]) {
      this.themeName = themeName;
    }
  }

  // 辅助函数：根据主题获取一个随机颜色
  _getRandomThemeColor() {
    const colors = this.config.colors;
    return colors[Math.floor(Math.random() * colors.length)];
  }

  // 辅助函数：根据主题获取一个随机粒子形状
  _getThemeShape() {
    const shape = this.config.particleShape;
    if (shape === 'mixed') {
      const shapes = ['circle', 'square', 'cross'];
      return shapes[Math.floor(Math.random() * shapes.length)];
    }
    return shape;
  }

  // 1. 拖尾模式：在指定位置生成轨迹粒子
  emitTrail(x, y, countMultiplier = 1) {
    const activeConfig = this.config;
    // 大幅提升粒子基础发射量（原 0.5 提升至 1.6，带来 3 倍以上粒子量）
    const count = Math.ceil(this.density * 1.6 * countMultiplier);
    
    for (let i = 0; i < count; i++) {
      // 沿微小随机偏移发射
      const offsetAngle = Math.random() * Math.PI * 2;
      const offsetRadius = Math.random() * 12;
      const px = x + Math.cos(offsetAngle) * offsetRadius;
      const py = y + Math.sin(offsetAngle) * offsetRadius;

      // 初速度放大
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.3 + Math.random() * 2.2) * activeConfig.speedMultiplier;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // 粒子尺寸基准放大 (依据各个主题独立的大小配置 themeSizes 获取)
      const baseSize = this.themeSizes[this.themeName] || 4.0;
      const size = (0.8 + Math.random() * 1.7) * baseSize;
      const color = this._getRandomThemeColor();
      const shape = this._getThemeShape();
      const life = activeConfig.maxLife * (0.6 + Math.random() * 0.6);

      this.particles.push(
        new Particle(px, py, vx, vy, size, color, shape, life, false)
      );
    }
  }

  // 2. 双极光拖尾模式 (用于 V 手势，产生交织流线)
  emitAuroraDoubleTrail(finger1, finger2) {
    // 指尖 1 发射青绿色系
    this.emitTrail(finger1.x, finger1.y, 0.9);
    // 指尖 2 发射紫粉色系
    this.emitTrail(finger2.x, finger2.y, 0.9);
  }

  // 3. 爆炸模式：张掌时在中心坐标瞬间抛洒大量粒子
  triggerBurst(x, y) {
    const activeConfig = this.config;
    const count = activeConfig.burstCount;
    
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      // 爆炸粒子飞散初速度成倍放大，范围更广
      const speed = (2.0 + Math.random() * 9.0) * activeConfig.speedMultiplier;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      // 爆炸碎片大小极具冲击力 (依据各个主题独立的大小配置 themeSizes 获取)
      const baseSize = this.themeSizes[this.themeName] || 4.0;
      const size = (1.2 + Math.random() * 2.8) * baseSize;
      const color = this._getRandomThemeColor();
      const shape = this._getThemeShape();
      // 爆炸粒子生命周期长短参差不齐，更加立体
      const life = activeConfig.maxLife * (0.8 + Math.random() * 1.2);

      this.particles.push(
        new Particle(x, y, vx, vy, size, color, shape, life, true)
      );
    }
  }

  // 4. 凝聚模式：握拳时对所有粒子施加引力，将它们拉向拳心
  applyGravityWell(centerX, centerY) {
    // 物理凝聚引力根据 voidGravityMultiplier (支持从 0 到无穷大) 进行放大
    const isVoidTheme = this.themeName === 'void';
    const forceFactor = this.config.attractionForce * (isVoidTheme ? this.voidGravityMultiplier : 1.0);
    
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 10) {
        // 万有引力近似模型：引力大小与距离成反比（添加微弱阻尼防数值爆炸）
        const gravityStrength = (50 / (dist + 30)) * forceFactor;
        p.vx += (dx / dist) * gravityStrength;
        p.vy += (dy / dist) * gravityStrength;
      }
    }
    
    // 握拳时，拳心也顺便生成少量粒子向内收缩
    if (Math.random() < 0.35) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 60 + Math.random() * 40; // 在周围生成
      const px = centerX + Math.cos(angle) * radius;
      const py = centerY + Math.sin(angle) * radius;
      
      // 速度朝向拳心
      const speed = 1.8 * this.config.speedMultiplier;
      const vx = -Math.cos(angle) * speed;
      const vy = -Math.sin(angle) * speed;
      
      const baseSize = this.themeSizes[this.themeName] || 4.0;
      const size = (0.4 + Math.random() * 0.8) * baseSize;
      const color = this._getRandomThemeColor();
      const shape = this._getThemeShape();
      const life = 25 + Math.random() * 15;
      
      this.particles.push(
        new Particle(px, py, vx, vy, size, color, shape, life, false)
      );
    }
  }

  // 双指尖之间拉出实时折线高压电弧
  drawLightningArc(p1, p2) {
    const ctx = this.ctx;
    
    // 根据当前激活的主题，动态匹配电弧的基础色调
    let baseColor = 'rgba(0, 240, 255, 0.85)'; // 霓虹青
    if (this.themeName === 'fire') baseColor = 'rgba(255, 120, 0, 0.85)'; // 烈焰橙
    else if (this.themeName === 'aurora') baseColor = 'rgba(0, 255, 150, 0.85)'; // 极光绿
    else if (this.themeName === 'void') baseColor = 'rgba(140, 50, 255, 0.85)'; // 虚空紫

    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.hypot(dx, dy);
    
    if (dist === 0) return;
    
    // 依据距离决定折线段数量
    const segments = Math.max(6, Math.floor(dist / 22));
    const displacement = Math.min(22, dist * 0.08); // 最大锯齿振幅
    
    // 计算法向量
    const nx = -dy / dist;
    const ny = dx / dist;
    
    // 生成折点位置
    const points = [{ x: p1.x, y: p1.y }];
    for (let i = 1; i < segments; i++) {
      const t = i / segments;
      let px = p1.x + dx * t;
      let py = p1.y + dy * t;
      
      // 使用正弦信封线包络，保证电弧两端精准吸附在指尖上，中间抖动幅度最大
      const envelope = Math.sin(t * Math.PI);
      const offset = (Math.random() - 0.5) * displacement * 2 * envelope;
      
      px += nx * offset;
      py += ny * offset;
      
      points.push({ x: px, y: py });
    }
    points.push({ x: p2.x, y: p2.y });
    
    // 渲染电弧：双层发光渲染（底层霓虹粗光晕，顶层纯白超细高亮线核）
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    
    // 1. 底层粗光晕
    ctx.strokeStyle = baseColor;
    ctx.shadowBlur = 15;
    ctx.shadowColor = baseColor;
    ctx.lineWidth = 3.5 + Math.random() * 2.0; // 产生频率闪烁感
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    
    // 2. 顶层白色核心
    ctx.strokeStyle = '#ffffff';
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
    
    // 在电弧路径上低概率溅射出飞散的小火星
    if (Math.random() < 0.16) {
      const randT = Math.random();
      const ptIdx = Math.floor(randT * (points.length - 1));
      const pt = points[ptIdx];
      
      for (let j = 0; j < 3; j++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 0.8 + Math.random() * 2.2;
        const vx = Math.cos(angle) * speed + dx * 0.005;
        const vy = Math.sin(angle) * speed + dy * 0.005;
        
        const baseSize = this.themeSizes[this.themeName] || 4.0;
        const size = (0.35 + Math.random() * 0.55) * baseSize;
        const sparkColor = Math.random() < 0.4 ? '#ffffff' : baseColor;
        const shape = 'streak-spark';
        const life = 18 + Math.random() * 18;
        
        this.particles.push(
          new Particle(pt.x, pt.y, vx, vy, size, sparkColor, shape, life, false)
        );
      }
    }
  }

  // 双手靠近时触发超新星碰撞大爆炸
  triggerSupernova(x, y) {
    // 1. 释放三层扩张速率和颜色各异的同心圆激波环
    // 核心金色金粉冲击环
    this.shockwaves.push({
      x, y, radius: 10, maxRadius: 360, alpha: 1.0, speed: 7.5,
      color: 'rgba(255, 200, 0, 0.95)', thickness: 7
    });
    // 霓虹青辅助激波环
    this.shockwaves.push({
      x, y, radius: 5, maxRadius: 290, alpha: 1.0, speed: 5.5,
      color: 'rgba(0, 240, 255, 0.85)', thickness: 4
    });
    // 霓虹粉外围弱激波环
    this.shockwaves.push({
      x, y, radius: 20, maxRadius: 420, alpha: 1.0, speed: 9.5,
      color: 'rgba(255, 0, 127, 0.70)', thickness: 3
    });

    // 2. 对当前场上存活的所有粒子施加猛烈向外的“推飞力场”
    this.particles.forEach(p => {
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0 && dist < 500) {
        // 力度与距离平方根成反比，越近被炸飞越快
        const pushForce = ((500 - dist) / (dist + 30)) * 28.0;
        p.vx += (dx / dist) * pushForce;
        p.vy += (dy / dist) * pushForce;
      }
    });

    // 3. 在爆炸中心爆发出 320 颗向四周急速辐射消散的超新星金粉粒子
    const explosionColors = [
      'rgba(255, 215, 0, 0.95)', // 纯金
      'rgba(255, 255, 255, 0.95)', // 白热
      'rgba(0, 240, 255, 0.85)', // 青电
      'rgba(255, 0, 127, 0.85)'  // 玫红
    ];
    
    for (let i = 0; i < 320; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 11.5;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;

      const baseSize = this.themeSizes[this.themeName] || 4.0;
      const size = (0.5 + Math.random() * 2.2) * baseSize;
      const color = explosionColors[Math.floor(Math.random() * explosionColors.length)];
      const shape = Math.random() < 0.35 ? 'streak-spark' : 'circle';
      const life = 70 + Math.random() * 60;

      this.particles.push(
        new Particle(x, y, vx, vy, size, color, shape, life, true)
      );
    }
  }

  // 更新所有粒子状态
  update(emitterX, emitterY) {
    const activeConfig = this.config;
    
    // 更新电磁震荡冲击激波环
    if (this.shockwaves) {
      for (let i = this.shockwaves.length - 1; i >= 0; i--) {
        const s = this.shockwaves[i];
        s.radius += s.speed;
        s.alpha -= 0.013; // 衰减寿命
        if (s.alpha <= 0 || s.radius >= s.maxRadius) {
          this.shockwaves.splice(i, 1);
        }
      }
    }

    // 倒序循环，便于在数组中直接剔除死亡的粒子
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.update(activeConfig, emitterX, emitterY, this);
      
      // 剔除超出生命周期或透明度为零的粒子
      if (p.age >= p.maxLife || p.alpha <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  // 绘制渲染画布上的所有粒子，并合成摄像头画面以供视频录制
  draw(videoElement, cameraOpacity = 40) {
    const width = this.canvas.width / (window.devicePixelRatio || 1);
    const height = this.canvas.height / (window.devicePixelRatio || 1);
    
    // 1. 合成背景：如果是显示模式且视频准备就绪，将视频帧镜像绘制到 Canvas 底层
    if (videoElement && cameraOpacity > 0 && videoElement.readyState >= 2) {
      this.ctx.save();
      this.ctx.translate(width, 0);
      this.ctx.scale(-1, 1); // 水平镜像
      this.ctx.drawImage(videoElement, 0, 0, width, height);
      this.ctx.restore();

      // 叠加暗色半透明滤镜，还原原来 CSS 调暗层的沉浸感
      const dimOpacity = 1 - (cameraOpacity / 100);
      this.ctx.fillStyle = `rgba(10, 11, 16, ${dimOpacity})`;
      this.ctx.fillRect(0, 0, width, height);
    } else {
      // 如果视频隐藏，填充纯暗背景色
      this.ctx.fillStyle = '#0a0b10';
      this.ctx.fillRect(0, 0, width, height);
    }
    
    // 首先绘制底层的冲击波环（防止遮挡粒子发光核心）
    if (this.shockwaves) {
      for (let i = 0; i < this.shockwaves.length; i++) {
        const s = this.shockwaves[i];
        this.ctx.save();
        this.ctx.globalAlpha = s.alpha;
        this.ctx.strokeStyle = s.color;
        // 激波圆环随半径变大而变细
        this.ctx.lineWidth = s.thickness * (1 - s.radius / s.maxRadius) * 1.5 + 1;
        this.ctx.shadowBlur = 22;
        this.ctx.shadowColor = s.color;
        this.ctx.beginPath();
        this.ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    // 关键性能优化：使用 'lighter' (即 Screen 颜色融合模式)，多层重叠粒子会自动叠加发光
    this.ctx.globalCompositeOperation = 'lighter';
    
    for (let i = 0; i < this.particles.length; i++) {
      // 传入 this (即当前 system 实例) 以便获取精灵贴图缓存
      this.particles[i].draw(this.ctx, this);
    }
    
    // 恢复为默认图像绘制模式，保证控制面板及其他渲染不受影响
    this.ctx.globalCompositeOperation = 'source-over';
  }

  // JIT (即时编译缓存) 软发光粒子精灵发生器
  getSprite(color) {
    if (!this.sprites) this.sprites = {};
    if (!this.sprites[color]) {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
      
      if (color.includes('80, 80, 80')) {
        // 灰色膨胀烟尘：不带亮核，边缘极其柔和扩散，模拟飘逸灰烬
        grad.addColorStop(0, color);
        grad.addColorStop(0.3, color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,0.15)'));
      } else if (color.includes('255, 220, 50') || color.includes('255, 255, 255')) {
        // 白热火核 / 白亮星尘：中心为纯白热核，带极小偏振外圈
        grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
        grad.addColorStop(0.2, color);
      } else {
        // 彩色渐变气团：中心为不透明饱和色，外圈为半透明发光色彩，最终以二次方曲线淡出
        const solidColor = color.replace(/rgba\(([^,]+),([^,]+),([^,]+),[^)]+\)/, 'rgba($1,$2,$3,1.0)');
        grad.addColorStop(0, solidColor);
        grad.addColorStop(0.22, color);
      }
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(32, 32, 32, 0, Math.PI * 2);
      ctx.fill();
      this.sprites[color] = canvas;
    }
    return this.sprites[color];
  }

  // 清空所有粒子
  clear() {
    this.particles = [];
    this.sprites = {}; // 顺便清空精灵缓存
  }
}
