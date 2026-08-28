# ONNX 导出实战:给自定义液态神经网络架构写部署管线

> 知乎 / 掘金 / CSDN 技术长文(A3)· 2026-08-28
> 全部来自实测:我们自己把 MT-LNN(液态核心,非标准 Transformer)导出成了 ONNX,并做了数值验证。

---

## 为什么写这篇

市面上 99% 的 ONNX 教程都在导出标准 Transformer(LLaMA/Qwen 全家桶都有现成转换器)。但如果你在做**自定义架构**——液态神经网络、RNN 变体、任何 PyTorch 里能跑但 llama.cpp 不认识的模型——教程就断了。

这篇文章是我们刚踩完的坑:一个带 Python 控制流、返回 dict、带递归状态的自定义模型,怎么变成可以在 onnxruntime 里跑、且数值可信的 ONNX。

## 场景:MT-LNN 液态核心

我们导出的模型是 MT-LNN(O1 系列):注意力自由、液态核心(LTC)、13 protofilament × 5 时间尺度、parallel-scan 递归。它的 `forward()` 长这样:

```python
def forward(self, input_ids, use_lnn_recurrence=False) -> dict:
    # 返回 dict,内部有 Python 控制流,线程递归状态 h_prev
    return {"logits": ..., "state": ...}
```

直接 `torch.onnx.export` 会失败。三个障碍:

1. **返回 dict** → ONNX 需要明确的张量输入/输出
2. **Python 控制流**(global coherence 的 seq-length 相关 reduction)→ tracer 无法确定图结构
3. **递归状态线程**(`h_prev` 跨步传递)→ 需要把状态暴露为显式输入输出

## 第一步:包一层,收窄接口

核心思路:**只导出你真正要部署的路径**。我们导出的是 logits 路径 + 关闭递归线程(训练并行模式,`use_lnn_recurrence=False`),这样 trace 出的图是"纯输入→输出":

```python
class LogitsOnly(nn.Module):
    def __init__(self, m):
        super().__init__()
        self.m = m
    def forward(self, input_ids):
        return self.m(input_ids, use_lnn_recurrence=False)["logits"]

wrapper = LogitsOnly(model).eval()
```

> 关键认知:部署不是把整个模型塞进 ONNX,而是**只把生产路径塞进去**。训练时的便利接口(dict、控制流、缓存对象)都不该出现在部署图里。

## 第二步:固定形状导出(trace 的诚实代价)

`torch.jit.trace` 会把序列长度烘焙进图(global coherence 做 seq-length 相关 reduction)。所以:

- **一个形状一个产物**:trace 在 (1, 64) 就只保证 (1, 64) 正确。生产时按你的实际输入形状导出。
- **dynamic_axes 尽力而为**:ONNX 的 dynamic_axes 对这个模型是"best-effort"——global coherence 的 reduction 可能让 sequence 轴实际固定。**别假设 dynamic 一定工作,导完必须测。**

## 第三步:踩坑实录(Windows 专属)

```
UnicodeEncodeError: 'charmap' codec can't encode character '\u2705'
```

torch.onnx 导出成功的 ✅ emoji 在 Windows cp1252 控制台打印时崩了。**这不是导出失败,是 print 失败**——导出进程在成功那一刻被编码错误打断。

解法:
```powershell
$env:PYTHONIOENCODING = "utf-8"
$env:PYTHONUTF8 = "1"
python export.py
```

> 教训:Windows 上跑任何会打印 emoji/中文的 PyTorch 脚本,先设 UTF-8 环境变量。这是最容易被误判成"导出失败"的坑。

## 第四步:数值验证(不验证=没导出)

导出成功 ≠ 数字正确。我们的验证协议:

```python
import numpy as np, onnxruntime as ort

torch.manual_seed(7)  # 固定输入,可复现
ids = torch.randint(0, vocab, (1, 64), dtype=torch.long)

with torch.no_grad():
    eager = wrapper(ids)  # PyTorch 输出

sess = ort.InferenceSession(onnx_path, providers=["CPUExecutionProvider"])
(onnx_out,) = sess.run(None, {"input_ids": ids.numpy()})

max_abs = float(np.abs(onnx_out - eager.numpy()).max())
token_agree = (onnx_out.argmax(-1) == eager.numpy().argmax(-1)).mean()
```

**我们的实测结果**:

| 指标 | 数值 |
|---|---|
| ONNX 文件大小 | 2.7 MB(128.6M 参数模型) |
| max abs diff(eager vs ONNX) | **1e-5** |
| max rel diff | **8.5e-7** |
| **argmax token 一致率** | **1.0000(100%)** |

> 为什么 argmax 一致率是关键指标:LLM 生成只关心 argmax token 是否一致。如果 argmax 100% 一致,ONNX 版生成的文本会和 PyTorch 版**逐 token 相同**。数值差异 1e-5 在 fp32 舍入范围内,完全可接受。

## 第五步:流式模型的 ONNX 姿势(step 接口)

对于流式模型(唤醒词、传感器、对话流),导出的是 **step()**——一帧进,logits + 下一状态出:

```python
# O1-Sound 的 StreamingStep:输入 mel 帧 + 当前状态,输出 logits + 新状态
def forward(self, mel_t, *state):
    logits, new_state = self.model.step(mel_t, list(state))
    return (logits, *new_state)
```

```python
# 部署侧:状态在调用方手里,每帧喂回去
state = [np.zeros((1, 640), dtype=np.float32) for _ in range(2)]
for frame in audio_stream:
    logits, *state = sess.run(None, {"mel_frame": frame, "state_in_0": state[0], "state_in_1": state[1]})
```

**状态不在图里,在调用方**——这就是"恒定状态"(5,120 字节)在部署层的含义:ONNX 图每次只处理一帧,状态由宿主持有并回传。

## 第六步:int8 量化

onnxruntime 的动态量化一行搞定:

```python
from onnxruntime.quantization import QuantType, quantize_dynamic
quantize_dynamic(str(out), str(q), weight_type=QuantType.QInt8)
```

O1-Sound 实测:fp32 5.03 MB → **int8 1.27 MB**,数值漂移在预算门内。树莓派这类 ARM 设备直接用 int8 版。

## 经验总结

| 坑 | 解法 |
|---|---|
| 模型返回 dict / 有控制流 | 包一层 LogitsOnly/StreamingStep,收窄到部署路径 |
| trace 烘焙序列长度 | 按实际生产形状导出;dynamic_axes 别假设有效 |
| Windows emoji 打印崩溃 | `PYTHONIOENCODING=utf-8` + `PYTHONUTF8=1` |
| 不知道导出对不对 | 固定 seed 输入,eager vs ONNX 对拍,argmax 一致率必须 100% |
| 流式模型 | 导 step() 不是 forward();状态在调用方 |
| 边缘设备体积 | onnxruntime dynamic int8,一行代码 |

**核心原则:ONNX 导出是一个"验证交付物",不是"格式转换"。** 不验 argmax、不测长序列、不查 int8 漂移,导出就等于没导出。我们把这一步做成了硬门——`export_onnx.py` 里数值漂移 ≥1e-4 或超体积预算就直接 FAIL,不让坏产物流出。

复现:

```bash
# 完整代码
# github.com/AwareLiquid/M1 (LLM: mt_lnn/export.py, export_onnx_for_netron.py)
# github.com/AwareLiquid/O1-Sound (唤醒词: export_onnx.py 带 int8 + 数值门)
```

---

*作者:AwareLiquid(深圳三体暗源科技)。本文的导出管线是我们的生产代码,欢迎复现。*
