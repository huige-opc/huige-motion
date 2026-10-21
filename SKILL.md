---
name: huige-motion
description: "Motion graphics, launch videos and explainers as editable code. A director picks the motion language for your product; you point at frames to change them. 动画、发布片、解说视频，指着画面改。"
---

# huige-motion — launcher

This repository is the huige-motion package. **The skill itself lives one level down:**

[`skills/huige-motion/SKILL.md`](skills/huige-motion/SKILL.md)

Read that file completely before doing anything else. It is the source of the workflow, references,
contract and commands; do not summarize or replace it with this launcher.

- `skill_dir` for the nested skill is `skills/huige-motion/` (the folder holding that `SKILL.md`),
  not this repository root.
- The CLI is `skills/huige-motion/bin/om`; it resolves the package root (`cli/`, `runtime/`,
  `templates/`, `fonts/`) through `pwd -P`, so it works from here.
- The nested skill's references, templates and `bin/` are all relative to that folder.
