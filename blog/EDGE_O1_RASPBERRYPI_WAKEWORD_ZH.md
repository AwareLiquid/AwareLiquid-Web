# 树莓派跑唤醒词:5,120 字节状态,1.27MB int8 模型

> 知乎 / 掘金 / CSDN 技术长文(A4)· 2026-08-28
> 配套教程:`github.com/AwareLiquid/O1-Sound/docs/RASPBERRY_PI.md`

---

## TL;DR

把一个**1.27 MB(int8)的唤醒词模型**放到树莓派上,麦克风永远开着,喊 "hello" 就触发。模型携带状态**恒定 5,120 字节**——麦克风开 1 小时还是 1 天,内存一位不变。

这是 O1-Sound:基于液态核心(O-Series)的常开唤醒词检测器,整条管线 ONNX Runtime 就能跑,**不需要 PyTorch**。

## 为什么"恒定状态"对唤醒词是刚需

唤醒词检测的本质:**麦克风永不关闭**。这意味着:

- **Transformer 式窗口** → 窗口越长,内存越大,永远开着的麦克风是灾难
- **LSTM/GRU** → 状态恒定✅,但丢样/不规则采样下劣化(见 A2 文:+31~33%)
- **液态核心** → 状态恒定 **5,120 字节** + 连续时间结构(可学习 τ,10–240 ms 几何分布)

关键性质(已测,非推断):

```
mic (16 kHz) → log-mel (40 dims) → 液态核心 step() → wake / not-wake
                                    ↑ 携带状态: 5,120 B,恒定
```

- 短 τ 通道跟踪当前音素;长 τ 通道持有整段单词包络——这组时间尺度差异,把唤醒短语和发音相近的邻居分开,不需要堆深度。
- **`step()` 就是部署物**:ONNX 图是单帧 step——一帧进,logits + 下一状态出——不是固定长度窗口。常开设备跑这个可以跑一辈子。

## 诚实声明(研究原型,不是生产引擎)

O1-Sound 是**研究原型**,我们不会把它包装成生产级:

- **英文有可用信号**(FRR 0.146 @ FAR 0.046,Run 2),**多语言未验证**(Run 7 最差语言 FRR 1.000)。
- **不是生产唤醒词引擎**:生产部署的唤醒词是单位数 FRR,误接受率按小时算。这是演示和架构验证。
- **树莓派上延迟未实测**:桌面 CPU 是 ~0.5 ms/帧,ARM 会不同(大概率仍远低于实时 100 帧/s)。
- 触发词默认 "hello / hallo / hola / bonjour" 等,阈值 0.9(研究 checkpoint 调参)。

## 实测数字

| 指标 | 数值 |
|---|---|
| 模型大小 | fp32 5.03 MB / **int8 1.27 MB** |
| 携带状态 | **5,120 字节/流,恒定**(2×640 float,与流长无关) |
| ONNX 数值漂移 | max |onnx − torch| = **3.7e-09** |
| 测试 | 32 个测试全过(CI) |
| 英文实测 | FRR 0.146 @ FAR 0.046(301 个唤醒片段) |

## 树莓派上跑起来(30 分钟)

**硬件**:树莓派 3B+/4B/Zero 2 W + 任意 USB 麦克风。

```bash
# 1. 装依赖
sudo apt update && sudo apt install -y python3-venv portaudio19-dev
python3 -m venv ~/o1sound-venv && source ~/o1sound-venv/bin/activate

# 2. 拉代码 + ONNX 模型
git clone https://github.com/AwareLiquid/O1-Sound.git && cd O1-Sound
pip install -e . onnxruntime sounddevice
wget -O checkpoints/o1sound.onnx \
  https://github.com/AwareLiquid/O1-Sound/releases/download/research-2026-08-18/o1sound.onnx

# 3. 实时麦克风演示
python scripts/demo_stream.py --list-devices   # 找麦克风
python scripts/demo_stream.py --device 0       # 说 "hello" 试试
```

启动时你会看到:

```
[O1-Sound] 参数 1,298,064 · 携带状态 5,120 字节 · 常量
```

喊 "hello",看到 `⏰ WAKE #1 (p=0.932)`——**5,120 字节恒定状态,就是这个架构存在的原因。**

完整教程(含验证 ONNX 图的命令、常见坑、ARM 注意事项):[docs/RASPBERRY_PI.md](https://github.com/AwareLiquid/O1-Sound/blob/main/docs/RASPBERRY_PI.md)

## 为什么用 ONNX 而不是 PyTorch

- ONNX Runtime 对 ARM 有一流支持,树莓派上比装 PyTorch 轻一个量级。
- ONNX 图就是部署形态:`mel_frame + state_in → logits + state_out`,状态在调用方手里,每次回传。
- int8 量化一行代码:`quantize_dynamic(model, weight_type=QInt8)`,5.03 MB → 1.27 MB。

## 生态位:为什么这值得关注

唤醒词只是个例子。真正的问题:**在不能增长的硬件上跑永不停止的流**。

- 可穿戴:麦克风/传感器永远开着,状态必须恒定
- 车载/工业:数小时传感器流,内存不能随会话膨胀
- 电池管理:NASA 数据实测,80% 采样丢失下液态核心只劣化 +7.7%(LSTM +31.1%,见 A2)

O1-Sound 用 5,120 字节证明了这条路走得通——而且整个管线(训练→导出→int8→树莓派)全部开源可复现。

## 复现

```bash
# 训练(英文,MSWC 数据集)
python scripts/fetch_mswc.py --languages en --out data/mswc
python train.py --root data/mswc --epochs 20 --out checkpoints/o1sound.pt

# 导出 ONNX + int8 + 数值门
python export_onnx.py --ckpt checkpoints/o1sound.pt --out dist/o1sound.onnx --int8

# 树莓派部署
# github.com/AwareLiquid/O1-Sound/docs/RASPBERRY_PI.md
```

---

*作者:AwareLiquid(深圳三体暗源科技)。研究原型,欢迎复现与质疑——包括质疑我们的诚实边界。*
