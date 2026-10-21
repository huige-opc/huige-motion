# huige-motion

**用代码做动效片 / 发布片 / 解说视频，指着画面改。**

这是 MIT 许可的 huige-motion，由 huige-opc 维护。
一条片子就是一个 `index.html`（HTML + GSAP + Canvas/Three.js/SVG），由本机 Chrome 逐帧渲染；
不调用视频生成模型，画面和配乐都由代码和时间决定。

## 安装

```sh
npx skills add huige-opc/huige-motion
```

或克隆后把嵌套技能链到你的 agent 技能目录：

```sh
git clone https://github.com/huige-opc/huige-motion.git
ln -s "$PWD/huige-motion" ~/.claude/skills/huige-motion
```

技能本体是根目录的 `SKILL.md`；`bin/om` 会通过 `pwd -P` 找到仓库里的 CLI。

## 需要什么

- Node 22+
- Chrome / Chromium / Edge（截帧、检查、导出都用本机浏览器）
- FFmpeg（导出视频、合成配乐）
- 可选：`om samples build` 下载约 55 MB 的 CC0/CC-BY 真乐器采样
- 可选口播：系统音色，或 Kokoro / 你自己的录音

缺什么运行 `om doctor`。

## 快速开始

```sh
om new my-film                  # 起一个项目（默认 blank 模板）
om studio my-film               # 打开浏览器编辑器
om check my-film                # 渲染前检查
om render my-film               # 导出到 my-film/out/
```

常用命令：`om templates`、`om sound`、`om voice`、`om still`、`om qa`、`om export html`。
完整流程见 [SKILL.md](SKILL.md)。

## 里面有什么

- 10 个起步模板（发布会、财经图表、动态文字、白板、Vox 拼贴、3Blue1Brown、Kurzgesagt、口播包装……）
- 20 种运动语言、导演/节奏/颜色/声音方法
- 实时编辑器、画面评论、逐字口播对齐
- 本机 Chrome 渲染 + FFmpeg 编码
- `runtime/clip/lib/print.js`（网点/分版/叠印）与 `physical.js`（CIE/薄膜/普朗克取色）

## 许可

代码与文档：MIT，见 [LICENSE](LICENSE)。本项目基于 MIT 许可的上游项目修改，原始版权见 LICENSE。
随附的 GSAP、字体、huashu-art-motion 样片和豆子角色保留各自许可，见 [THIRD_PARTY.md](THIRD_PARTY.md)。
