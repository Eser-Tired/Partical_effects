/**
 * AetherFlow - Photorealistic Particle Theme Configurations
 * 仿真版配置：定义符合真实物理现象的火焰燃烧、膨胀烟雾、重力反弹火花以及引力切变轨道
 */

export const themes = {
  // 1. 烈焰风暴 (Fire Storm) - 真实燃烧与膨胀烟雾
  fire: {
    name: '烈焰风暴',
    colors: [
      'rgba(255, 60, 0, 0.75)',    // 炽热红
      'rgba(255, 120, 0, 0.85)',   // 橙黄
      'rgba(255, 220, 50, 0.90)',   // 白炽黄 (火核)
      'rgba(80, 80, 80, 0.35)'      // 膨胀后的灰色烟尘
    ],
    particleShape: 'fire-particle', // 包含火花与烟雾的混合形态
    gravityY: -0.22,                // 热气上升流
    gravityX: -0.02,                // 微风拂动
    friction: 0.975,
    speedMultiplier: 2.2,
    maxLife: 90,
    burstCount: 240,
    attractionForce: 0.12,
    
    // 火焰的流体模拟与烟雾演化
    updateModifier: (particle) => {
      // 随着年龄增长，粒子抖动加剧
      particle.vx += (Math.random() - 0.5) * 0.35;
      
      // 模拟“烟雾演化”：如果粒子属于较暗色（如灰色烟尘），生命后期会急剧膨胀并慢速飘动
      if (particle.color.includes('80, 80, 80')) {
        particle.size += 0.18; // 烟雾散开膨胀
        particle.vy *= 0.96;   // 烟雾阻尼更大，上升变缓
      }
    }
  },

  // 2. 极光魔幻 (Aurora Magic) - 丝绸流体与星尘
  aurora: {
    name: '极光魔幻',
    colors: [
      'rgba(0, 255, 150, 0.50)',   // 稀薄的极光绿
      'rgba(0, 180, 255, 0.45)',   // 极光青蓝
      'rgba(140, 50, 255, 0.40)',  // 极光紫
      'rgba(255, 255, 255, 0.85)'  // 亮白星尘
    ],
    particleShape: 'aurora-cloud',  // 极薄的气体云颗粒
    gravityY: -0.01,                // 几乎悬浮
    gravityX: 0.04,                 // 稳定的层流风
    friction: 0.99,                 // 几乎无阻力，极其顺滑
    speedMultiplier: 1.2,
    maxLife: 160,                   // 极长的生命周期，拉出持久云带
    burstCount: 160,
    attractionForce: 0.08,
    
    updateModifier: (particle) => {
      // 使用平滑正弦波模拟流体波浪
      const wave = Math.sin(particle.age * 0.02) * 0.16;
      particle.vy += wave;
      
      // 白星尘闪烁
      if (particle.color.includes('255, 255, 255')) {
        particle.alpha = Math.max(0, Math.sin(particle.age * 0.15));
      }
    }
  },

  // 3. 霓虹赛博 (Rebranded: 金属火花与物理碰撞)
  cyber: {
    name: '霓虹火花',
    colors: [
      'rgba(255, 100, 0, 0.95)',   // 炽热钢花
      'rgba(255, 180, 50, 0.95)',  // 黄色火星
      'rgba(0, 240, 255, 0.95)',   // 蓝色电浆花
      'rgba(255, 255, 255, 0.98)'  // 白热核心
    ],
    particleShape: 'streak-spark',  // 带运动模糊的线状火花 (Speed Streak)
    gravityY: 0.28,                 // 真实重力下坠！
    gravityX: 0,
    friction: 0.992,                // 低阻力抛物线
    speedMultiplier: 3.2,
    maxLife: 70,
    burstCount: 220,
    attractionForce: 0.22,
    
    // 物理反弹碰撞检测
    updateModifier: (particle) => {
      const windowHeight = window.innerHeight;
      
      // 地面碰撞检测：当粒子掉落到屏幕最下方时发生弹性反弹并损失动能
      if (particle.y >= windowHeight - 10 && particle.vy > 0) {
        particle.y = windowHeight - 10;
        particle.vy = -particle.vy * 0.45; // 垂直速度反弹并减速
        particle.vx *= 0.75;                // 摩擦力损失水平速度
        
        // 碰撞时火花随机溅射微小偏移
        particle.vx += (Math.random() - 0.5) * 2.0;
      }
    }
  },

  // 4. 虚空引力 (Void Gravity) - 真实吸积盘与开普勒轨道
  void: {
    name: '虚空引力',
    colors: [
      'rgba(140, 40, 255, 0.65)',  // 虚空深紫气团
      'rgba(30, 80, 255, 0.55)',   // 暗星蓝
      'rgba(0, 240, 255, 0.70)',   // 强引力边缘青蓝
      'rgba(10, 10, 20, 0.40)'     // 视界边缘暗影
    ],
    particleShape: 'cosmic-dust',
    gravityY: 0,
    gravityX: 0,
    friction: 0.995,                // 极低空气阻力
    speedMultiplier: 1.8,
    maxLife: 130,
    burstCount: 280,
    attractionForce: 0.35,
    
    // 真实天体物理模拟：开普勒轨道切变与黑洞视界吞噬
    updateModifier: (particle, emitterX, emitterY, system) => {
      if (emitterX !== undefined && emitterY !== undefined) {
        const dx = emitterX - particle.x;
        const dy = emitterY - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist > 500) return; // 超出引力范围不模拟
        
        if (dist > 8) {
          // 开普勒引力常数受 system.voidGravityMultiplier 调控
          const multiplier = system ? system.voidGravityMultiplier : 1.0;
          const G = 150.0 * multiplier; // 引力常数
          const gravityStrength = (G / (dist * dist + 100)) * 2.5;
          particle.vx += (dx / dist) * gravityStrength;
          particle.vy += (dy / dist) * gravityStrength;
          
          // 轨道自转速度：引力越强旋转自转速度也随之平方根级加快 (v_orbit ∝ sqrt(M))
          const orbitSpeed = Math.sqrt(8.0 / dist) * 0.75 * Math.sqrt(Math.max(0.01, multiplier));
          // 切线方向向量
          const tx = -dy / dist;
          const ty = dx / dist;
          
          particle.vx += tx * orbitSpeed;
          particle.vy += ty * orbitSpeed;
        } else {
          // 视界吞噬：距离过近时粒子透明度瞬间归零（被黑洞吞没）
          particle.alpha = 0;
          particle.age = particle.maxLife; // 强制销毁
        }
      }
    }
  }
};
